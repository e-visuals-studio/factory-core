/**
 * Shema za brief.yaml – edini vir podatkov o stranki (glej WEBSITE_FACTORY_PLAN.md, Workflow A).
 *
 * Pravilo: vsak ključ je obvezen. Vrednost je veljavna ALI izrecen TODO (niz, ki se začne s "TODO").
 * Prazna ali manjkajoča vrednost je napaka, zato se nič ne izmisli in nič ne pozabi.
 * Neobvezni seznami (pogosta vprašanja, reference, omrežja) so lahko `[]`, a morajo biti zapisani.
 */
import { z } from 'astro/zod';

export const TODO_PATTERN = /^TODO\b/;
export type Todo = `TODO${string}`;

const todo = z
  .string()
  .regex(TODO_PATTERN)
  .transform((v) => v as Todo);

/** Veljavna vrednost ali izrecen TODO. */
const orTodo = <T extends z.ZodType>(schema: T) => z.union([todo, schema]);

const text = z.string().trim().min(1, { error: 'ne sme biti prazno (manjkajoče označi s TODO)' });

/** Besedilo po jezikih; `en` je obvezen samo, če je `en` v `jeziki` (preveri briefSchema). */
const localized = (inner: z.ZodType<string> = text) =>
  z.strictObject({ sl: orTodo(inner), en: orTodo(inner).optional() });

const metaDescription = z
  .string()
  .trim()
  .min(50, { error: 'opis za iskalnike mora imeti 50–160 znakov' })
  .max(160, { error: 'opis za iskalnike mora imeti 50–160 znakov' });

const image = z.strictObject({
  /** Pot do slike od korena projekta, npr. `src/assets/placeholders/hero.jpg`. Mora imeti zapis v assets.licenses.yaml. */
  datoteka: z.string().regex(/^src\/assets\/.+\.(jpe?g|png|webp|avif)$/i, {
    error: 'slika mora biti v src/assets/ (jpg, png, webp, avif); manjkajoča slika = placeholder + TODO v alt',
  }),
  alt: localized(),
});

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'čas v obliki HH:MM' });

export const LANGUAGES = ['sl', 'en'] as const;
export const ANALYTICS_PROVIDERS = ['none', 'umami', 'plausible', 'ga4'] as const;

export const briefSchema = z
  .strictObject({
    stranka: z.strictObject({
      ime: orTodo(text),
      /** Kratko, npr. "Mizarstvo v Kamniku" (eyebrow, slogan na OG sliki). */
      dejavnost: localized(),
      /** Meta description domače strani, 50–160 znakov. */
      opis: localized(metaDescription),
      /** Uvodni odstavek v heroju. */
      uvod: localized(),
      /** Besedilo za "O nas"; odstavki so ločeni s prazno vrstico. */
      oNas: localized(),
      /** schema.org podtip LocalBusiness, npr. `HomeAndConstructionBusiness`, `Dentist`. */
      schemaTip: orTodo(z.string().regex(/^[A-Z][A-Za-z]+$/, { error: 'schema.org tip, npr. HomeAndConstructionBusiness' })),
    }),
    /** Produkcijska domena z https, npr. `https://www.stranka.si`. */
    domena: orTodo(z.url({ protocol: /^https$/, error: 'https URL, npr. https://www.stranka.si' })),
    jeziki: z
      .array(z.enum(LANGUAGES))
      .min(1)
      .refine((l) => l[0] === 'sl', { error: 'prvi (privzeti) jezik je sl' })
      .refine((l) => new Set(l).size === l.length, { error: 'jezik je naveden dvakrat' }),
    kontakt: z.strictObject({
      email: orTodo(z.email({ error: 'neveljaven e-poštni naslov' })),
      /** V mednarodni obliki, npr. `+386 1 234 56 78`. */
      telefon: orTodo(z.string().regex(/^\+\d[\d ]{6,}$/, { error: 'telefon v obliki +386 …' })),
    }),
    naslov: z.strictObject({
      ulica: orTodo(text),
      postnaStevilka: orTodo(z.string().regex(/^\d{4,5}$/, { error: 'poštna številka (4–5 števk)' })),
      kraj: orTodo(text),
      drzava: orTodo(z.string().regex(/^[A-Z]{2}$/, { error: 'ISO koda države, npr. SI' })),
    }),
    lokacija: z.strictObject({
      /** Območje storitev (schema.org areaServed), npr. "Osrednjeslovenska regija". */
      obmocje: orTodo(text),
      geo: z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable(),
    }),
    /** `[]` = delovni čas se ne prikaže (npr. samo po dogovoru). */
    delovniCas: z.array(
      z.strictObject({
        dnevi: orTodo(z.array(z.enum(DAYS)).min(1)),
        od: orTodo(time),
        do: orTodo(time),
      }),
    ),
    storitve: z
      .array(z.strictObject({ ime: localized(), opis: localized() }))
      .min(1, { error: 'vsaj ena storitev (manjkajoče označi s TODO)' }),
    pogostaVprasanja: z.array(z.strictObject({ vprasanje: localized(), odgovor: localized() })),
    /** Samo prave reference stranke z dovoljenjem; nikoli izmišljene ali AI slike. */
    reference: z.array(z.strictObject({ naslov: localized(), slika: image })),
    socialnaOmrezja: z.array(z.url({ protocol: /^https$/ })),
    kljucneBesede: z.strictObject({
      sl: z.array(orTodo(text)).min(1),
      en: z.array(orTodo(text)).min(1).optional(),
    }),
    /** ID (Umami websiteId, GA4 measurementId) ni tu, ampak v okoljski spremenljivki ANALYTICS_ID. */
    analitika: z.strictObject({
      ponudnik: orTodo(z.enum(ANALYTICS_PROVIDERS)),
      /** Za umami in plausible: URL sledilne skripte. */
      scriptUrl: orTodo(z.url({ protocol: /^https$/ })).nullable(),
    }),
    pravno: z.strictObject({
      /** Polni naziv podjetja, npr. "Primer d.o.o.". */
      naziv: orTodo(text),
      maticna: orTodo(z.string().regex(/^\d{7}(\d{3})?$/, { error: 'matična številka (7 ali 10 števk)' })),
      davcna: orTodo(z.string().regex(/^SI\d{8}$/, { error: 'ID za DDV v obliki SI12345678' })),
      /** Sedež, npr. "Primerna ulica 1, 1000 Ljubljana". */
      sedez: orTodo(text),
    }),
    slike: z.strictObject({ hero: image, oNas: image }),
  })
  .superRefine((brief, ctx) => {
    // `en` mora obstajati v vseh besedilih, če je angleščina vklopljena (in obratno ne sme manjkati nikjer).
    if (brief.jeziki.includes('en')) {
      walk(brief, [], (value, path) => {
        if (isLocalized(value) && value.en === undefined) {
          ctx.addIssue({ code: 'custom', path: [...path, 'en'], message: 'manjka angleško besedilo (jeziki vsebuje en)' });
        }
      });
      if (!brief.kljucneBesede.en) {
        ctx.addIssue({ code: 'custom', path: ['kljucneBesede', 'en'], message: 'manjkajo angleške ključne besede' });
      }
    }
    if (['umami', 'plausible'].includes(brief.analitika.ponudnik) && !brief.analitika.scriptUrl) {
      ctx.addIssue({ code: 'custom', path: ['analitika', 'scriptUrl'], message: 'umami in plausible potrebujeta scriptUrl' });
    }
  });

export type Brief = z.infer<typeof briefSchema>;
export type BriefLang = (typeof LANGUAGES)[number];
export type Localized = { sl: string; en?: string };
export type BriefImage = z.infer<typeof image>;

export const isTodo = (value: unknown): value is Todo => typeof value === 'string' && TODO_PATTERN.test(value);

function isLocalized(value: unknown): value is Localized {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'sl' in value;
}

/** Obišče vse vrednosti v briefu (za iskanje TODO in manjkajočih prevodov). */
export function walk(value: unknown, path: Array<string | number>, visit: (value: unknown, path: Array<string | number>) => void) {
  visit(value, path);
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, [...path, i], visit));
  else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) walk(v, [...path, k], visit);
  }
}
