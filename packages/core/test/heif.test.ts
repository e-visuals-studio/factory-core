import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'astro/zod';
import sharp from 'sharp';
import { briefSchema } from '../src/brief/index.ts';
import { licensedImageSchema } from '../src/content.ts';
import { assertNotHeif, heifBrand } from '../src/image/heif.ts';
import { parse } from 'yaml';
import { readFile } from 'node:fs/promises';

/** ISO-BMFF `ftyp` škatla z glavno in združljivimi znamkami. */
const ftyp = (major: string, ...compatible: string[]) => {
  const brands = [major, '\0\0\0\0', ...compatible].join('');
  const size = 8 + brands.length;
  const box = Buffer.alloc(size + 16);
  box.writeUInt32BE(size, 0);
  box.write('ftyp', 4, 'latin1');
  box.write(brands, 8, 'latin1');
  return box;
};

const pixel = () => sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 120, g: 80, b: 40 } } });

describe('heifBrand', () => {
  it('prepozna pravi AVIF (sharp) ne glede na končnico', async () => {
    const avif = await pixel().avif().toBuffer();
    assert.equal(heifBrand(avif), 'avif');
    assert.throws(() => assertNotHeif(avif, 'src/assets/preimenovana.jpg'), /preimenovana\.jpg.*GHSA-26w7-cxv4-gfx2/);
  });

  it('prepozna HEIC (iPhone) in splošni HEIF prek združljive znamke', () => {
    assert.equal(heifBrand(ftyp('heic', 'mif1', 'heic')), 'heic');
    assert.equal(heifBrand(ftyp('isom', 'mif1')), 'mif1');
  });

  it('sprejme JPG, PNG, WebP, GIF, SVG in MP4', async () => {
    for (const format of ['jpeg', 'png', 'webp', 'gif'] as const) {
      assert.equal(heifBrand(await pixel().toFormat(format).toBuffer()), null, format);
    }
    assert.equal(heifBrand(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')), null);
    assert.equal(heifBrand(ftyp('isom', 'iso2', 'mp41')), null);
    assert.equal(heifBrand(new Uint8Array(4)), null);
  });
});

describe('zavrnitev AVIF/HEIC v shemah', () => {
  it('brief: slika .avif ali .heic pade z jasno napako', async () => {
    const brief = parse(await readFile(new URL('./fixtures/brief-todo.yaml', import.meta.url), 'utf8'));
    for (const datoteka of ['src/assets/hero.avif', 'src/assets/IMG_0001.HEIC']) {
      brief.slike.hero.datoteka = datoteka;
      const result = briefSchema.safeParse(brief);
      assert.equal(result.success, false);
      const messages = result.error!.issues.filter((i) => i.path.join('.') === 'slike.hero.datoteka').map((i) => i.message);
      assert.equal(messages.length, 1, messages.join(' | '));
      assert.match(messages[0]!, /ni dovoljen kot vhodna slika.*Pretvori jo v JPG, PNG ali WebP/);
    }
  });

  it('content: licensedImageSchema zavrne AVIF in HEIC, sprejme JPG', () => {
    const schema = licensedImageSchema({ image: () => z.string() } as never);
    const entry = (src: string) => ({ src, alt: 'Delavnica', avtor: 'Stranka', vir: 'stranka', licenca: 'lastna' });
    for (const src of ['__ASTRO_IMAGE_./slika.avif', '__ASTRO_IMAGE_./IMG_0001.heic']) {
      const result = schema.safeParse(entry(src));
      assert.equal(result.success, false, src);
      assert.match(result.error!.issues[0]!.message, /ni dovoljen kot vhodna slika/);
      assert.doesNotMatch(result.error!.issues[0]!.message, /__ASTRO_IMAGE_/);
    }
    assert.equal(schema.safeParse(entry('__ASTRO_IMAGE_./slika.jpg')).success, true);
  });
});
