/**
 * schema.org JSON-LD helperji. Vsak vrne čist objekt; več vozlišč združi `graph()`.
 * Izpis na strani: <SEO jsonLd={...} />
 */

export type JsonLd = Record<string, unknown>;

export interface PostalAddress {
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  addressCountry: string;
  addressRegion?: string;
}

export interface OrganizationInput {
  name: string;
  url: string | URL;
  logo?: string | URL;
  description?: string;
  email?: string;
  telephone?: string;
  address?: PostalAddress;
  /** Profili na družbenih omrežjih, Google Business Profile … */
  sameAs?: Array<string | URL>;
}

export interface LocalBusinessInput extends OrganizationInput {
  /** Podtip LocalBusiness, npr. `Dentist`, `Restaurant`, `HomeAndConstructionBusiness`. */
  type?: string;
  image?: string | URL;
  priceRange?: string;
  geo?: { latitude: number; longitude: number };
  /** npr. `["Mo-Fr 08:00-16:00"]` */
  openingHours?: string[];
  areaServed?: string | string[];
}

export interface ArticleInput {
  headline: string;
  description?: string;
  url: string | URL;
  image?: string | URL;
  datePublished: Date;
  dateModified?: Date;
  author: string | { name: string; url?: string | URL };
  publisher?: { name: string; logo?: string | URL };
  inLanguage?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string | URL;
}

export interface FaqItem {
  question: string;
  /** Odgovor kot navadno besedilo ali preprost HTML. */
  answer: string;
}

const CONTEXT = 'https://schema.org';
const str = (v: string | URL | undefined) => (v === undefined ? undefined : String(v));

function address(a?: PostalAddress): JsonLd | undefined {
  return a && { '@type': 'PostalAddress', ...a };
}

/** Odstrani `undefined`, da JSON-LD ostane čist. */
function clean<T extends JsonLd>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function organization(input: OrganizationInput): JsonLd {
  return clean({
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': `${str(input.url)}#organization`,
    name: input.name,
    url: str(input.url),
    logo: str(input.logo),
    description: input.description,
    email: input.email,
    telephone: input.telephone,
    address: address(input.address),
    sameAs: input.sameAs?.map(String),
  });
}

export function localBusiness(input: LocalBusinessInput): JsonLd {
  return clean({
    '@context': CONTEXT,
    '@type': input.type ?? 'LocalBusiness',
    '@id': `${str(input.url)}#organization`,
    name: input.name,
    url: str(input.url),
    logo: str(input.logo),
    image: str(input.image ?? input.logo),
    description: input.description,
    email: input.email,
    telephone: input.telephone,
    priceRange: input.priceRange,
    address: address(input.address),
    geo: input.geo && { '@type': 'GeoCoordinates', ...input.geo },
    openingHours: input.openingHours,
    areaServed: input.areaServed,
    sameAs: input.sameAs?.map(String),
  });
}

export function website(input: { name: string; url: string | URL; inLanguage?: string | string[] }): JsonLd {
  return clean({
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': `${str(input.url)}#website`,
    name: input.name,
    url: str(input.url),
    inLanguage: input.inLanguage,
    publisher: { '@id': `${str(input.url)}#organization` },
  });
}

export function article(input: ArticleInput): JsonLd {
  const author = typeof input.author === 'string' ? { name: input.author } : input.author;
  return clean({
    '@context': CONTEXT,
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: str(input.url),
    mainEntityOfPage: str(input.url),
    image: str(input.image),
    datePublished: input.datePublished.toISOString(),
    dateModified: (input.dateModified ?? input.datePublished).toISOString(),
    inLanguage: input.inLanguage,
    author: { '@type': 'Person', name: author.name, url: str(author.url) },
    publisher: input.publisher && {
      '@type': 'Organization',
      name: input.publisher.name,
      logo: input.publisher.logo && { '@type': 'ImageObject', url: str(input.publisher.logo) },
    },
  });
}

export function breadcrumbList(items: BreadcrumbItem[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: String(item.url),
    })),
  };
}

export function faqPage(items: FaqItem[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** Združi več vozlišč v en `@graph` (en <script> na stran). */
export function graph(...nodes: Array<JsonLd | undefined | false>): JsonLd {
  return {
    '@context': CONTEXT,
    '@graph': nodes.filter(Boolean).map((node) => {
      const { '@context': _, ...rest } = node as JsonLd;
      return rest;
    }),
  };
}

/** Varen izpis v <script type="application/ld+json"> (prepreči zaprtje </script> iz vsebine). */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
