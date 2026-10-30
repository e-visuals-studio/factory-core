# factory-core

Jedro Website Factory (glej `WEBSITE_FACTORY_PLAN.md`): pnpm monorepo s paketom `@e-visuals-studio/core` za Astro 7 + Tailwind 4.

```
packages/core   @e-visuals-studio/core – integracija, <BaseLayout>, <SEO>, JSON-LD, bloki, tokeni
playground      primer strani za lokalni preizkus (Mizarstvo Primer)
```

## Ukazi

Potrebuješ Node 22.23.4 (`nvm use`, glej `.nvmrc`; Astro 7.4 zahteva ≥ 22.23.4) in pnpm prek corepacka (`corepack enable`).

| Ukaz | Kaj naredi |
| --- | --- |
| `pnpm dev` | playground na http://localhost:4321 |
| `pnpm build` | core (tsc → `dist/`) + playground (`astro build`) |
| `pnpm check` | `tsc` v core, `astro check` v playgroundu |
| `pnpm check:tokens` | pade, če blok uporablja barve, arbitrary vrednosti ali Tailwind palete mimo tokenov |
| `pnpm test` | enotni testi core (`node --test`): shema briefa, register licenc, preview, `factory-check-todo` |
| `pnpm changeset` | zapiše spremembo za naslednjo izdajo (glej Distribucija) |
| `pnpm lighthouse` | Lighthouse CI (mobilno, 3 tekme) na `playground/dist`, pade pod 95 v katerikoli kategoriji; potrebuje Chromium (`CHROME_PATH`) |
| `pnpm lighthouse:umami` | build z Umami (lokalni stub skripte, lažen ID) + Lighthouse CI |
| `pnpm test:e2e` | Playwright testi analitike in privolitve: zgradi playground za `none`, `umami` in `ga4` (`playground/dist-e2e/`), zažene `astro preview` in preveri banner, Consent Mode, dogodke in preklic; Chromium iz `CHROME_PATH` ali `pnpm exec playwright install chromium` |

## CI

GitHub Actions, brez deploya (Cloudflare Pages pride v fazi 4). Vsi workflowi imajo `permissions: contents: read`, časovno omejitev in akcije pripete na commit SHA (verzija v komentarju); posodablja jih Dependabot (`.github/dependabot.yml`, tedensko, 3 dni zamika kot `minimumReleaseAge`).

**`.github/workflows/ci.yml`** (PR in push na `main`; nov tek na istem branchu prekliče starega):

| Job | Koraki |
| --- | --- |
| `build, testi, Lighthouse` | Node iz `.nvmrc`, pnpm prek corepacka, predpomnjen pnpm store, `pnpm install --frozen-lockfile`, `build`, `check`, `check:tokens`, `test`, `test:e2e`, `lighthouse` |
| `varnost (gitleaks, pnpm audit)` | gitleaks CLI (uradna izdaja, preverjen SHA-256) na celotni zgodovini; `pnpm audit --prod --audit-level high` (pade pri high/critical) |

Build teče s `SITE_ENV=production`: na PR-ju je `GITHUB_REF_NAME` npr. `5/merge`, kar bi bil preview (noindex) in Lighthouse SEO bi padel. Lighthouse in Playwright uporabljata Chrome s slike `ubuntu-24.04` (`CHROME_PATH=/usr/bin/google-chrome`).

**`.github/workflows/site.yml`** – reusable workflow za repozitorije strank: `install --frozen-lockfile`, `build`, `check`, `check:tokens`, `test`, `lighthouse`, na pushu v `main` še `check:todo` (preview build sme vsebovati TODO). Vhod `brief` nastavi `BRIEF` (`primer` v site-template, prazno pri strankah). Klic (pripet na commit taga):

```yaml
jobs:
  site:
    uses: e-visuals-studio/factory-core/.github/workflows/site.yml@<commit SHA> # vX.Y.Z
    permissions:
      contents: read
    with:
      brief: primer # samo v site-template
```

`concurrency` določi klicoči workflow; `site.yml` je nima, ker bi se z isto skupino teka medsebojno blokirala.

**Zaščita `main`** (ruleset v obeh repozitorijih): spremembe samo prek PR-ja z zelenimi checki iz CI, brez force pusha in brisanja. Pregled drugega človeka ni obvezen; admin ni izvzet.

## Uporaba v strani stranke

Nova stran nastane iz [`e-visuals-studio/site-template`](https://github.com/e-visuals-studio/site-template), ki vse nastavitve vzame iz `brief.yaml` (glej Brief spodaj). Ročna uporaba:

```js
// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';
import factory from '@e-visuals-studio/core/integration';

export default defineConfig({
  site: 'https://domena-stranke.si', // obvezno
  integrations: [
    factory({
      siteName: 'Ime stranke',
      og: { tagline: 'Slogan za privzeto OG sliko' },
      fonts: { body: { name: 'Inter', provider: fontProviders.fontsource(), weights: [400, 700], styles: ['normal'], subsets: ['latin', 'latin-ext'] } },
      rss: { collection: 'blog', title: '…', description: '…' },
      analytics: { provider: 'umami', scriptUrl: process.env.UMAMI_SCRIPT_URL, websiteId: process.env.UMAMI_WEBSITE_ID },
    }),
  ],
});
```

Integracija:

- prebere `tokens.json` iz korena projekta (sicer `tokens.default.json` iz core), preveri kontrast parov `on-*` (≥ 4.5 : 1) in zgradi Tailwind temo; privzete Tailwind palete so izklopljene, zato obstajajo samo razredi iz tokenov (`bg-primary`, `text-on-surface-muted`, `max-w-measure`, `py-section`, `duration-base`, `ease-standard` …)
- doda Tailwind 4, `@astrojs/sitemap` (s hreflang, če je vklopljen `i18n`), `/robots.txt` in `/rss.xml`
- fonte self-hosta prek Astro Fonts API; preload samo za `body`, podmnožica `latin`
- generira OG slike (1200×630 PNG v barvah tokenov, satori + sharp): `/og/default.png` za strani brez slike in `/og/<kolekcija>/<id>.png` za poste brez slike (`ogImage('blog', post.id)`)
- CSS vstavi inline (kritični CSS), če `build.inlineStylesheets` ni nastavljen
- obdrži presledke med inline elementi kot v Astro 6 (`compressHTML: true`), če `compressHTML` ni nastavljen; privzeti `'jsx'` iz Astro 7 bi zlepil besede (»Telefon:« + povezava v novi vrstici)
- privzeti sharp image service zamenja z `@e-visuals-studio/core/image-service`, ki zavrne **vhodne** slike HEIF družine (AVIF, HEIC) po vsebini datoteke, ne po končnici (libheif, GHSA-26w7-cxv4-gfx2); AVIF ostane izhodni format (`<Image format="avif">`). Lasten image service projekta ostane, a build izpiše opozorilo, da varovalo ni aktivno.

## Preview in produkcija

`factory()` sam ugotovi, ali je build preview (`factory({ preview })` to prepiše):

1. `SITE_ENV=preview|production` ima prednost,
2. sicer branch iz `CF_PAGES_BRANCH` ali `GITHUB_REF_NAME` (GitHub Actions): vse razen `main` je preview,
3. sicer produkcija (lokalni build).

Preview: `robots.txt` z `Disallow: /`, `<meta name="robots" content="noindex, nofollow">` na vseh straneh in brez analitike. Za Lighthouse in e2e na CI zato nastavi `SITE_ENV=production` (sicer SEO ocena pade zaradi noindex).

## Brief (`@e-visuals-studio/core/brief`)

Edini vir podatkov o stranki v `site-template` in repih strank. Zod shema `briefSchema`: vsak ključ je obvezen, vrednost je veljavna **ali** izrecen `TODO…`; prazno ali manjkajoče ustavi build s potjo do polja. Besedila so `{ sl, en }`, `en` je obvezen, če je v `jeziki`.

```js
import { loadBrief, siteUrl, analyticsFromBrief } from '@e-visuals-studio/core/brief';
const { brief, todos } = await loadBrief('brief.yaml'); // + preveri slike v assets.licenses.yaml
```

- `loadBrief()` preveri, da vsaka slika iz briefa (`slike.*`, `reference[].slika`) obstaja in ima v `assets.licenses.yaml` zapis z `avtor`, `vir`, `licenca` (polje `datoteka` je pot ali vzorec `*`/`**`); sicer build pade
- pretvorbe: `t()`, `paragraphs()`, `siteUrl()` (TODO → `https://todo-domena.invalid`), `postalAddress()`, `telHref()`, `openingHours()` (schema.org), `openingHoursText()` (sl/en), `companyInfo()`, `localBusinessFromBrief()`, `analyticsFromBrief()` (ID iz `ANALYTICS_ID`)

## CLI orodja (bin paketa)

| Ukaz | Kaj naredi |
| --- | --- |
| `factory-check-tokens [mapa …]` | pravilo »samo tokeni« (privzeto `./src`) |
| `factory-check-todo [dist] [datoteka …]` | pade, če `dist` ali naštete datoteke (`brief.yaml`, `assets.licenses.yaml`) vsebujejo `TODO`; preview build (`robots.txt` z `Disallow: /`) preskoči |
| `factory-placeholders [--tokens f] [--out mapa] [ime:ŠxV …]` | placeholder slike iz barv tokenov (nikoli slike s spleta) |
| `factory-tokens [tokens.json] [--out theme.css]` | tema iz tokenov in preverjanje kontrasta |

## Distribucija

**Zdaj: git tag.** Stran stranke namesti core neposredno iz tega (javnega) repozitorija:

```json
"@e-visuals-studio/core": "github:e-visuals-studio/factory-core#v0.2.0&path:packages/core"
```

pnpm ob namestitvi požene `prepare` (`tsc` → `dist/`). Ker pnpm 10 build skripte odvisnosti privzeto blokira, mora `pnpm-workspace.yaml` stranke dovoliti točno to referenco s commitom taga (ime paketa samo ne zadošča; pnpm ob napaki izpiše točen zapis):

```yaml
onlyBuiltDependencies:
  - "@e-visuals-studio/core@https://codeload.github.com/e-visuals-studio/factory-core/tar.gz/<commit>#path:packages/core"
```

V `site-template` oboje posodobi `pnpm core:update vX.Y.Z`.

**Izdaja nove verzije**

1. Vsak PR s spremembo core doda changeset (`pnpm changeset`, MIT orodje [changesets](https://github.com/changesets/changesets)).
2. Ob izdaji: `pnpm changeset version` (dvigne verzijo, zapiše `packages/core/CHANGELOG.md`) → PR → merge.
3. Tag na `main`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Strani strank: `pnpm core:update vX.Y.Z` (kasneje Renovate).

**Kasneje: javni npm s trusted publishing** (ko bo npm račun urejen)

1. Na npmjs.com ustvari organizacijo `e-visuals-studio`; prvo objavo naredi ročno (`npm publish --access public` v `packages/core`), da paket obstaja.
2. Na paketu → Settings → Trusted Publisher: GitHub Actions, repo `e-visuals-studio/factory-core`, workflow `release.yml`. Nato v nastavitvah paketa izklopi objavo z žetoni.
3. Workflow `.github/workflows/release.yml` (ob pushu na `main`): `permissions: { contents: write, pull-requests: write, id-token: write }`, Node ≥ 22.14 z npm ≥ 11.5, `changesets/action` z `publish: pnpm changeset publish` – odpre release PR ali ob mergu objavi z OIDC (provenance samodejno, brez `NPM_TOKEN`) in ustvari tag.
4. V repih strank: `"@e-visuals-studio/core": "^X.Y.Z"` namesto git reference; vrstica v `onlyBuiltDependencies` odpade (npm paket ima zgrajen `dist`, `prepare` se ne izvaja). Renovate nato odpira PR-je ob vsaki izdaji.

## Analitika

`factory({ analytics })`, privzeto `{ provider: 'none' }` (0 B JavaScripta). Skripte se naložijo samo v `astro build`, nikoli v `astro dev`.

| Ponudnik | Nastavitve | Piškotki / banner | JS na stran |
| --- | --- | --- | --- |
| `umami` (privzeta izbira) | `scriptUrl`, `websiteId` (UUID) | ne | skripta ponudnika (`defer`) + ~0,5 KB gzip inline |
| `plausible` | `scriptUrl`, `domain` | ne | skripta ponudnika (`defer`) + ~0,5 KB gzip inline |
| `ga4` (samo izjema, `EXCEPTIONS.md`) | `measurementId` (`G-…`), `privacyHref` (niz ali `{ sl, en }`) | da: vanilla-cookieconsent, SL/EN | ~11 KB gzip; gtag.js šele po privolitvi |

GA4 uporablja Google Consent Mode v2 (osnovni način): v `<head>` se nastavi privzeto `denied`, gtag.js se naloži šele po privolitvi v kategorijo `analytics`, ob preklicu se izbrišejo piškotki `_ga*`. `<Footer>` pri GA4 doda gumb »Nastavitve piškotkov« / »Cookie settings«, ki znova odpre nastavitve. Banner je stiliran s tokeni (`analytics/consent.css`).

**Dogodki** (enak API za vse ponudnike):

- `tel:` in `mailto:` povezave → samodejno `generate_lead` z `method: 'phone' | 'email'` (tudi v CMS vsebini)
- `<form data-track="generate_lead">` → `generate_lead` z `method: 'form'` ob uspešni oddaji (HTML validacija)
- poljuben element: `data-track="ime_dogodka"` + lastnosti `data-track-<ime>="…"` (v snake_case, npr. `data-track-form-id` → `form_id`)
- iz kode (island): `window.factoryTrack?.('ime_dogodka', { … })`

Playground bere ponudnika iz okolja (`ANALYTICS_PROVIDER`, glej `playground/.env.example`); pravih ID-jev v repozitoriju ni.

**E2E testi** (`e2e/`, `pnpm test:e2e`) tečejo brez pravih ID-jev in brez omrežja: vsaka zahteva izven `localhost` se zabeleži in prestreže (Umami skripta in `gtag.js` dobita stub, vse ostalo je prekinjeno), zato test tudi preveri, da pred privolitvijo ni nobene zahteve na Google.

Strani:

```astro
---
import BaseLayout from '@e-visuals-studio/core/layouts/BaseLayout.astro';
import Hero from '@e-visuals-studio/core/blocks/Hero.astro';
import { graph, website, localBusiness } from '@e-visuals-studio/core';
---
<BaseLayout title="…" description="…" siteName="…" jsonLd={graph(website({…}), localBusiness({…}))}>
  <Hero title="…" image={{ src: hero, alt: '…' }} />
</BaseLayout>
```

Bloki: `Header`, `Hero`, `Features`, `About`, `Gallery`, `CTA`, `FAQ` (+ FAQPage JSON-LD), `Contact`, `BlogList`, `Footer`; 0 KB JavaScripta.
JSON-LD helperji: `organization`, `localBusiness`, `website`, `article`, `breadcrumbList`, `faqPage`, `graph`.
Content: `blogSchema` (neobvezna slika; če obstaja, so `alt`, `avtor`, `vir`, `licenca` obvezni, `ai` privzeto `false`), `licensedImageSchema` (zavrne `.avif`/`.heic` z navodilom za pretvorbo v JPG, PNG ali WebP), `slugify()` (šumniki → s, c, z).

Tokeni: DTCG format (`$value`/`$type`, izvoz Figma Variables / Tokens Studio), reference `{color.primary}`.
Samostojno: `npx factory-tokens tokens.json --out theme.css`.
