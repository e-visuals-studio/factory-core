#!/usr/bin/env node
/**
 * factory-check-tokens [mapa ...]   (privzeto ./src)
 * Preveri, da so bloki, layouti in strani stilirani SAMO s tokeni.
 *
 * Pade ob: hex/rgb/hsl/oklch barvah, Tailwind arbitrary vrednostih (`p-[13px]`, `bg-[#fff]`),
 * privzetih Tailwind paletah (`bg-blue-500`, `text-white`) in inline `style` z barvami ali px.
 * Datoteke s tokeni (tokens.json) in generirani CSS niso preverjeni.
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const EXTENSIONS = new Set(['.astro', '.css', '.ts', '.tsx', '.svelte', '.vue', '.mdx']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.astro', 'tokens']);
const PALETTES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'barva v kodi (uporabi token)', pattern: /(?<![\w&])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b(?!['"]?\s*:)/gi },
  { name: 'barvna funkcija v kodi (uporabi token)', pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g },
  { name: 'Tailwind arbitrary vrednost (dodaj token)', pattern: /\b[a-z][\w-]*-\[[^\]\s]+\](?!:)/g },
  { name: 'privzeta Tailwind paleta (ni tokena)', pattern: new RegExp(`\\b[a-z-]+-(?:${PALETTES})-\\d{2,3}\\b|\\b(?:bg|text|border|fill|stroke|ring)-(?:white|black)\\b`, 'g') },
  { name: 'Tailwind statična širina (uporabi max-w-measure iz tokenov)', pattern: /\bmax-w-(?:prose|screen-\w+|\d?xs|\d?xl|sm|md|lg)\b/g },
  { name: 'inline style z vrednostjo (uporabi razred iz tokenov)', pattern: /style=["'{][^"'}]*(?:\d+px|#[0-9a-f]{3}|rgb)/gi },
];

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(entry.name))) yield path;
  }
}

/** Odstrani komentarje in JSON-LD/URL-je, ki lahko vsebujejo `#` brez pomena barve. */
function stripNoise(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p) => p + ' '.repeat(m.length - p.length))
    .replace(/href=["'][^"']*["']/g, (m) => ' '.repeat(m.length));
}

const dirs = process.argv.slice(2);
const roots = (dirs.length ? dirs : ['src']).map((d) => resolve(d));

let failures = 0;
for (const root of roots) {
  for await (const file of walk(root)) {
    const source = stripNoise(await readFile(file, 'utf8'));
    for (const rule of RULES) {
      for (const match of source.matchAll(rule.pattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        console.error(`✗ ${relative(process.cwd(), file)}:${line}  ${rule.name}: ${match[0]}`);
        failures++;
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} kršitev pravila "samo tokeni".`);
  process.exit(1);
}
console.log(`✓ samo tokeni (${roots.map((r) => relative(process.cwd(), r) || '.').join(', ')})`);
