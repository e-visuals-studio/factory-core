# @e-visuals-studio/core

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
