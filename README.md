# factory-core

Jedro Website Factory (glej `WEBSITE_FACTORY_PLAN.md`): pnpm monorepo s paketom `@e-visuals-studio/core` za Astro 6 + Tailwind 4.

```
packages/core   @e-visuals-studio/core – integracija, <BaseLayout>, <SEO>, JSON-LD, bloki, tokeni
playground      primer strani za lokalni preizkus (Mizarstvo Primer)
```

## Ukazi

Potrebuješ Node ≥ 22.12 (`nvm use`) in pnpm prek corepacka (`corepack enable`).

| Ukaz | Kaj naredi |
| --- | --- |
| `pnpm dev` | playground na http://localhost:4321 |
| `pnpm build` | core (tsc → `dist/`) + playground (`astro build`) |
| `pnpm check` | `tsc` v core, `astro check` v playgroundu |
| `pnpm check:tokens` | pade, če blok uporablja barve, arbitrary vrednosti ali Tailwind palete mimo tokenov |
| `pnpm lighthouse` | Lighthouse CI (mobilno, 3 tekme) na `playground/dist`, pade pod 95 v katerikoli kategoriji; potrebuje Chromium (`CHROME_PATH`) |
| `pnpm lighthouse:umami` | build z Umami (lokalni stub skripte, lažen ID) + Lighthouse CI |

## Uporaba v strani stranke

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
Content: `blogSchema` (neobvezna slika; če obstaja, so `alt`, `avtor`, `vir`, `licenca` obvezni, `ai` privzeto `false`), `licensedImageSchema`, `slugify()` (šumniki → s, c, z).

Tokeni: DTCG format (`$value`/`$type`, izvoz Figma Variables / Tokens Studio), reference `{color.primary}`.
Samostojno: `npx factory-tokens tokens.json --out theme.css`.
