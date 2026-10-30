# CLAUDE.md – factory-core

Jedro Website Factory. Celoten plan: `WEBSITE_FACTORY_PLAN.md` (preberi ga pred vsako fazo).
Struktura in ukazi: `README.md`. Node 22.23.4 (`nvm use`), pnpm prek corepacka.

## Pravila

**Design samo iz tokenov**
- Barve, fonti, velikosti, razmiki, radiji, sence in animacije pridejo samo iz `tokens.json` (razredi kot `bg-primary`, `text-on-surface-muted`, `py-section`, `max-w-measure`, `duration-base`, `ease-standard`).
- Nikoli hex/rgb/oklch vrednosti, Tailwind arbitrary vrednosti (`p-[13px]`), privzetih palet (`bg-blue-500`, `text-white`) ali inline `style`. Manjka vrednost? Dodaj token v `tokens.default.json` (in v `playground/tokens.json`), ne obidi ga.
- Pari `on-<ozadje>` morajo imeti kontrast ≥ 4.5 : 1; build sicer pade.

**Slike in avtorske pravice**
- Nikoli ne prenašaj slik s spleta in ne vstavljaj URL-jev tujih slik (tudi ne Unsplash/Pexels brez zapisa v registru).
- Med razvojem samo generirani placeholderji (`pnpm --filter playground placeholders`). Manjkajoča prava slika = placeholder + TODO.
- Vsaka slika ima zapis v `assets.licenses.yaml` (z `ai: true/false`); slike v content kolekcijah imajo obvezna polja `src`, `alt`, `avtor`, `vir`, `licenca` ter `ai` (privzeto `false`) – `licensedImageSchema`.
- AI slike (`ai: true`) samo kot ilustracija: nikoli ljudje, ekipa, objekt ali izdelek stranke, ne v referencah. Na strani so označene kot AI ilustracija.
- Post brez slike je v redu: OG slika se generira samodejno (`ogImage()`), ne išči slike drugje.
- Slike samo prek `<Image>` iz `astro:assets`; LCP slika s `priority`, ostale lazy.
- Vhodne slike samo JPG, PNG ali WebP. HEIF družina (AVIF, HEIC – iPhone fotografije) ni dovoljena kot vhod (libheif, GHSA-26w7-cxv4-gfx2): zavrnejo jo shema briefa, `licensedImageSchema` in image service iz core (po vsebini, ne po končnici). Ne obidi tega z lastnim image servisom ali preimenovanjem datoteke; sliko pretvori. AVIF je dovoljen samo kot izhodni format (`<Image format="avif">`).
- Faza 4 (CMS, še ni narejeno): Sveltia mora ob zavrnjeni HEIC/AVIF sliki pokazati jasno sporočilo v slovenščini (npr. v `hint` polja in pri zavrnitvi); preveri, ali jo lahko ob nalaganju v brskalniku pretvori v WebP/JPG (glej plan, Faza 4).

**Komponente in strani**
- Vsaka stran uporablja `<BaseLayout>` (ta vključi `<SEO>`): title, description (50–160 znakov), en `<h1>` na stran.
- Nove komponente najprej kot blok v `packages/core/src/blocks/`; stilirane samo s tokeni, brez JavaScripta (interaktivnost samo kot Astro island z razlogom).
- Nobenih izmišljenih podatkov o stranki (naslovi, telefoni, številke, reference) – manjkajoče označi s TODO.
- `src/fetch.ts` je v Astro 7 rezervirano ime (advanced routing); ne ustvarjaj datoteke s tem imenom.
- Astro 7 pod agentom `astro dev`/`astro preview` zažene v ozadju (preveri `astro dev status`, ustavi z `astro dev stop` / `astro preview stop`). Za strežnik v ospredju (testi, Playwright `webServer`) uporabi `--ignore-lock`.

**Analitika in piškotki**
- Analitika samo prek `factory({ analytics })`. Nikoli ročno vstavljenih sledilnih skript (GA, GTM, Meta pixel, Hotjar …) v strani ali bloke.
- Privzeto Umami ali Plausible (brez piškotkov, brez bannerja). GA4 samo, če ga stranka izrecno želi, z zapisom v `EXCEPTIONS.md`; deluje samo z bannerjem in Consent Mode v2 iz core.
- Dogodki samo prek `data-track` / `data-track-*` ali `window.factoryTrack()`; povpraševanje je vedno `generate_lead` z `method`.
- Nobenih pravih ID-jev (Umami, Plausible, GA4) v repozitoriju – samo okoljske spremenljivke; v primerih lažne vrednosti.
- Politika zasebnosti mora opisati izbrano analitiko (tudi Umami/Plausible).

**Jezik**
- Besedila na straneh, komentarji v kodi, commit sporočila in PR opisi so v slovenščini.

**Odprta koda**
- Nove odvisnosti samo z OSI licenco (MIT, Apache-2.0, BSD, ISC, MPL-2.0). Izjeme gredo v `EXCEPTIONS.md`.

## Pred commitom

```sh
pnpm build && pnpm check:tokens && pnpm test
```

Vse mora uspeti. Pri spremembah blokov, layouta ali fontov poženi še `pnpm check` in `pnpm lighthouse` (≥ 95 v vseh kategorijah, mobilno).
Sprememba v `packages/core` dobi changeset (`pnpm changeset`). Format briefa (`src/brief/`) spreminjaj samo združljivo ali z major verzijo – brief izpolnjujejo vse stranke.
Pri spremembah analitike, bannerja, `<Footer>` ali `<Contact>` še `pnpm test:e2e` in `pnpm lighthouse:umami`.

## CI in `main`

- `main` je zaščiten z rulesetom: vse gre prek PR-ja, ki ga združiš šele, ko sta zelena oba joba iz `.github/workflows/ci.yml` (build/testi/Lighthouse in varnost: gitleaks, `pnpm audit --prod` brez high/critical). Brez force pusha, brez obhoda checkov.
- CI teče s `SITE_ENV=production`; lokalno ga ponoviš z `SITE_ENV=production CHROME_PATH=… pnpm build && … pnpm lighthouse`.
- Akcije v workflowih samo pripete na commit SHA z verzijo v komentarju (`uses: owner/akcija@<sha> # vX.Y.Z`), `permissions: contents: read`, `timeout-minutes`. Nove akcije samo z OSI licenco; gitleaks kot CLI s preverjenim checksumom, ne `gitleaks-action` (licenca za organizacije).
- `site.yml` je API za vse repozitorije strank: spremembe vhodov samo združljive, sicer nova major verzija.
