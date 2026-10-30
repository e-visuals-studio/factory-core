# @e-visuals-studio/core

## 0.3.1

### Patch Changes

- dbaf420: `site.yml`: `deploy (preview)` pred prvim produkcijskim deployem (Worker še ne obstaja) preskoči z obvestilom tudi ob sporočilu wranglerja 4.153 »You cannot upload a new version of a Worker that does not yet exist« (prej napaka).

## 0.3.0

### Minor Changes

- dec9ea6: Deploy na Cloudflare Workers static assets (faza 4a).
  
  - **`site.yml`**: joba `deploy (preview)` (PR iz istega repozitorija: `wrangler versions upload --preview-alias pr-<št.>`, komentar na PR s povezavo, ki se posodablja) in `deploy (produkcija)` (push na `main`: `wrangler deploy` in smoke test). Oba čakata na zelen job `site`. Novi neobvezni vhodi `worker-name` (brez njega ni deploya), `cloudflare-account-id`, `site-url`, `noindex` in secret `CLOUDFLARE_API_TOKEN`. **Klicoči job mora dati `pull-requests: write`** (komentar s preview povezavo), sicer GitHub workflowa ne zažene.
  - **`_headers`**: `factory()` ob buildu zapiše `dist/_headers` (na konec morebitnega `public/_headers`) z `X-Robots-Tag: noindex` za `*.workers.dev` (preview URL-ji in produkcijski alias); pri noindex buildu še za vse strani.
  - **`SITE_NOINDEX=true`**: produkcijski build z meta noindex in `X-Robots-Tag`, `robots.txt` ostane odprt. `FactoryRuntimeConfig.robots` ima novo polje `blockCrawl` (robots.txt `Disallow: /`), `noindex` pomeni meta in glavo.

## 0.2.1

### Patch Changes

- 200b9c2: Reusable workflow `site.yml` za repozitorije strank (`.github/workflows/site.yml`): install, build, check, check:tokens, test in Lighthouse, na pushu v `main` še check:todo; brez deploya. Repozitorij stranke ga kliče na istem tagu kot paket (`uses: e-visuals-studio/factory-core/.github/workflows/site.yml@vX.Y.Z`), `pnpm core:update` posodobi oboje.

## 0.2.0

### Minor Changes

- b503c7f: Astro 7 in zavrnitev vhodnih slik HEIF/AVIF (varnost).
  
  - **Astro 7** (`peerDependencies.astro` `^7.2.8`) in **sharp 0.35.5**: odpravi GHSA-26w7-cxv4-gfx2 (RCE prek AVIF, za Astro 6.x ni popravka) in tri high ranljivosti v sharp/libvips/libheif/librsvg. Strani strank morajo nadgraditi `astro` na `^7.4.2`, `sharp` na `^0.35.5` in Node na **22.23.4** (`.nvmrc`, `engines`).
  - **Vhodne slike HEIF družine (AVIF, HEIC) niso več dovoljene.** Zavrnejo jih shema briefa (`slike.*.datoteka`), `licensedImageSchema` (po končnici, z navodilom za pretvorbo) in nov `@e-visuals-studio/core/image-service`, ki ga `factory()` nastavi namesto privzetega sharpa in sliko preveri po vsebini, ne po končnici. AVIF ostane izhodni format optimizacije. Breaking: brief ali vsebina z `.avif` sliko ne gre več skozi build.
  - `factory()` ohrani presledke med inline elementi kot v Astro 6 (`compressHTML: true`, če ni nastavljeno), ker privzeti `'jsx'` iz Astro 7 zlepi besede.

## 0.1.0

Prva izdaja (faze 1–3 iz `WEBSITE_FACTORY_PLAN.md`). Distribucija iz git taga `v0.1.0`; naslednje izdaje zapiše `pnpm changeset version`.

### Faza 1 – skelet

- Integracija `factory()` za Astro 6 + Tailwind 4: tokeni (DTCG) → Tailwind tema s preverjanjem kontrasta `on-*` ≥ 4.5 : 1, sitemap s hreflang, `robots.txt`, RSS, samodejne OG slike (satori), self-hostani fonti, inline kritični CSS.
- `<BaseLayout>` in `<SEO>` (title, description, canonical, Open Graph, Twitter, hreflang, JSON-LD).
- JSON-LD helperji: `organization`, `localBusiness`, `website`, `article`, `breadcrumbList`, `faqPage`, `graph`.
- Bloki brez JavaScripta, stilirani samo s tokeni: `Header`, `Hero`, `Features`, `About`, `Gallery`, `CTA`, `FAQ`, `Contact`, `BlogList`, `Footer`.
- Content: `blogSchema`, `licensedImageSchema` (avtor, vir, licenca, `ai`), `slugify()`.

### Faza 2 – analitika in privolitev

- `factory({ analytics })`: Umami, Plausible (brez piškotkov, brez bannerja) ali GA4 kot izjema z Google Consent Mode v2 (privzeto `denied`) in bannerjem vanilla-cookieconsent (SL/EN); gtag.js šele po privolitvi. Skripte samo v produkcijskem buildu.
- Enoten API za dogodke: `data-track`, samodejno `generate_lead` za `tel:`, `mailto:` in obrazce, `window.factoryTrack()`.

### Faza 3 – brief, preview, orodja

- `@e-visuals-studio/core/brief`: zod shema za `brief.yaml` (vsak ključ obvezen, vrednost veljavna ali izrecen `TODO`), `loadBrief()` s preverjanjem slik v `assets.licenses.yaml`, pretvorbe za `factory()`, JSON-LD, delovni čas, pravne podatke in analitiko (`ANALYTICS_ID`).
- Preview build (`SITE_ENV`, sicer `GITHUB_REF_NAME`/`CF_PAGES_BRANCH` ≠ `main`): `robots.txt` `Disallow: /`, meta `noindex` na vseh straneh, brez analitike.
- CLI: `factory-check-todo`, `factory-check-tokens`, `factory-placeholders`, `factory-tokens`.
- Namestitev iz git taga (`prepare` zgradi `dist/`), licenca MIT, changesets.
