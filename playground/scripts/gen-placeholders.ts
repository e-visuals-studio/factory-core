/**
 * Generira placeholder slike (barvne ploskve z gradientom) – nikoli slik s spleta.
 * Barve so iz tokens.json, da se placeholderji ujemajo s temo.
 */
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const tokens = JSON.parse(await readFile(new URL('../tokens.json', import.meta.url), 'utf8'));
const c = (name: string) => tokens.color[name].$value as string;
const out = new URL('../src/assets/placeholders/', import.meta.url);
await mkdir(out, { recursive: true });

const images: Array<[string, number, number, string, string]> = [
  ['hero', 1600, 1200, c('primary'), c('accent')],
  ['about', 1200, 1200, c('surface-alt'), c('primary')],
  ['gallery-1', 1200, 900, c('accent'), c('surface-inverse')],
  ['gallery-2', 1200, 900, c('primary'), c('surface-alt')],
  ['gallery-3', 1200, 900, c('surface-inverse'), c('accent')],
  ['gallery-4', 1200, 900, c('border'), c('primary')],
  ['gallery-5', 1200, 900, c('accent'), c('surface-alt')],
  ['gallery-6', 1200, 900, c('primary'), c('surface-inverse')],
  ['blog-1', 1200, 675, c('primary'), c('border')],
  ['blog-2', 1200, 675, c('accent'), c('primary')],
  ['blog-3', 1200, 675, c('surface-inverse'), c('border')],
];

for (const [name, w, h, from, to] of images) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * 0.72}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.22}" fill="${to}" fill-opacity="0.35"/>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(new URL(`${name}.jpg`, out).pathname);
  console.log(`✓ ${name}.jpg`);
}
