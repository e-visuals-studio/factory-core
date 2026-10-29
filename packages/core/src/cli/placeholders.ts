#!/usr/bin/env node
/**
 * factory-placeholders [--tokens tokens.json] [--out src/assets/placeholders] [ime:ŠxV ...]
 *
 * Generira placeholder slike (barvni gradienti iz tokenov) – nikoli slik s spleta.
 * Brez naštetih slik generira privzeti nabor (hero, about, gallery-1..6, blog-1..3).
 */
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1]! : fallback;
};
const tokensFile = option('--tokens', 'tokens.json');
const out = resolve(option('--out', 'src/assets/placeholders'));

const tokens = JSON.parse(await readFile(resolve(tokensFile), 'utf8'));
const resolveColor = (name: string, depth = 0): string => {
  const value = tokens.color?.[name]?.$value;
  if (typeof value !== 'string') throw new Error(`${tokensFile}: manjka color.${name}`);
  const ref = /^\{color\.([\w-]+)\}$/.exec(value);
  return ref && depth < 5 ? resolveColor(ref[1]!, depth + 1) : value;
};

const PALETTE: Array<[string, string]> = [
  ['primary', 'accent'],
  ['surface-alt', 'primary'],
  ['accent', 'surface-inverse'],
  ['primary', 'surface-alt'],
  ['surface-inverse', 'accent'],
  ['border', 'primary'],
];
const DEFAULTS = [
  'hero:1600x1200', 'about:1200x1200',
  ...[1, 2, 3, 4, 5, 6].map((i) => `gallery-${i}:1200x900`),
  ...[1, 2, 3].map((i) => `blog-${i}:1200x675`),
];

await mkdir(out, { recursive: true });
for (const [index, spec] of (args.length ? args : DEFAULTS).entries()) {
  const match = /^([\w-]+):(\d+)x(\d+)$/.exec(spec);
  if (!match) throw new Error(`Neveljaven zapis "${spec}", pričakovano ime:ŠIRINAxVIŠINA (npr. hero:1600x1200).`);
  const [, name, w, h] = match as unknown as [string, string, string, string];
  const [from, to] = PALETTE[index % PALETTE.length]!.map((c) => resolveColor(c));
  const [width, height] = [Number(w), Number(h)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width * 0.72}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.22}" fill="${to}" fill-opacity="0.35"/>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(join(out, `${name}.jpg`));
  console.log(`✓ ${name}.jpg (${width}×${height})`);
}
