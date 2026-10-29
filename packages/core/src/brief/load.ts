/**
 * Nalaganje brief.yaml: YAML → zod validacija → preverjanje slik v registru licenc.
 * Napaka ustavi build (in dev) s seznamom vseh težav, ne samo prve.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { briefSchema, isTodo, walk, type Brief, type BriefImage } from './schema.ts';

export interface LoadBriefOptions {
  /** Koren projekta (za poti do slik). Privzeto trenutna mapa. */
  root?: string;
  /** Register licenc, relativno na koren. Privzeto `assets.licenses.yaml`. */
  licenses?: string;
}

export interface LoadedBrief {
  brief: Brief;
  /** Poti do vrednosti s TODO, npr. `kontakt.telefon` (za izpis v logu). */
  todos: string[];
}

export class BriefError extends Error {
  constructor(file: string, issues: string[]) {
    super(`[factory] ${file} ni veljaven:\n  ${issues.join('\n  ')}`);
    this.name = 'BriefError';
  }
}

export async function loadBrief(file: string, options: LoadBriefOptions = {}): Promise<LoadedBrief> {
  const root = resolve(options.root ?? '.');
  const path = resolve(root, file);
  const label = relative(process.cwd(), path) || file;
  if (!existsSync(path)) throw new BriefError(label, [`datoteka ne obstaja (${path})`]);

  let raw: unknown;
  try {
    raw = parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new BriefError(label, [`neveljaven YAML: ${(error as Error).message}`]);
  }

  const result = briefSchema.safeParse(raw);
  if (!result.success) {
    throw new BriefError(
      label,
      result.error.issues.map((i) => `${i.path.join('.') || '(koren)'}: ${i.message}`),
    );
  }
  const brief = result.data;

  const imageIssues = await checkImageLicenses(briefImages(brief), root, options.licenses ?? 'assets.licenses.yaml');
  if (imageIssues.length) throw new BriefError(label, imageIssues);

  const todos: string[] = [];
  walk(brief, [], (value, p) => {
    if (isTodo(value)) todos.push(p.join('.'));
  });
  return { brief, todos };
}

/** Vse slike, ki jih brief uporablja (s potjo v briefu za sporočila o napakah). */
export function briefImages(brief: Brief): Array<{ path: string; image: BriefImage }> {
  return [
    ...Object.entries(brief.slike).map(([key, image]) => ({ path: `slike.${key}`, image })),
    ...brief.reference.map((ref, i) => ({ path: `reference.${i}.slika`, image: ref.slika })),
  ];
}

interface LicenseEntry {
  datoteka?: unknown;
  avtor?: unknown;
  vir?: unknown;
  licenca?: unknown;
}

const REQUIRED_LICENSE_FIELDS = ['avtor', 'vir', 'licenca'] as const;

/**
 * Vsaka slika iz briefa mora obstajati in imeti zapis v registru licenc z avtorjem, virom in licenco.
 * `datoteka` v registru je pot ali vzorec (`*` znotraj mape, `**` čez mape).
 */
export async function checkImageLicenses(
  images: Array<{ path: string; image: BriefImage }>,
  root: string,
  licensesFile: string,
): Promise<string[]> {
  if (images.length === 0) return [];
  const issues: string[] = [];
  const registerPath = resolve(root, licensesFile);
  let entries: LicenseEntry[] = [];
  if (!existsSync(registerPath)) {
    issues.push(`${licensesFile}: register licenc ne obstaja`);
  } else {
    const parsed = parse(await readFile(registerPath, 'utf8'));
    if (!Array.isArray(parsed)) issues.push(`${licensesFile}: pričakovan seznam zapisov`);
    else entries = parsed;
  }

  for (const { path, image } of images) {
    if (!existsSync(resolve(root, image.datoteka))) {
      issues.push(`${path}.datoteka: ${image.datoteka} ne obstaja`);
      continue;
    }
    const entry = entries.find((e) => typeof e?.datoteka === 'string' && globToRegExp(e.datoteka).test(image.datoteka));
    if (!entry) {
      issues.push(`${path}.datoteka: ${image.datoteka} nima zapisa v ${licensesFile}`);
      continue;
    }
    const missing = REQUIRED_LICENSE_FIELDS.filter((f) => typeof entry[f] !== 'string' || !(entry[f] as string).trim());
    if (missing.length) {
      issues.push(`${path}.datoteka: zapis za ${image.datoteka} v ${licensesFile} nima polj ${missing.join(', ')}`);
    }
  }
  return issues;
}

function globToRegExp(glob: string): RegExp {
  const source = glob
    .replace(/^\.\//, '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${source}$`);
}
