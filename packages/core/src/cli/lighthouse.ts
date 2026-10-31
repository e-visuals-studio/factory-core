#!/usr/bin/env node
/**
 * factory-lighthouse [lighthouserc.json]
 * Lighthouse (mobilno) na zgrajeni strani: statični strežnik za `staticDistDir`, N tekov na URL,
 * meje iz `ci.assert.assertions`. Pade, če katera kategorija ni dosežena.
 * Chrome iz CHROME_PATH. Poročila (JSON + HTML) v `.lighthouseci/`.
 * Nadomešča `lhci autorun` (@lhci/cli ni vzdrževan in prinaša ranljive odvisnosti).
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, type RunScores } from '../lighthouse/assert.ts';
import { CATEGORIES, parseConfig } from '../lighthouse/config.ts';
import { startStaticServer } from '../lighthouse/server.ts';

// Napaka (konfiguracija, strežnik, Lighthouse ne naloži strani) → kratko sporočilo brez sklada.
process.on('uncaughtException', (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.startsWith('[') ? message : `[factory-lighthouse] ${message}`);
  process.exit(1);
});

const configFile = process.argv[2] ?? 'lighthouserc.json';
const config = parseConfig(JSON.parse(await readFile(configFile, 'utf8')), configFile);
const outDir = resolve('.lighthouseci');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

let cli: string;
try {
  cli = fileURLToPath(import.meta.resolve('lighthouse/cli/index.js'));
} catch {
  console.error('[factory-lighthouse] paket "lighthouse" ni nameščen: pnpm add -D lighthouse');
  process.exit(1);
}

/** En tek Lighthousa v ločenem procesu (Chrome zažene Lighthouse sam, iz CHROME_PATH). */
function run(url: string, base: string): Promise<void> {
  const args = [cli, url, '--quiet', '--output=json', '--output=html', `--output-path=${base}`, `--chrome-flags=${config.chromeFlags}`];
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', fail);
    child.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`Lighthouse za ${url} je končal s kodo ${code}.`))));
  });
}

const server = await startStaticServer(config.staticDistDir);
const results = new Map<string, RunScores[]>();
let version = '';
try {
  for (const path of config.paths) {
    const url = server.origin + path;
    const slug = path.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'index';
    for (let i = 1; i <= config.runs; i++) {
      process.stdout.write(`Lighthouse ${i}/${config.runs}: ${path}\n`);
      const base = resolve(outDir, `lhr-${slug}-${i}`);
      await run(url, base);
      const lhr = JSON.parse(await readFile(`${base}.report.json`, 'utf8'));
      if (lhr.runtimeError) throw new Error(`Lighthouse za ${path}: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`);
      version = lhr.lighthouseVersion;
      const scores = Object.fromEntries(CATEGORIES.map((c) => [c, lhr.categories[c]?.score ?? null])) as RunScores;
      results.set(path, [...(results.get(path) ?? []), scores]);
    }
  }
} finally {
  await server.close();
}

const checks = evaluate(results, config.assertions);
const pct = (s: number | null) => (s === null ? '–' : String(Math.round(s * 100)));
console.log(`\nLighthouse ${version}, ${config.runs} tek(i) na stran, mobilno. Poročila: .lighthouseci/`);
console.log(['stran', ...config.assertions.map((a) => `${a.category} (${a.aggregation})`)].join('\t'));
for (const path of results.keys()) {
  console.log([path, ...checks.filter((c) => c.path === path).map((c) => `${pct(c.score)}${c.passed ? '' : ` ✗ < ${pct(c.minScore)}`}`)].join('\t'));
}
const failed = checks.filter((c) => !c.passed);
if (failed.length) {
  console.error(`\n${failed.length}× pod mejo:`);
  for (const f of failed) console.error(`  ${f.path} ${f.category}: ${pct(f.score)} < ${pct(f.minScore)} (${f.aggregation})`);
  process.exit(1);
}
console.log(`\n✓ vse meje dosežene (${checks.length} preverjanj)`);
