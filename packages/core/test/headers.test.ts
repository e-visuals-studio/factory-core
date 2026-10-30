import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildHeaders, WORKERS_DEV_PATTERN } from '../src/headers.ts';

/** Pravila v obliki { vzorec: [glave] } za primerjavo brez komentarjev in praznih vrstic. */
const rules = (text: string) => {
  const out: Record<string, string[]> = {};
  let current = '';
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (/^\s/.test(line)) out[current]!.push(line.trim());
    else out[(current = line)] = [];
  }
  return out;
};

describe('buildHeaders', () => {
  it('vedno noindex za *.workers.dev (preview in produkcijski alias), custom domene ne zadene', () => {
    assert.deepEqual(rules(buildHeaders(undefined, { noindex: false })), {
      [WORKERS_DEV_PATTERN]: ['X-Robots-Tag: noindex'],
    });
  });

  it('noindex build doda pravilo za vse strani', () => {
    assert.deepEqual(rules(buildHeaders(undefined, { noindex: true })), {
      [WORKERS_DEV_PATTERN]: ['X-Robots-Tag: noindex'],
      '/*': ['X-Robots-Tag: noindex'],
    });
  });

  it('ohrani public/_headers projekta in pravila doda na konec', () => {
    const existing = '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n\n';
    const result = buildHeaders(existing, { noindex: false });
    assert.ok(result.startsWith('/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n# '));
    assert.deepEqual(Object.keys(rules(result)), ['/assets/*', WORKERS_DEV_PATTERN]);
    assert.ok(result.endsWith('\n') && !result.endsWith('\n\n'));
  });
});
