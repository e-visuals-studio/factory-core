#!/usr/bin/env node
/**
 * factory-check-todo [dist] [datoteka ...]
 *
 * Pade, če produkcijski build (dist) ali naštete datoteke (npr. brief.yaml, assets.licenses.yaml) vsebujejo TODO.
 * Preview build se preskoči: prepozna se po dist/robots.txt z `Disallow: /` (glej factory({ preview })),
 * zato je izjema vezana na dejanski build, ne na okoljsko spremenljivko.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const TEXT_EXTENSIONS = new Set(['.html', '.xml', '.txt', '.json', '.js', '.mjs', '.css', '.webmanifest', '.svg', '.yaml', '.yml', '.md']);
/** TODO kot beseda (velike črke) ali nadomestna domena iz siteUrl() (URL jo pretvori v male črke). */
const PATTERN = /\bTODO\b|todo-domena\.invalid/g;

const [distArg = 'dist', ...extra] = process.argv.slice(2);
const dist = resolve(distArg);

if (!existsSync(dist)) {
  console.error(`✗ ${distArg} ne obstaja – najprej zaženi build.`);
  process.exit(1);
}

const robots = join(dist, 'robots.txt');
if (existsSync(robots) && /^Disallow:\s*\/\s*$/m.test(await readFile(robots, 'utf8'))) {
  console.log(`↷ ${distArg} je preview build (robots.txt: Disallow: /) – TODO je dovoljen, preverjanje preskočeno.`);
  process.exit(0);
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (TEXT_EXTENSIONS.has(extname(entry.name))) yield path;
  }
}

let failures = 0;
async function check(file: string) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const match of line.matchAll(PATTERN)) {
      const from = Math.max(0, match.index - 40);
      const snippet = line.slice(from, match.index + 60).replace(/\s+/g, ' ').trim();
      console.error(`✗ ${relative(process.cwd(), file)}:${i + 1}  …${snippet}…`);
      failures++;
    }
  });
}

for await (const file of walk(dist)) await check(file);
for (const file of extra) {
  if (existsSync(file)) await check(resolve(file));
  else console.warn(`! ${file} ne obstaja, preskočeno`);
}

if (failures) {
  console.error(`\n${failures}× TODO v produkcijskem buildu ali podatkih. Izpolni manjkajoče (brief.yaml) ali zgradi kot preview (SITE_ENV=preview).`);
  process.exit(1);
}
console.log(`✓ brez TODO (${[distArg, ...extra].join(', ')})`);
