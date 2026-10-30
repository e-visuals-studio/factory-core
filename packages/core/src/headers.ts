/**
 * `_headers` za Cloudflare Workers static assets (velja samo za odgovore statičnih datotek, ne za kodo Workerja).
 * Pravila iz core se dodajo na konec morebitnega `public/_headers` projekta.
 */

const MARKER = '# @e-visuals-studio/core';

/** Preview URL-ji in produkcijski *.workers.dev: Cloudflare jim noindex ne doda sam. */
export const WORKERS_DEV_PATTERN = 'https://:version.:subdomain.workers.dev/*';

export function buildHeaders(existing: string | undefined, options: { noindex: boolean }): string {
  const rules = [
    `${MARKER}: workers.dev (preview in produkcijski alias) ni za iskalnike`,
    WORKERS_DEV_PATTERN,
    '  X-Robots-Tag: noindex',
    ...(options.noindex ? ['', `${MARKER}: noindex build`, '/*', '  X-Robots-Tag: noindex'] : []),
  ];
  const base = existing?.trimEnd();
  return (base ? `${base}\n\n` : '') + rules.join('\n') + '\n';
}
