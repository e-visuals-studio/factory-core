import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { aggregate, evaluate, type RunScores } from '../src/lighthouse/assert.ts';
import { parseConfig } from '../src/lighthouse/config.ts';
import { startStaticServer, type StaticServer } from '../src/lighthouse/server.ts';

const rc = (assertions: Record<string, unknown>, collect: Record<string, unknown> = {}) => ({
  ci: { collect: { staticDistDir: './dist', url: ['http://localhost/'], ...collect }, assert: { assertions } },
});

describe('parseConfig', () => {
  it('prebere lighthouserc.json iz repozitorija (format Lighthouse CI)', async () => {
    const json = JSON.parse(await readFile(new URL('../../../lighthouserc.json', import.meta.url), 'utf8'));
    const config = parseConfig(json);
    assert.equal(config.staticDistDir, './playground/dist');
    assert.deepEqual(config.paths, ['/', '/blog/', '/blog/kako-izbrati-les-za-kuhinjo/', '/en/']);
    assert.equal(config.runs, 3);
    assert.match(config.chromeFlags, /--headless=new/);
    assert.deepEqual(
      config.assertions.map((a) => `${a.category}:${a.minScore}:${a.aggregation}`),
      ['performance:0.95:median', 'accessibility:0.95:optimistic', 'best-practices:0.95:optimistic', 'seo:0.95:optimistic'],
    );
  });

  it('privzeto 3 teki, "off" preskoči mejo', () => {
    const config = parseConfig(rc({ 'categories:seo': 'off', 'categories:performance': ['error', { minScore: 0.9 }] }));
    assert.equal(config.runs, 3);
    assert.deepEqual(config.assertions, [{ category: 'performance', minScore: 0.9, aggregation: 'optimistic' }]);
  });

  it('jasne napake za nepodprto konfiguracijo', () => {
    assert.throws(() => parseConfig({}), /manjka ključ "ci"/);
    assert.throws(() => parseConfig(rc({}, { url: [] })), /neprazen seznam/);
    assert.throws(() => parseConfig(rc({ 'uses-http2': 'error' })), /samo meje "categories:/);
    assert.throws(() => parseConfig(rc({ 'categories:seo': ['warn', { minScore: 0.9 }] })), /raven "error"/);
    assert.throws(() => parseConfig(rc({ 'categories:seo': ['error', { minScore: 95 }] })), /med 0 in 1/);
    assert.throws(() => parseConfig(rc({ 'categories:seo': ['error', { minScore: 0.9, aggregationMethod: 'avg' }] })), /aggregationMethod/);
  });
});

describe('aggregate in evaluate', () => {
  it('mediana, optimistic, pessimistic', () => {
    assert.equal(aggregate([0.9, 1, 0.8], 'median'), 0.9);
    assert.equal(aggregate([0.9, 1, 0.8, 0.7], 'median'), 0.8);
    assert.equal(aggregate([0.9, 1, 0.8], 'optimistic'), 1);
    assert.equal(aggregate([0.9, 1, 0.8], 'pessimistic'), 0.8);
  });

  it('meja po strani in kategoriji; manjkajoča ocena je neuspeh', () => {
    const run = (performance: number | null): RunScores => ({ performance, accessibility: 1, 'best-practices': 1, seo: 1 });
    const results = new Map([
      ['/', [run(0.97), run(0.93), run(0.99)]],
      ['/blog/', [run(0.94), run(0.96), run(0.9)]],
      ['/en/', [run(null), run(1), run(1)]],
    ]);
    const checks = evaluate(results, [{ category: 'performance', minScore: 0.95, aggregation: 'median' }]);
    assert.deepEqual(
      checks.map((c) => [c.path, c.score, c.passed]),
      [
        ['/', 0.97, true],
        ['/blog/', 0.94, false],
        ['/en/', null, false],
      ],
    );
  });
});

describe('startStaticServer', () => {
  let dir: string;
  let server: StaticServer;
  const get = (path: string, headers: Record<string, string> = {}) =>
    new Promise<{ status: number; headers: Record<string, unknown>; body: Buffer }>((ok, fail) => {
      request(server.origin + path, { headers }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c)).on('end', () => ok({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks) }));
      })
        .on('error', fail)
        .end();
    });

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'factory-lh-'));
    await mkdir(join(dir, 'o-nas'));
    await writeFile(join(dir, 'index.html'), `<!doctype html><title>Domov</title>${'x'.repeat(2000)}`);
    await writeFile(join(dir, 'o-nas', 'index.html'), '<!doctype html><title>O nas</title>');
    await writeFile(join(dir, '404.html'), '<!doctype html><title>Te strani ni</title>');
    server = await startStaticServer(dir);
  });
  after(async () => {
    await server.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('mapa s poševnico → index.html, brez poševnice → 301 (kot Lighthouse CI)', async () => {
    const page = await get('/o-nas/');
    assert.equal(page.status, 200);
    assert.match(page.body.toString(), /O nas/);
    const redirect = await get('/o-nas?x=1');
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.location, '/o-nas/?x=1');
  });

  it('gzip za HTML ≥ 1 KB, če ga brskalnik sprejme', async () => {
    const res = await get('/', { 'Accept-Encoding': 'gzip, br' });
    assert.equal(res.headers['content-encoding'], 'gzip');
    assert.match(gunzipSync(res.body).toString(), /Domov/);
    assert.equal((await get('/o-nas/', { 'Accept-Encoding': 'gzip' })).headers['content-encoding'], undefined);
  });

  it('neznana pot → 404 z 404.html; ne pride izven mape', async () => {
    const missing = await get('/ne-obstaja/');
    assert.equal(missing.status, 404);
    assert.match(missing.body.toString(), /Te strani ni/);
    assert.notEqual((await get('/%2e%2e/%2e%2e/etc/passwd')).status, 200);
  });

  it('jasna napaka, če mapa ne obstaja', async () => {
    await assert.rejects(startStaticServer(join(dir, 'ni')), /najprej zgradi stran/);
  });
});
