/**
 * Samodejna OG slika (1200×630 PNG) za strani in poste brez lastne slike.
 * satori pretvori besedilo v SVG poti z vgrajenim fontom (enak rezultat lokalno in v CI), sharp ga shrani kot PNG.
 * Barve pridejo iz tokenov (primary / on-primary / accent).
 */
import { readFile } from 'node:fs/promises';
import satori from 'satori';
import sharp from 'sharp';
import { OG_HEIGHT, OG_WIDTH } from './paths.ts';

export interface OgTheme {
  background: string;
  foreground: string;
  accent: string;
  /** Absolutne poti do .woff datotek (satori ne podpira woff2); `name` loči podmnožice (latin, latin-ext). */
  fonts: Array<{ name: string; path: string; weight: 400 | 700 }>;
}

export type OgContent = {
  title: string;
  eyebrow?: string;
  footer?: string;
};

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

let fontCache: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }>> | undefined;

export async function renderOgImage(content: OgContent, theme: OgTheme): Promise<Buffer> {
  fontCache ??= Promise.all(
    theme.fonts.map(async (font) => ({
      name: font.name,
      data: await readFile(font.path),
      weight: font.weight,
      style: 'normal' as const,
    })),
  );

  const titleSize = content.title.length > 70 ? 56 : content.title.length > 40 ? 68 : 80;
  const tree = h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      width: OG_WIDTH,
      height: OG_HEIGHT,
      padding: 80,
      background: theme.background,
      color: theme.foreground,
      // Satori ne preklaplja med datotekami z istim imenom, zato je vsaka podmnožica svoja družina.
      fontFamily: [...new Set(theme.fonts.map((f) => f.name))].join(', '),
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: 20 }, [
        h('div', { width: 56, height: 8, background: theme.accent, borderRadius: 4 }),
        h('div', { fontSize: 28, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }, content.eyebrow ?? ''),
      ]),
      h('div', { display: 'flex', width: '100%', fontSize: titleSize, fontWeight: 700, lineHeight: 1.1 }, content.title),
      h('div', { display: 'flex', fontSize: 28, opacity: 0.85 }, content.footer ?? ''),
    ],
  );

  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts: await fontCache });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
