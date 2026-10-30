---
"@e-visuals-studio/core": minor
---

Deploy na Cloudflare Workers static assets (faza 4a).

- **`site.yml`**: joba `deploy (preview)` (PR iz istega repozitorija: `wrangler versions upload --preview-alias pr-<št.>`, komentar na PR s povezavo, ki se posodablja) in `deploy (produkcija)` (push na `main`: `wrangler deploy` in smoke test). Oba čakata na zelen job `site`. Novi neobvezni vhodi `worker-name` (brez njega ni deploya), `cloudflare-account-id`, `site-url`, `noindex` in secret `CLOUDFLARE_API_TOKEN`. **Klicoči job mora dati `pull-requests: write`** (komentar s preview povezavo), sicer GitHub workflowa ne zažene.
- **`_headers`**: `factory()` ob buildu zapiše `dist/_headers` (na konec morebitnega `public/_headers`) z `X-Robots-Tag: noindex` za `*.workers.dev` (preview URL-ji in produkcijski alias); pri noindex buildu še za vse strani.
- **`SITE_NOINDEX=true`**: produkcijski build z meta noindex in `X-Robots-Tag`, `robots.txt` ostane odprt. `FactoryRuntimeConfig.robots` ima novo polje `blockCrawl` (robots.txt `Disallow: /`), `noindex` pomeni meta in glavo.
