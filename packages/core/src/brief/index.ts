/**
 * @e-visuals-studio/core/brief – shema, nalaganje in pretvorbe briefa za strani stranke.
 *
 *   const { brief } = await loadBrief('brief.yaml');
 *   factory({ ...factoryOptionsFromBrief(brief), fonts: … })
 */
import type { FactoryAnalyticsOptions } from '../integration.ts';
import { localBusiness, type JsonLd, type PostalAddress } from '../seo/jsonld.ts';
import { isTodo, type Brief, type BriefLang, type Localized } from './schema.ts';

export * from './schema.ts';
export { loadBrief, briefImages, checkImageLicenses, BriefError, type LoadBriefOptions, type LoadedBrief } from './load.ts';

/** Besedilo v jeziku; brez prevoda vrne slovensko (shema zahteva `en`, kadar je vklopljen). */
export function t(value: Localized, lang: BriefLang = 'sl'): string {
  return (lang === 'en' ? value.en : undefined) ?? value.sl;
}

/** Odstavki iz besedila, ločenega s prazno vrstico (npr. `stranka.oNas`). */
export function paragraphs(value: Localized, lang: BriefLang = 'sl'): string[] {
  return t(value, lang)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Domena za `site` v astro.config. TODO ni veljaven URL, zato do izpolnitve uporabi nadomestek na rezerviranem
 * TLD `.invalid` (`TODO_SITE`), ki ga ujame `factory-check-todo`.
 */
export const TODO_SITE = 'https://todo-domena.invalid';

export function siteUrl(brief: Brief): string {
  return isTodo(brief.domena) ? TODO_SITE : brief.domena;
}

export function postalAddress(brief: Brief): PostalAddress {
  const { ulica, postnaStevilka, kraj, drzava } = brief.naslov;
  return { streetAddress: ulica, postalCode: postnaStevilka, addressLocality: kraj, addressCountry: drzava };
}

/** `tel:` href iz telefonske številke (TODO ostane viden, da ga ujame check:todo). */
export function telHref(phone: string): string {
  return isTodo(phone) ? `tel:${phone}` : `tel:${phone.replace(/[^\d+]/g, '')}`;
}

const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const DAY_NAMES: Record<BriefLang, readonly string[]> = {
  sl: ['pon', 'tor', 'sre', 'čet', 'pet', 'sob', 'ned'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

/** Zaporedni dnevi v razpone: [Mo, Tu, We, Fr] → [[Mo, We], [Fr, Fr]]. */
function dayRanges(days: readonly string[]): Array<[number, number]> {
  const idx = [...new Set(days.map((d) => DAY_ORDER.indexOf(d as (typeof DAY_ORDER)[number])))].sort((a, b) => a - b);
  const ranges: Array<[number, number]> = [];
  for (const i of idx) {
    const last = ranges.at(-1);
    if (last && i === last[1] + 1) last[1] = i;
    else ranges.push([i, i]);
  }
  return ranges;
}

/** schema.org `openingHours`, npr. `["Mo-Fr 07:00-15:00"]`. TODO vnosi ostanejo vidni. */
export function openingHours(brief: Brief): string[] {
  return brief.delovniCas.map(({ dnevi, od, do: to }) => {
    if (isTodo(dnevi) || isTodo(od) || isTodo(to)) return [dnevi, od, to].find(isTodo)!;
    const days = dayRanges(dnevi)
      .map(([a, b]) => (a === b ? DAY_ORDER[a] : `${DAY_ORDER[a]}-${DAY_ORDER[b]}`))
      .join(',');
    return `${days} ${od}-${to}`;
  });
}

/** Delovni čas za ljudi, npr. `["pon–pet: 7.00–15.00"]` ali `["Mon–Fri: 07:00–15:00"]`. */
export function openingHoursText(brief: Brief, lang: BriefLang = 'sl'): string[] {
  const fmt = (time: string) => (lang === 'sl' ? time.replace(/^0/, '').replace(':', '.') : time);
  return brief.delovniCas.map(({ dnevi, od, do: to }) => {
    if (isTodo(dnevi) || isTodo(od) || isTodo(to)) return [dnevi, od, to].find(isTodo)!;
    const days = dayRanges(dnevi)
      .map(([a, b]) => (a === b ? DAY_NAMES[lang][a] : `${DAY_NAMES[lang][a]}–${DAY_NAMES[lang][b]}`))
      .join(', ');
    return `${days}: ${fmt(od)}–${fmt(to)}`;
  });
}

/** Pravni podatki za footer, npr. `Primer d.o.o., Ulica 1, 1000 Ljubljana · matična št. 1234567 · ID za DDV SI12345678`. */
export function companyInfo(brief: Brief, lang: BriefLang = 'sl'): string {
  const { naziv, sedez, maticna, davcna } = brief.pravno;
  const labels = lang === 'sl' ? { reg: 'matična št.', vat: 'ID za DDV' } : { reg: 'reg. no.', vat: 'VAT ID' };
  return `${naziv}, ${sedez} · ${labels.reg} ${maticna} · ${labels.vat} ${davcna}`;
}

/** LocalBusiness JSON-LD iz briefa. */
export function localBusinessFromBrief(brief: Brief, options: { url: string | URL; lang?: BriefLang; image?: string | URL }): JsonLd {
  const lang = options.lang ?? 'sl';
  return localBusiness({
    type: brief.stranka.schemaTip,
    name: brief.stranka.ime,
    url: options.url,
    description: t(brief.stranka.opis, lang),
    email: brief.kontakt.email,
    telephone: brief.kontakt.telefon,
    address: postalAddress(brief),
    openingHours: openingHours(brief),
    areaServed: brief.lokacija.obmocje,
    image: options.image,
    sameAs: brief.socialnaOmrezja,
    ...(brief.lokacija.geo && { geo: { latitude: brief.lokacija.geo.lat, longitude: brief.lokacija.geo.lng } }),
  });
}

/**
 * Analitika za `factory({ analytics })`: ponudnik in URL iz briefa, ID iz okoljske spremenljivke `ANALYTICS_ID`.
 * TODO ali `none` → brez analitike. Manjkajoč ID v produkcijskem buildu ustavi build (validacija v integraciji).
 */
export function analyticsFromBrief(
  brief: Brief,
  options: { analyticsId?: string; privacyHref?: string | Record<string, string> } = {},
): FactoryAnalyticsOptions {
  const { ponudnik, scriptUrl } = brief.analitika;
  const id = options.analyticsId ?? process.env.ANALYTICS_ID ?? '';
  const url = scriptUrl && !isTodo(scriptUrl) ? scriptUrl : '';
  switch (ponudnik) {
    case 'umami':
      return { provider: 'umami', scriptUrl: url, websiteId: id };
    case 'plausible':
      return { provider: 'plausible', scriptUrl: url, domain: new URL(siteUrl(brief)).hostname.replace(/^www\./, '') };
    case 'ga4':
      return { provider: 'ga4', measurementId: id, privacyHref: options.privacyHref };
    default:
      return { provider: 'none' };
  }
}
