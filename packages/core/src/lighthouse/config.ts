/**
 * Branje `lighthouserc.json` (format Lighthouse CI), da repozitorijem strank ni treba menjati konfiguracije.
 * Podprto: `ci.collect.staticDistDir`, `url`, `numberOfRuns`, `settings.chromeFlags` in
 * `ci.assert.assertions` za `categories:<id>` z `minScore` in `aggregationMethod`.
 */

export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Kot Lighthouse CI: brez `aggregationMethod` velja `optimistic` (najboljši tek). */
export type Aggregation = 'median' | 'optimistic' | 'pessimistic';

export interface CategoryAssertion {
  category: Category;
  minScore: number;
  aggregation: Aggregation;
}

export interface LighthouseConfig {
  staticDistDir: string;
  /** Poti strani (npr. `/blog/`); gostitelj iz `lighthouserc.json` se zamenja z lokalnim strežnikom. */
  paths: string[];
  runs: number;
  chromeFlags: string;
  assertions: CategoryAssertion[];
}

const AGGREGATIONS = new Set<string>(['median', 'optimistic', 'pessimistic']);

export function parseConfig(json: unknown, file = 'lighthouserc.json'): LighthouseConfig {
  const fail = (message: string): never => {
    throw new Error(`[factory-lighthouse] ${file}: ${message}`);
  };
  const ci = (json as { ci?: Record<string, any> })?.ci ?? fail('manjka ključ "ci".');
  const collect = ci.collect ?? fail('manjka "ci.collect".');

  const staticDistDir = typeof collect.staticDistDir === 'string' ? collect.staticDistDir : fail('"ci.collect.staticDistDir" mora biti pot do zgrajene strani.');
  const urls: unknown = collect.url;
  if (!Array.isArray(urls) || urls.length === 0) fail('"ci.collect.url" mora biti neprazen seznam URL-jev.');
  const paths = (urls as unknown[]).map((u) => {
    try {
      return new URL(String(u)).pathname;
    } catch {
      return fail(`neveljaven URL "${u}".`);
    }
  });
  const runs = collect.numberOfRuns ?? 3;
  if (!Number.isInteger(runs) || runs < 1) fail('"ci.collect.numberOfRuns" mora biti celo število ≥ 1.');

  const assertions: CategoryAssertion[] = [];
  for (const [key, value] of Object.entries<any>(ci.assert?.assertions ?? {})) {
    const category = key.startsWith('categories:') ? key.slice('categories:'.length) : undefined;
    if (!category || !(CATEGORIES as readonly string[]).includes(category)) fail(`podprte so samo meje "categories:<${CATEGORIES.join('|')}>", ne "${key}".`);
    const [level, options] = Array.isArray(value) ? value : [value, {}];
    if (level === 'off') continue;
    if (level !== 'error') fail(`"${key}": podprta je raven "error" (ali "off"), ne "${level}".`);
    const minScore = options?.minScore;
    if (typeof minScore !== 'number' || minScore < 0 || minScore > 1) fail(`"${key}": minScore mora biti število med 0 in 1.`);
    const aggregation = options?.aggregationMethod ?? 'optimistic';
    if (!AGGREGATIONS.has(aggregation)) fail(`"${key}": aggregationMethod mora biti median, optimistic ali pessimistic.`);
    assertions.push({ category: category as Category, minScore, aggregation });
  }

  return { staticDistDir, paths, runs, chromeFlags: collect.settings?.chromeFlags ?? '--headless=new', assertions };
}
