# Website Factory – plan in stack

Oct 29, 2026 · @Matic

## Cilj in koncept

Tovarna je en dober starter template na GitHubu, ki ga za vsako stranko kloniramo. AI agenti opravijo ponavljajoče se delo: design v kodo, SEO in kontrolo kakovosti. Vsake strani ne generiramo iz nič.

Vsaka stran mora imeti:

- statičen HTML brez baze in strežnika (hitro, varno, skoraj brez stroškov hostinga)
- vrhunski tehnični SEO in Lighthouse ≥ 95 v vseh kategorijah
- responsive design na mobilni, tablični in desktop širini
- EU-skladna analitika (privzeto Umami ali Plausible brez piškotkov, GA4 s cookie consentom na željo stranke)
- enostaven admin UI za bloge, novice in galerije
- custom design, ki ga priskrbi designer, brez spreminjanja jedra

Cilj procesa: nova stran od briefa do produkcije v 1–2 dneh.

## Arhitektura in stack

Stack je Astro 7 + Tailwind 4 + Sveltia CMS, gostovanje pa na Cloudflare Pages. Ob objavi novice CMS naredi commit v Git, ta sproži build in posodobljena stran je v CDN-ju v približno minuti.

| Plast | Izbira | Zakaj |
| --- | --- | --- |
| Framework | [Astro 7](https://docs.astro.build/en/guides/upgrade-to/v7/) | Privzeto 0 KB JS, content collections, `astro:assets` za slike; MIT, od januarja 2026 v lasti Cloudflare. Nadgrajeno s 6 na 7 oktobra 2026 zaradi GHSA-26w7-cxv4-gfx2 (RCE prek AVIF, za 6.x ni popravka) |
| Styling | Tailwind CSS 4 + design tokeni (`tokens.json`) | Design stranke = zamenjava tokenov in nekaj blokov |
| Admin UI | [Sveltia CMS](https://github.com/sveltia/sveltia-cms) na `/admin` | Git-based, brez baze, deluje na čisto statičnem buildu, sodoben naslednik Decap CMS |
| Prijava v CMS | GitHub OAuth prek majhnega Cloudflare Workerja (`sveltia-cms-auth`) | En Worker za vse stranke |
| Hosting | Cloudflare Pages | Odločeno: brezplačni plan (Pages, Workers 100.000 zahtev/dan, DNS, SSL, Tunnel). Build teče v GitHub Actions, Cloudflare dobi samo hotov rezultat, ker 500 buildov na mesec velja za cel račun. Plačljivo (Workers Paid 5 $/mesec) samo, če pošiljamo e-pošto prek Cloudflara |
| Obrazci | Cloudflare Worker + ALTCHA (Turnstile kot izjema) | Brez strežnika, zaščita pred spamom |
| Analitika | Umami ali Plausible (privzeto, brez piškotkov); GA4 + Consent Mode v2 na željo stranke | Glej razdelek SEO, GA in consent |
| CI | GitHub Actions | Build, Lighthouse CI, axe, link checker |

Alternativa za CMS je [Keystatic](https://keystatic.com) (lepši UI, potrebuje React + Markdoc). Kadar bi stranka potrebovala pravi backend (rezervacije, uporabniki), takrat dodamo Directus ali Payload; za bloge in novice to ni potrebno.

Proxmox v domačem labu je primeren za staging in preview, ne za produkcijo strank (odvisnost od domače linije in elektrike).

## Pravilo: najprej odprta koda

Vse, kar gre v kodo strank, je odprtokodno z OSI licenco. Storitve (hosting, DNS, e-pošta) so lahko komercialne, če imajo dokumentirano izhodno pot. Plačljivo ali zaprto orodje je izjema, ki jo zapišemo z razlogom.

1. **Knjižnice in orodja v kodi:** samo OSI licence (MIT, Apache-2.0, BSD, ISC, MPL-2.0). GPL/AGPL samo za orodja, ki jih poganjamo, ne za kodo, ki jo dobi stranka. CI preverja licence odvisnosti (`license-checker` z dovoljenim seznamom) in pade ob neznani licenci.
2. **Storitve:** komercialna storitev je dovoljena, če temelji na odprtih standardih, so podatki v EU ali je podpisan DPA, in če lahko stran premaknemo drugam brez prepisovanja kode. Statičen HTML in Workerji na standardnem `fetch` API-ju to omogočajo.
3. **Izjeme:** vsako zaprto ali plačljivo orodje gre v `EXCEPTIONS.md` z razlogom, odprtokodno alternativo in izhodno potjo.

**Kaj to spremeni v stacku**

| Področje | Prej | Zdaj (privzeto) | Izjema, kdaj |
| --- | --- | --- | --- |
| Animacije | GSAP | CSS + View Transitions, za zahtevnejše [Motion](https://motion.dev/) (MIT) | GSAP, ko design zahteva SplitText, MorphSVG ipd. |
| Analitika | GA4 + Consent Mode | Umami ali Plausible (odprta koda, brez piškotkov, brez cookie bannerja za analitiko) | GA4, če ga stranka izrecno želi |
| Zaščita obrazca | Cloudflare Turnstile | [ALTCHA](https://altcha.org/open-source-captcha/) (MIT, brez piškotkov, na našem Workerju) | Turnstile ob večjem spamu |
| Iskanje ranljivosti | CodeQL, GitHub secret scanning | Semgrep CE + gitleaks v CI | Na zasebnih repozitorijih sta GitHub funkciji plačljivi (Secret Protection 19 $, Code Security 30 $ na committerja na mesec) |
| Design | Figma | Figma ostane | Izjema: designerji delajo v njej; [Penpot](https://penpot.app/) (MPL) kot odprtokodna možnost, če jo designer uporablja |
| Hosting, DNS, e-pošta | Cloudflare | ostane | Izjema s pogojem: izhodna pot na drug CDN ali Proxmox je dokumentirana |
| Git | GitHub | ostane | Izjema: zrcaljenje na Forgejo (odprta koda) na Proxmoxu |
| AI | Claude Code | ostane | Izjema: glavno orodje tovarne |

Že odprtokodno in ostane: Astro, Tailwind, Sveltia CMS, Renovate, Lighthouse, Playwright, axe-core, Uptime Kuma, vanilla-cookieconsent, React Email/MJML, Lucide, Google Fonts (OFL).

Vir za cene GitHub: [GitHub changelog](https://github.blog/changelog/2025-03-25-introducing-github-secret-protection-and-github-code-security/)

## GitHub: organizacija repozitorijev

Vse je na GitHubu, v ločeni organizaciji (`e-visuals-studio`) s privatnimi repozitoriji, razdeljenimi na tri dele: skupno jedro kot paket, template in en repo na stranko. Repo na stranko je nujen, ker Sveltia urednikom stranke da pravico pisanja v repo. Z enim samim monorepom za vse bi vsaka stranka videla in lahko spreminjala vse ostale.

| Repo | Vsebina | Kako se posodablja |
| --- | --- | --- |
| `factory-core` | pnpm monorepo, objavljen kot `@e-visuals-studio/core` na GitHub Packages: `<SEO>`, schema.org helperji, Consent + GA, layouti, knjižnica blokov (stilirana samo s tokeni), generator Sveltia configa, reusable GitHub Actions workflowi, vzorčni agenti in `CLAUDE.md` | Semver release (`v1.4.0`), changelog |
| `site-template` | GitHub *Template repository*: Astro projekt, ki uporablja `@e-visuals-studio/core`, `tokens.json`, primer strani, `public/admin`, `.claude/`, `brief.yaml` | Spremembe redke; nove stvari gredo najprej v core |
| `client-<ime>` | Ustvarjen iz templata: tokeni stranke, njene strani, vsebina (`src/content`), po potrebi lokalni override blokov | Renovate odpre PR, ko izide nov core |

&#91;embedded content: repozitoriji in tokovi · core, template, stranka\]

Izboljšave tečejo iz jedra v vse stranke prek PR-jev. Urednik stranke piše samo v svoj repo, vsak push na `main` pa sproži deploy.

Pravila, ki držijo sistem vzdržljiv:

- Vse, kar je enako pri vseh strankah (SEO, consent, CI, agenti), živi v `factory-core`. V repu stranke se ne kopira, ampak uvozi.
- CI pri stranki je en klic reusable workflowa: `uses: e-visuals-studio/factory-core/.github/workflows/site.yml@v1`.
- Agente in `CLAUDE.md` v repo stranke osveži ukaz `pnpm factory sync`, ki jih kopira iz core paketa (Claude Code jih bere iz `.claude/` v repu).
- Blok, ki ga stranka potrebuje drugačen, se "izvleče" v `src/blocks/` stranke in prekrije verzijo iz core. Ostali bloki se še naprej posodabljajo.

## Workflow

To so trije tokovi: nova stranka (ti + agenti), urejanje vsebine (stranka sama v adminu) in posodobitve jedra (avtomatsko prek PR-jev).

### A. Nova stranka

1. Iz templata ustvari repo: `gh repo create e-visuals-studio/client-<ime> --private --template e-visuals-studio/site-template --clone`.
2. Izpolni `brief.yaml` (ime, dejavnost, storitve, kontakt, jeziki, lokacija, ključne besede, GA ID, domena).
3. Od designerja dobiš Figmo z Variables. Agent `design-implementer` napiše `tokens.json` in morebitne nove bloke.
4. V Claude Code zaženeš skill `/new-client-site`: scaffolder sestavi strani iz blokov, `seo-specialist` doda meta in schema, `content-writer` pripravi osnutke besedil.
5. Na branchu `preview` Cloudflare Pages naredi preview URL. `qa-auditor` požene Lighthouse, axe in screenshote; napake popraviš in ponoviš.
6. Stranka potrdi preview, merge v `main` sledi deploy na produkcijo, DNS na Cloudflare.
7. Stranki dodaš uporabnika za `/admin` (glej Odprte odločitve) in ji pošlješ kratka navodila.

### B. Urejanje vsebine (stranka)

1. Stranka odpre `https://domena.si/admin` in se prijavi.
2. Doda ali uredi novico, blog post ali galerijo (polja so vnaprej definirana, slike se naložijo v repo).
3. Shrani: Sveltia naredi commit v `main` (ali PR, če vklopiš editorial workflow za odobritev).
4. Cloudflare Pages zgradi stran, ki je v približno minuti na spletu. Sitemap, RSS in OG slika se posodobijo sami.

### C. Posodobitve jedra

1. Izboljšava (npr. nov schema tip, popravek consenta) gre v `factory-core`, izide nova verzija.
2. Renovate v vsakem `client-*` repu odpre PR.
3. CI na PR-ju požene build in Lighthouse; če je zelen, ga merge-aš (ali nastaviš automerge za patch verzije).
4. Ob večjih spremembah agentov poženeš še `pnpm factory sync`.

## SEO, GA in consent, dostopnost

Vse spodaj je v `factory-core` in se piše enkrat. CI build pade, če stran ne izpolni pravil.

**Tehnični SEO**

- `<SEO>` komponenta na vsaki strani: title, description, canonical, Open Graph, Twitter kartice, `hreflang` za SL/EN
- JSON-LD: `LocalBusiness` ali `Organization`, `Article` za bloge, `BreadcrumbList`, `FAQPage`
- Avtomatski `sitemap.xml`, `robots.txt`, RSS za novice, generirane OG slike za vsak post
- Slike samo prek `<Image>` (AVIF/WebP, `srcset`, lazy loading), self-hostani fonti, kritični CSS
- Lep URL slug iz naslova (šumniki → s, c, z), 301 preusmeritve v `_redirects` ob selitvi stare strani

**GA in consent (EU, GDPR + ZEKom-2)**

- Google Consent Mode v2 + lahek banner (npr. vanilla-cookieconsent)
- Brez privolitve GA ne postavi piškotkov (samo cookieless signali); po privolitvi polna meritev
- Privzeto: Umami ali Plausible brez piškotkov (odprta koda); GA4 z bannerjem samo, če ga stranka izrecno želi
- Google Search Console in Bing Webmaster ob vsakem zagonu strani

**Dostopnost (WCAG 2.1 AA, European Accessibility Act)**

- Semantičen HTML, en `h1` na stran, alt besedila obvezna v CMS shemi
- Kontrast iz tokenov preverjen že v CI (axe)

**Quality gate v CI**

- Lighthouse ≥ 95 (Performance, SEO, Best Practices, Accessibility) na mobilnem profilu
- Brez broken linkov, vsaka stran ima description in OG sliko

## Varnost

Statična stran ima majhno napadno površino. Realna tveganja so drugje: dobavna veriga npm paketov, ukradeni GitHub ali Cloudflare dostopi, zlorabljeni obrazci, ponarejanje e-pošte z domene stranke in skripte tretjih oseb. Vse spodaj gre v `factory-core` in v CI, da velja za vsako stranko brez dodatnega dela.

| Področje | Ukrep | Kje |
| --- | --- | --- |
| HTTP headerji | HSTS (z `preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (kamera, mikrofon, lokacija izklopljeni), `frame-ancestors 'none'`, COOP | `public/_headers` iz core |
| CSP | Astro `security.csp` (hashi za skripte in stile) + stroža politika v `_headers`; `Report-Only` faza ob prvem zagonu, ker meta CSP ne pošilja poročil | `astro.config`, `_headers` |
| Skripte tretjih oseb | Čim manj; GA samo po privolitvi; zemljevidi in YouTube kot "facade" (slika + klik); fonti self-hostani | core komponente |
| Dobavna veriga | Zaklenjen `pnpm-lock.yaml`, `minimumReleaseAge` (npr. 3 dni) za nove verzije, privzeto blokirani `postinstall` skripti, Renovate z zamikom, `pnpm audit` v CI | `pnpm-workspace.yaml`, CI |
| GitHub | Obvezen 2FA v organizaciji, zaščita `main` brancha za kodo, secret scanning + push protection, Dependabot alerts, Semgrep CE (CodeQL in secret scanning sta na zasebnih repozitorijih plačljiva), `permissions: read` kot privzeto v Actions, deploy brez dolgoživih žetonov | nastavitve org + reusable workflow |
| CMS | OAuth Worker omejen na dovoljene domene in repozitorije, minimalni scope; v CMS-ju prepovedan upload SVG (XSS) in HEIF/AVIF (libheif, GHSA-26w7-cxv4-gfx2), omejena velikost slik; vhodne slike HEIF/AVIF zavrne tudi build (image service iz core) | Worker + `config.yml` |
| Obrazci | ALTCHA, honeypot, rate limit na Workerju, validacija na strežniški strani, brez skrivnosti v klientu | Worker iz core |
| Cloudflare | SSL Full (strict), Always HTTPS, min. TLS 1.2, brezplačna WAF pravila, Bot Fight Mode, DNSSEC, CAA zapis | checklist ob zagonu |
| Domena in e-pošta | SPF, DKIM, DMARC (najprej `p=none` z poročili, nato `quarantine`); domena brez e-pošte dobi "null" SPF in DMARC `reject` | DNS predloga |
| Razkritje ranljivosti | `/.well-known/security.txt` s kontaktom | template |
| Preview okolja | `*.pages.dev` in preview branchi z `noindex` in po potrebi Cloudflare Access | `_headers`, Cloudflare |

**Avtomatska kontrola v CI:** preverjanje headerjev (pričakovani headerji morajo biti prisotni), gitleaks za skrivnosti, `pnpm audit --prod`, Semgrep CE. Enkrat na mesec Mozilla Observatory in SSL Labs ocena za vse produkcijske domene, rezultat gre v mesečno poročilo.

Nov agent **`security-auditor`** (Read, Bash, WebFetch) preveri headerje, CSP, DNS (SPF/DKIM/DMARC, CAA, DNSSEC), odvisnosti in Cloudflare checklist ter vrne `security-report.md`.

**Delitev dela: orodja + agent.** Ranljivosti ne prepuščamo samo agentom. Brezplačna odprtokodna orodja tečejo lokalno v CI pri vsakem commitu in so deterministična: `gitleaks` (gesla in ključi v kodi), Semgrep CE (nevarni vzorci), `pnpm audit` (znane ranljivosti paketov); ob najdbi build pade. Agent `security-auditor` teče pri vsakem PR-ju in enkrat na mesec ter pregleda, česar orodja ne razumejo (logika obrazca, CSP, headerji, DNS), razloži najdbe in predlaga popravek; uporablja tudi Claude Code `/security-review`.

Vir: [Astro 6 Beta – CSP stabilen](https://astro.build/blog/astro-6-beta/), [Report URI – omejitve Astro CSP](https://docs.report-uri.com/frameworks/astro/)

## Performance

Performance definiramo kot proračun, ki ga CI uveljavlja: če nova sprememba proračun preseže, build pade. Lighthouse meri laboratorij, zato merimo tudi prave obiskovalce.

| Metrika | Proračun (mobilno) |
| --- | --- |
| LCP | < 2,0 s |
| INP | < 200 ms |
| CLS | < 0,05 |
| JS na stran | ≤ 50 KB (gzip), privzeto 0 |
| CSS na stran | ≤ 30 KB (gzip) |
| Teža strani (prvi obisk) | ≤ 1 MB |
| Fonti | največ 2 datočni, `woff2`, subset `latin-ext` (šumniki) |

**Kako to dosežemo**

- LCP slika z `fetchpriority="high"` in brez lazy loadinga; ostale slike lazy, z dimenzijami (brez CLS)
- Astro Fonts API, `font-display: swap`, preload samo glavnega fonta
- Predpomnjenje: hashani asseti `Cache-Control: immutable` za 1 leto, HTML kratko + revalidacija
- Speculation Rules ali Astro prefetch za notranje povezave
- Facade za YouTube in zemljevide, brez chat widgetov, ki naložijo 500 KB
- Interaktivnost samo kot Astro island z `client:visible`

**Merjenje v praksi:** Cloudflare Web Analytics (brez piškotkov, brezplačen) da Core Web Vitals pravih obiskovalcev, Search Console pa CrUX podatke. Lighthouse CI v PR-jih s proračunom (`budget.json` iz core).

Nov agent **`performance-auditor`** (Bash) požene Lighthouse na treh profilih, analizira bundle in proračun ter predlaga konkretne popravke.

## Animacije (opcijski modul GSAP)

[GSAP](https://gsap.com/) je opcijski modul `@e-visuals-studio/motion`, ki ga stranka vklopi le, če design zahteva animacije. Privzeta stran ostane brez JS, ko pa je modul vklopljen, mora še vedno ostati znotraj performance proračuna.

**Licenca:** GSAP je od leta 2025 v lasti Webflowa in brezplačen tudi za komercialno rabo, vključno s prej plačljivimi vtičniki (SplitText, MorphSVG, ScrollSmoother). Ni pa odprtokoden (ni MIT). Licenca prepoveduje uporabo v orodjih, ki uporabnikom omogočajo vizualno sestavljanje animacij brez kode in konkurirajo Webflowu. Za tovarno to pomeni: animacije določita designer in razvijalec v kodi, stranka jih v CMS-ju ne sestavlja. Spletna stran za enkratno plačilo je po licenci v redu. [Licenca](https://gsap.com/community/standard-license/)

**Kako je vgrajen**

- Animacije kot preseti z data atributi na blokih (`data-anim="fade-up"`, `data-anim="stagger"`, `data-anim="split-text"`); izbere jih designer, ne stranka
- Motion tokeni v `tokens.json` (trajanja, easing), tako da so animacije usklajene z designom kot barve
- GSAP iz npm, zapakiran v build (ne CDN), zato ga CSP pokrije s hashi; naloži se samo na straneh z `data-anim` in šele ob vidnosti (`client:visible` ali dinamični import)
- Vtičniki po potrebi: ScrollTrigger za scroll animacije, SplitText za naslove, Flip za galerije; vsak se naloži posebej

**Pravila, da animacije ne pokvarijo SEO in performance**

- Vsebina je vidna brez JS: začetno skrivanje elementov samo prek razreda, ki ga doda skript, nikoli v CSS
- LCP element (hero naslov, hero slika) se ne animira iz nevidnega stanja
- Animira se samo `transform` in `opacity` (brez CLS)
- `gsap.matchMedia()` spoštuje `prefers-reduced-motion`: animacije se izklopijo ali skrajšajo
- ScrollSmoother samo po premisleku, ker vpliva na dostopnost in Core Web Vitals
- Ko modul vklopiš, `performance-auditor` preveri, da proračun še drži

**Privzeto po pravilu odprte kode:** za preproste učinke (fade ob scrollu, prehodi med stranmi) CSS scroll-driven animacije in View Transitions brez JS. [Motion](https://motion.dev/) (MIT) je privzeta knjižnica za zahtevnejše animacije; GSAP je izjema, ko design potrebuje njegove vtičnike (SplitText, MorphSVG).

## Dodatna področja

Poleg varnosti in performance priporočam še te dodatke. Prvi trije najbolj vplivajo na zaupanje strank in na mesečni paket.

| Področje | Kaj vključi | Zakaj |
| --- | --- | --- |
| Monitoring | Uptime Kuma na Proxmoxu (uptime, potek SSL in domene), opozorila na e-pošto ali Telegram | Za izpad izveš pred stranko |
| Mesečno poročilo | Agent `maintenance-reporter`: Search Console (klik, prikazi, poizvedbe), Core Web Vitals, uptime, varnostna ocena, posodobitve, v PDF ali doc | Vidna vrednost mesečnega paketa |
| Konverzije | GA4 key events: oddan obrazec, klik na telefon in e-pošto, prenos dokumenta | Stranka vidi, koliko povpraševanj prinese stran |
| Pravni del | Politika zasebnosti, politika piškotkov, podatki o podjetju, izjava o dostopnosti (kjer je potrebna), generirano iz `brief.yaml`; pregled pravnika enkrat za template | Ponavljajoče se delo, ki ga stranke rade pozabijo |
| Lokalni SEO in AI iskanje | Google Business Profile, enaki NAP podatki povsod, bogat JSON-LD, FAQ z jasnimi odgovori; opcijsko `llms.txt` | Večina strank so lokalna podjetja; AI povzetki se opirajo na strukturirane podatke |
| Migracija starih strani | Crawl stare strani (seznam URL-jev), 301 mapa, prenos meta podatkov in vsebine | Brez izgube uvrstitev ob prenovi |
| Testiranje | Playwright e2e za obrazce in navigacijo, vizualna regresija screenshotov ob posodobitvi core | Posodobitev jedra ne pokvari tujih strani |
| Backup in izhod | Zrcaljenje vseh repozitorijev na Forgejo na Proxmoxu, domena v lasti stranke, dokumentiran prenos | Zaupanje in neodvisnost od GitHuba |
| Predaja stranki | Avtomatsko generirana navodila za `/admin` s screenshoti njene strani | Manj vprašanj po telefonu |

## Kontaktni obrazec in e-pošta

Kontaktni obrazec je blok v `factory-core`, ki ga stranka vklopi v `site.config.ts`. Oddajo sprejme Cloudflare Worker, ki jo preveri in nato pošlje dve e-pošti iz HTML predlog v barvah stranke.

&#91;embedded content: pot oddaje obrazca · preverjanja, pošiljanje, dve e-pošti\]

Oddaja ne gre nikamor, dokler Worker ne preveri honeypota, časa oddaje, omejitve števila oddaj in validacije polj. Lastnik dobi obvestilo, na katero lahko neposredno odgovori, obiskovalec pa potrdilo.

**Zaščita v plasteh (brezplačno, brez piškotkov)**

1. **Honeypot:** skrito polje, ki ga izpolni samo bot (privzeto)
2. **Čas oddaje:** oddaja hitrejša od nekaj sekund po nalaganju strani je zavrnjena (privzeto)
3. **Omejitev oddaj** na IP v Workerju (privzeto)
4. **ALTCHA:** vklopimo, ko se pojavi spam

reCAPTCHA ne uporabljamo: je zaprta Googlova storitev, nastavlja piškotke (zato bi potrebovali cookie banner) in ni boljša od zgornje kombinacije.

**Obrazec**

- Polja iz konfiguracije: ime, e-pošta, telefon, sporočilo, obvezna privolitev s povezavo na politiko zasebnosti; opcijsko izbira storitve
- Isti zod shema validira v brskalniku in v Workerju
- Brez prilog v prvi verziji (zloraba, velikost); kasneje R2 z omejitvijo tipa in velikosti
- Uspeh ali napaka brez ponovnega nalaganja strani, dostopna sporočila (`aria-live`)
- GA4 key event `generate_lead` ob uspešni oddaji

**Pošiljanje**

- `sendMail()` je adapter v core, tako da lahko ponudnika zamenjaš brez spremembe strani.
- Privzeto je Cloudflare Email Service, ker Worker in DNS že tečeta tam. [Email Sending je v javni beta verziji od aprila 2026](https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/) in zahteva Workers Paid plan (5 $/mesec za ves račun). Brez onboardinga domene lahko pošilja samo na preverjene naslove, kar zadošča za obvestilo lastniku.
- Rezerva je ponudnik z zgodovino dostavljivosti in strežniki v EU (npr. Brevo); za vsakega velja pogodba o obdelavi (DPA).
- Pošiljatelj je `obrazec@domena-stranke.si` z urejenimi SPF, DKIM in DMARC; `Reply-To` je naslov obiskovalca.
- Potrdilo obiskovalcu ne ponovi celotnega sporočila, da obrazca ni mogoče zlorabiti za pošiljanje spama na tuje naslove.
- Oddaj ne shranjujemo; opcijsko se 30 dni hranijo v D1 kot rezerva, če e-pošta ne pride.

**E-poštne predloge**

- Predloge v core kot React Email ali MJML komponente, ki se prevedejo v HTML, odporen na Outlook, plus čista tekstovna verzija.
- Barve, logo in pisava pridejo iz `tokens.json` stranke, tako da so predloge vedno usklajene s stranjo.
- Besedila (zadeva, uvod, zahvala, podpis, prejemniki) ureja stranka v CMS-ju pod "Nastavitve obrazca".
- Ob vsakem buildu se generirajo predogledi predlog (`/emails-preview`, `noindex`, samo na preview okolju).

**Povezave za e-pošto in telefon:** `mailto:` in `tel:` povezave v bloku Kontakt, e-poštni naslov zaščiten pred scraperji (sestavljen v brskalniku), klik se šteje kot GA4 dogodek.

## Monitoring z Uptime Kuma

Uptime Kuma teče na Proxmoxu in nadzira vse stranke z enega mesta. Zunanji heartbeat pa nadzira Kumo samo, ker monitoring doma ob izpadu elektrike ali interneta oslepi.

**Postavitev**

- Docker v LXC kontejnerju, v ločenem VLAN-u za javne storitve
- Admin vmesnik samo prek VPN-ja ali Cloudflare Access, nikoli odprt na internet
- Javne status strani (npr. `status.domena-stranke.si`) prek Cloudflare Tunnela, brez odpiranja portov na MikroTiku
- Kuma vsakih 5 minut pošlje heartbeat na zunanji brezplačni servis (npr. healthchecks.io). Če heartbeat izostane, dobiš alarm, da Kuma ne teče.
- Monitorji imajo 2–3 ponovitve pred alarmom, da kratek izpad domače linije ne sproži lažnih alarmov.
- Podatki Kume (SQLite) gredo v redni Proxmox backup.

**Monitorji za vsako stranko**

| Monitor | Kaj preveri | Interval |
| --- | --- | --- |
| HTTPS + ključna beseda | Domača stran vrne 200 in vsebuje ime stranke (ujame tudi "prazno" ali napačno stran) | 60 s |
| SSL certifikat | Opozorilo 21 dni pred potekom | dnevno |
| Kontaktni obrazec | `GET /api/contact/health` vrne OK (Worker teče, e-poštna konfiguracija je prisotna) | 5 min |
| DNS | MX in glavni zapisi se niso spremenili brez tvojega vedenja | 1 h |
| CMS prijava | OAuth Worker za `/admin` odgovarja | 15 min |
| Potek domene | RDAP preverjanje v `security-auditor` (enkrat na mesec), opozorilo 30 dni prej | mesečno |

**Obveščanje:** Telegram ali ntfy na telefon, e-pošta kot rezerva. Stranka dobi samo javno status stran, alarmi gredo tebi.

**Avtomatizacija:** ob novi stranki ukaz `pnpm factory monitor add` doda zgornje monitorje. Kuma nima uradnega REST API-ja za upravljanje monitorjev, zato skript uporablja neuradno Python knjižnico `uptime-kuma-api`. Uptime za mesečno poročilo agent `maintenance-reporter` prebere iz Kuminega `/metrics` endpointa.

## Workflow z designerjem

Designer riše v Figmi z istimi bloki in istimi imeni tokenov, kot jih ima koda. Tako je prenos skoraj mehanski.

1. **Dogovor o knjižnici blokov:** Hero, Storitve, O nas, Reference/galerija, CTA, FAQ, Kontakt, Blog seznam, Blog post, Footer. Designer riše variante teh blokov, ne vsakokrat novih postavitev.
2. **Figma Variables kot tokeni:** barve (`color/primary`, `color/surface` …), tipografija, razmiki, radiji. Izvoz prek Tokens Studio ali nativnega izvoza Variables v `tokens.json`.
3. **Tokeni v kodo:** build skript pretvori `tokens.json` v Tailwind temo (CSS spremenljivke). Barv v komponentah nikoli ne pišemo neposredno.
4. **Postavitve v kodo:** Claude Code s Figma MCP serverjem prebere frame in ga pretvori v Astro blok, ki uporablja samo tokene.
5. **Vizualna kontrola:** Playwright naredi screenshote pri 375, 768 in 1440 px. Designer jih primerja s Figmo in komentira na preview URL-ju.

Kadar designerja ni, dobi stranka privzeto temo iz templata, prilagojeno s tokeni (barve in fonti iz njene CGP).

### Pravilo: predaja designa

Designer odda živo Figma datoteko (povezavo) in ločeno paket medijev. PDF ali PNG ni sprejemljiv kot glavna predaja, ker je samo slika: brez tokenov, komponent, stanj in responsive pravil. Design, ki ne izpolni spodnjega seznama, ne gre v razvoj.

**Figma datoteka**

- [ ] Variables za barve, tipografijo, razmike, radije in trajanja animacij; imena enaka tokenom (`color/primary`, `space/4` …)
- [ ] Vsak blok je komponenta z variantami, ne ločeno narisan okvir
- [ ] Auto Layout povsod (brez njega dobimo absolutne pozicije, ne responsive postavitve)
- [ ] Okvirji za 375, 768 in 1440 px (minimalno mobilno + desktop)
- [ ] Stanja: hover, focus, napaka in uspeh obrazca, odprt mobilni meni
- [ ] Poimenovani sloji; dokončni okvirji označeni "Ready for dev"
- [ ] Opombe za animacije in obnašanje (npr. "fade-up ob scrollu"), ki se preslikajo na GSAP presete
- [ ] Pravo besedilo ali jasno označeni placeholderji

**Dostop**

- [ ] Datoteka je v naši Figma ekipi ali deljena z nami z dostopom do Dev Mode
- [ ] Za delo prek Figma MCP imamo Dev ali Full sedež na plačljivem planu (Starter je omejen na 6 MCP klicev na mesec)

**Paket medijev (ločeno, ker Figma MCP slik in fontov po meri ne prenese)**

- [ ] Slike v originalni ločjivosti (JPG/PNG, nestisnjene), vsaka z zapisom za register licenc
- [ ] Logotip in ikone kot SVG, besedilo pretvorjeno v krivulje
- [ ] Fonti: ime, vir, licenca; pri komercialnih fontih webfont datoteke in licenca za splet

**PDF/PNG samo kot dodatek:** predogled za potrditev pri stranki in referenčne slike za vizualno primerjavo (Playwright primerja zgrajeno stran z designom).

Vir: [Figma – Guide to the MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)

## Avtorske pravice: slike in drugi mediji

Nobena slika ne gre na stran brez dokazane pravice do uporabe. To pravilo uveljavljajo CI, CMS in agenti, ne samo dobra volja. Agencije (npr. PicRights, Copytrack) avtomatsko skenirajo splet in lastniku strani pošljejo zahtevek za odškodnino, zato je tveganje realno tudi za majhne strani.

**Dovoljeni viri**

| Vir | Pogoj | Kaj zabeležimo |
| --- | --- | --- |
| Fotografije stranke | Pisna izjava stranke, da ima pravice (fotograf, zaposleni); v pogodbi jamstvo stranke | izjava, avtor |
| Naročen fotograf | Pogodba s prenosom ali licenco za splet | pogodba, avtor |
| Plačljiv stock (Adobe Stock, iStock …) | Licenca kupljena na stranko ali na tvoje podjetje z dovoljenjem za naročnika | ID licence, račun |
| Unsplash, Pexels | Po njihovi licenci; previdno pri ljudeh, znamkah in prepoznavnih stavbah | URL, avtor, datum prenosa |
| CC0 / CC BY | Pri CC BY je obvezno navajanje avtorja (napis ali stran "Viri slik") | URL, avtor, licenca |
| AI generirane slike | Po pogojih orodja; brez podobnosti z resničnimi osebami, znamkami ali znanimi deli | orodje, prompt, datum |
| Ikone in ilustracije | Odprte knjižnice z ustrezno licenco (npr. Lucide, ISC) | knjižnica, licenca |

**Nikoli:** slike iz Google Images ali s tujih spletnih strani, screenshoti tujih vsebin, logotipi partnerjev ali referenc brez dovoljenja, stock slike z vodnim žigom, hotlinki na tuje strežnike.

**Kako je to vgrajeno**

- **Register licenc:** vsaka slika v repu ima zapis v `assets.licenses.yaml` (datoteka, vir, avtor, licenca, URL, datum, dokazilo). CI build pade, če slika nima zapisa.
- **CMS:** polje za sliko je v Sveltia shemi objekt z obveznimi polji `alt`, `avtor`, `vir` in `licenca`. Brez njih stranka ne more objaviti.
- **Agent `asset-auditor`:** z `exiftool` prebere EXIF/IPTC (copyright, fotograf, oznake stock agencij), primerja z registrom in označi sumljive slike za ročno preverjanje (npr. TinEye ali Google Lens). Ob izvozu odstrani GPS in osebne metapodatke.
- **Placeholderji med razvojem:** samo generirani (barvne ploskve, zamegljeni SVG), nikoli naključne slike s spleta. Preview okolja so `noindex`.
- **Designer:** slike v Figma mockupih so pogosto placeholderji iz stocka. Pred zagonom morajo biti zamenjane ali licencirane, designer pa preda licenčne datoteke skupaj z designom.
- **Fonti, video, glasba in zemljevidi** spadajo pod isto pravilo: Google Fonts (OFL) so v redu, komercialni fonti potrebujejo webfont licenco, OpenStreetMap zahteva navedbo vira.
- **Pravilo v `CLAUDE.md`:** agenti nikoli ne prenašajo slik s spleta in ne vstavljajo URL-jev tujih slik. Manjkajoča slika pomeni placeholder + TODO v briefu.

### Pravilo: brezplačne slike

Brezplačno ne pomeni brez pravil. Platforma ne jamči, da je nalagalec res avtor, odgovornost pa ostane pri nas.

- Samo iz znanih platform z jasno licenco (Unsplash, Pexels, Pixabay); nikoli "free images" z Googla
- V register: platforma, URL, avtor, datum prenosa in screenshot strani slike (dokaz dobre vere)
- Ljudje na sliki: brez soglasja modela ne sme stock obraz nastopati kot "naša stranka", "naš tim" ali v priporočilu
- Znamke, logotipi, umetniška dela in prepoznavne zgradbe na sliki: izogibamo se jim
- CC BY: obvezno navajanje avtorja; CC NC (nekomercialno) za strani podjetij ni dovoljeno

### Pravilo: AI generirane slike

AI slike so dovoljene samo kot ilustracija, nikoli kot prikaz resničnosti.

- **Licenca orodja:** komercialna raba samo na paketu, ki jo dovoljuje (npr. Midjourney: brezplačni preizkus ni komercialen, podjetja z nad 1 mio $ prihodkov potrebujejo Pro ali Mega). Pogoje preverimo za vsako orodje in jih zabeležimo.
- **Izključnost:** zgolj AI generirana slika po prevladujočem stališču ni avtorsko delo (ZASP zahteva človeškega avtorja). Stranka je ne more zaščititi; to ji povemo.
- **Brez posnemanja:** v promptih ni imen umetnikov, fotografov ali znamk; rezultat ne sme spominjati na znano delo, lik, znamko ali resnično osebo.
- **Brez zavajanja:** AI slika ne sme prikazovati "našega objekta", "naše ekipe", "našega izdelka" ali resničnega dogodka. Realistične AI slike, ki delujejo kot resnične, je po AI Act (člen 50, od 2. 8. 2026) treba označiti kot deepfake, zato jih ne uporabljamo.
- **Primerna raba:** ozadja, teksture, abstraktni vizuali, ilustracije za blog, brez ljudi.
- **Register:** orodje, paket, prompt, datum, oznaka `ai: true`. `asset-auditor` AI slik ne dovoli v galerijah referenc, projektov in na straneh o ekipi.
- **Kar prikazuje resnično delo stranke:** samo fotografije stranke ali naročenega fotografa.

Pravila o licencah in AI slikah enkrat pregleda odvetnik za avtorsko pravo, preden gredo v pogodbo s strankami.

Viri: [Midjourney – komercialna raba](https://terms.law/2026/01/15/midjourney-commercial-use-rights-complete-2026-guide/), [AI Act člen 50 in Digital Omnibus](https://casrai.org/wp/?p=3315)

## Agenti, CLAUDE.md in skill

Agenti so Claude Code subagenti v `.claude/agents/*.md`. Vsak ima ozko nalogo in samo orodja, ki jih rabi. Izvirniki so v `factory-core`, v repo stranke pridejo s `pnpm factory sync`.

| Agent | Naloga | Orodja | Izhod |
| --- | --- | --- | --- |
| `site-scaffolder` | Iz `brief.yaml` sestavi strani iz knjižnice blokov, navigacijo, footer | Read, Write, Bash | `src/pages/*`, `site.config.ts` |
| `design-implementer` | Figma frame v Astro blok, Figma Variables v `tokens.json` | Figma MCP, Read, Write | `tokens.json`, `src/blocks/*` |
| `seo-specialist` | Meta, schema.org, struktura naslovov, interni linki, lokalne ključne besede | WebSearch, Read, Write | SEO frontmatter, `seo-report.md` |
| `content-writer` | Osnutki besedil in blog postov v slovenščini (človek pregleda) | Read, Write | `src/content/*` |
| `qa-auditor` | Lighthouse, axe, broken links, screenshoti pri treh širinah | Bash (Playwright, Lighthouse CI) | `qa-report.md` s seznamom napak |
| `cms-configurator` | Iz content shem generira Sveltia `config.yml`, da so polja usklajena s kodo | Read, Write | `public/admin/config.yml` |

**`CLAUDE.md` (pravila, ki veljajo za vse agente)**

- Barve, fonti in razmiki samo iz tokenov, nikoli inline vrednosti
- Vsaka stran uporablja `<BaseLayout>` z `<SEO>`; slike samo prek `<Image>`
- Nove komponente najprej kot blok v core, ne lokalno, razen če je namensko override
- Nobenega JS na strani brez razloga; interaktivnost samo z Astro islands
- Besedila v slovenščini, brez izmišljenih podatkov o stranki (manjkajoče = TODO v briefu)
- Upoštevaj pravila za predajo designa, brezplačne in AI slike iz tega plana. Nikoli ne prenašaj slik s spleta; vsaka slika mora imeti zapis v registru licenc. Pred commitom: `pnpm build && pnpm qa`

**Skill `/new-client-site`**: orkestrira zaporedje scaffolder, design-implementer, seo-specialist, content-writer, cms-configurator, qa-auditor, security-auditor, performance-auditor in asset-auditor. Na koncu vrne povzetek in seznam odprtih TODO-jev iz briefa.

Ko nimaš designerja, uporabiš še skill `frontend-design` za dober izhodiščni videz.

## Faze in navodila za Claude Code

Gradi po fazah, vsaka faza je ena seja v Claude Code in en PR. Naslednja se začne šele, ko je prejšnja zelena v CI.

- [ ] **Faza 1 – factory-core skelet:** pnpm monorepo, `<SEO>`, `<BaseLayout>`, tokeni v Tailwind, 8–10 osnovnih blokov, sitemap, RSS
- [ ] **Faza 2 – consent + GA:** Consent Mode v2, banner, nastavitve iz `site.config.ts`
- [ ] **Faza 3 – site-template:** Astro projekt na `@e-visuals-studio/core`, `brief.yaml`, primer strani, označen kot GitHub Template
- [ ] **Faza 4 – CMS:** Sveltia na `/admin`, kolekcije blog/novice/galerija, OAuth Worker na Cloudflare, kontaktni obrazec z Workerjem, sendMail() adapter in e-poštne predloge
  - **Slike HEIC/AVIF iz CMS-ja:** iPhone fotografije so HEIC, build pa vhodne slike HEIF družine zavrne (core v0.2.0, GHSA-26w7-cxv4-gfx2). Stranka mora že v CMS-ju dobiti jasno sporočilo v slovenščini, ne šele padca builda. Iz dokumentacije Sveltie (oktober 2026): image polje ima `accept` (npr. `accept: image/jpeg,image/png,image/webp`), `media_libraries.default.config` ima `max_file_size` in `transformations.raster_image`, ki ob nalaganju pretvori sliko, ključ je izvorni format, izhod samo `format: webp` (+ `quality`, `width`, `height`). Dokumentacija ne pove, ali Sveltia sprejme in pretvori HEIC (brskalniki razen Safarija HEIC ne dekodirajo) in ali lahko ob zavrnitvi prikaže lastno sporočilo. **Preveri v fazi 4** s pravo iPhone fotografijo v Chromu, Firefoxu in Safariju (iOS in macOS): (1) ali `transformations` HEIC pretvori v WebP, (2) kaj stori `accept` brez `image/heic` (iOS Safari lahko ob nalaganju sam pretvori v JPEG), (3) ali gre sporočilo o zavrnitvi prilagoditi. Če pretvorba ne deluje povsod: `accept` brez HEIC/AVIF, slovenski `hint` pri vsakem image polju (»Fotografije z iPhona: Nastavitve → Kamera → Formati → Najbolj združljivo, ali pošlji kot JPG«) in build napaka kot zadnja varovalka.
- [ ] **Faza 5 – CI/CD:** reusable workflow (build, Lighthouse CI, axe, link check), Cloudflare Pages, Renovate, varnostni headerji in CSP, performance proračun, gitleaks, Semgrep CE, preverjanje licenc, Uptime Kuma na Proxmoxu + ukaz monitor add
- [ ] **Faza 6 – agenti:** `.claude/agents/*`, `CLAUDE.md`, skill `/new-client-site`, ukaz `factory sync`
- [ ] **Faza 7 – pilot:** ena prava stran od briefa do produkcije, zapis časa in težav, popravki procesa

**Začetni prompt za Claude Code (faza 1)**

```markdown
Preberi WEBSITE_FACTORY_PLAN.md (ta dokument). Delamo FAZO 1.
Postavi pnpm monorepo `factory-core` s paketom `@e-visuals-studio/core` za Astro 6 + Tailwind 4:
- build skript, ki iz tokens.json generira CSS spremenljivke in Tailwind temo
- <BaseLayout> in <SEO> (title, description, canonical, OG, hreflang, JSON-LD helperji)
- bloki: Hero, Features, About, Gallery, CTA, FAQ, Contact, BlogList, Footer – stilirani SAMO s tokeni
- integracija za sitemap in RSS
- primer aplikacije v /playground za lokalni preizkus
Najprej mi pokaži plan in strukturo map, šele nato piši kodo.
Na koncu: pnpm build mora uspeti, Lighthouse na /playground ≥ 95.
```

Dokument izvoziš kot Markdown in ga shraniš v repo kot `WEBSITE_FACTORY_PLAN.md`, da ga Claude Code bere v vsaki fazi.

## Prvi naročnik: koraki od nič do produkcije

Prvo stran narediš v približno 6 tednih. Ne gradiš najprej cele tovarne: zgradiš le minimalno jedro, prvo stran pa sestaviš tako, da se vse, kar se izkaže za ponovljivo, pozneje premakne v `factory-core`. Osnovo gradiš, medtem ko designer riše.

&#91;embedded content: prvi naročnik · 6 faz, 3 potrditve stranke\]

Vsaka faza se začne šele po potrditvi stranke na prejšnjem mejniku. Ocena velja za delo ob službi; naslednje strani so hitrejše (1–2 tedna), ker osnova že obstaja.

### 0 · Dogovor (teden 1)

1. **Uvodni sestanek** (60 min): cilj strani, ciljni kupci, obstoječa stran in domena, storitve, jeziki, blog/novice, obrazec, animacije, rok, proračun. Med sestankom izpolniš osnutek `brief.yaml`.
2. **Ponudba:** obseg (število strani, bloki, CMS, obrazec, GA, opcijsko animacije), cena izdelave in mesečnega paketa, roki, število krogov popravkov, kaj priskrbi stranka (besedila, fotografije z izjavo o pravicah, logotip, dostop do domene).
3. **Pogodba:** obseg, avans 30–50 %, lastništvo (domena in vsebina sta strančini), jamstvo stranke za materiale, pogodba o obdelavi osebnih podatkov (obrazec), pogoji mesečnega paketa. Predlogo enkrat pregleda pravnik in jo nato uporabljaš za vse.
4. **Designer:** pošlješ mu brief, pravilo za predajo designa in rok; dogovorita ceno in kroge popravkov.
5. **Seznam materialov:** stranki pošlješ seznam, kaj potrebuješ in do kdaj (vsebina zamuja najpogosteje).

**Mejnik:** podpisana pogodba in plačan avans.

### 1 · Osnova (teden 1–3, vzporedno z designom)

6. **Računi:** GitHub organizacija z obveznim 2FA, Cloudflare (Workers Paid, če uporabiš Cloudflare e-pošto), Figma Professional z Dev sedežem, Google račun za GA4 in Search Console (property ustvariš na stranko in ji daš lastništvo).
7. **Claude Code, faza 1:** `factory-core` z `<SEO>`, layoutom, tokeni in 6–8 osnovnimi bloki (začetni prompt zgoraj).
8. **Faza 2–3:** consent + GA, `site-template` z `brief.yaml` in `CLAUDE.md`.
9. **Faza 4–5 v minimalni obliki:** Sveltia CMS z blogom/novicami, kontaktni obrazec z Workerjem, CI z buildom in Lighthouse, Cloudflare Pages preview.
10. Ostalo (vsi agenti, Renovate, `factory sync`, Uptime Kuma avtomatizacija) počaka do po zagonu.

### 2 · Design (teden 1–3, designer)

11. **Smer:** moodboard ali dve smeri domače strani, stranka izbere.
12. **Domača stran** desktop + mobilno; po potrditvi še ostale strani.
13. **Vsebina:** vzporedno zbiraš besedila in fotografije od stranke, vsako sliko vpišeš v register licenc.
14. **Prevzem designa** po pravilu za predajo; manjkajoče vrneš designerju.

**Mejnik:** stranka pisno potrdi design.

### 3 · Razvoj (teden 3–5)

15. `gh repo create e-visuals-studio/client-<ime> --private --template e-visuals-studio/site-template --clone`, dopolniš `brief.yaml`.
16. Iz Figme prek MCP: `tokens.json` in manjkajoči bloki.
17. Strani in vsebina, SEO meta in schema, obrazec s predlogami e-pošte, CMS kolekcije, consent + GA, opcijsko animacije.
18. Preview URL pošlješ stranki in designerju; 1–2 kroga popravkov na preview povezavi.

**Mejnik:** stranka pisno potrdi preview.

### 4 · QA (teden 5)

19. Lighthouse ≥ 95 na mobilnem profilu, axe, broken links, screenshoti na treh širinah.
20. Varnost: headerji, CSP, SPF/DKIM/DMARC, Cloudflare checklist.
21. Obrazec testiran do pravega nabiralnika stranke (obvestilo in potrdilo).
22. Register licenc popoln, alt besedila, politika zasebnosti in piškotkov, podatki o podjetju.
23. Če stara stran obstaja: seznam starih URL-jev in 301 preusmeritve.

### 5 · Zagon (teden 6)

24. Domena na Cloudflare (ali samo CNAME), SSL Full (strict), merge v `main`.
25. Search Console: potrditev in oddaja sitemapa; test GA dogodkov.
26. Uptime Kuma monitorji (lahko ročno za prvo stranko).
27. **Predaja:** račun za `/admin`, kratka navodila, 30-minutno usposabljanje, seznam dostopov.
28. Končni račun, začetek mesečnega paketa.

### Po zagonu

29. Dva tedna spremljaš indeksiranje in Core Web Vitals.
30. **Retrospektiva:** zapišeš porabljen čas po fazah, popraviš cenik, ponovljive dele premakneš v `factory-core` in šele takrat dokončaš agente in skill `/new-client-site`.

## Odprte odločitve

- [ ] **Prijava strank v CMS:** Sveltia z GitHub backendom zahteva, da ima urednik stranke GitHub račun z write dostopom do svojega repa. To je za laike ovira. Možnosti: račun jim ustvariš ti, Keystatic Cloud ali urejanje vsebine kot storitev v mesečnem paketu.
- [ ] **Ime GitHub organizacije in npm scope**: odločeno – `e-visuals-studio`, last podjetja e-visuals
- [ ] **GA4 ali Umami/Plausible kot privzeto** za nove stranke
- [ ] **Večjezičnost:** ali je SL/EN del templata od začetka ali dodatek
- [ ] **Poslovni model:** cena izdelave, mesečni paket (hosting, posodobitve, SEO poročilo), kdo je lastnik domene in repa
- [ ] **Pogodba z designerjem:** format predaje (Figma + Variables), število krogov popravkov, predaja licenc za vse slike in fonte; v pogodbi s stranko jamstvo za pravice do materialov, ki jih priskrbi

**Viri**

- [Astro 6.0](https://astro.build/blog/astro-6/)
- [What's new in Astro – March 2026](https://astro.build/blog/whats-new-march-2026/)
- [Sveltia CMS](https://github.com/sveltia/sveltia-cms)
- [Keystatic & Astro (Astro docs)](https://v6.docs.astro.build/ko/guides/cms/keystatic/)
