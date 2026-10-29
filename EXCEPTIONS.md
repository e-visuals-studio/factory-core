# Izjeme od pravila "najprej odprta koda"

Vsako zaprto ali plačljivo orodje ali storitev v kodi strank gre sem: razlog, odprtokodna alternativa in izhodna pot
(glej `WEBSITE_FACTORY_PLAN.md`, Pravilo: najprej odprta koda).

## Predloga

```md
### <orodje> – <stranka ali "vse strani">
- **Razlog:** …
- **Odprtokodna alternativa:** …
- **Izhodna pot:** …
- **Dodano:** <datum>, <kdo>
```

## Znane izjeme (velja za vsako stran, ki jih vklopi)

### Google Analytics 4 (`analytics: { provider: 'ga4' }`)
- **Razlog:** samo, kadar stranka GA4 izrecno želi (npr. povezava z Google Ads). Vsaka taka stran dobi svoj zapis spodaj.
- **Odprtokodna alternativa:** Umami ali Plausible (`provider: 'umami' | 'plausible'`), brez piškotkov in bannerja.
- **Izhodna pot:** zamenjava ponudnika v `factory({ analytics })`; dogodki (`data-track`, `factoryTrack()`) ostanejo enaki.
- **Pogoji:** banner (vanilla-cookieconsent, MIT), Consent Mode v2 s privzetim "denied", gtag.js šele po privolitvi; politika zasebnosti opiše GA4.

## Zapisi po straneh

_Še ni zapisov._
