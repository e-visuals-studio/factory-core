/**
 * tokens.json → CSS za Tailwind 4.
 *
 * Vhod je DTCG format (Figma Variables, Tokens Studio): skupine z listi `{ "$value", "$type" }`.
 * Podprt je tudi starejši Tokens Studio zapis brez `$` (`value`, `type`) in reference `{color.primary}`.
 *
 * Izhod je blok `@theme static`, ki najprej ponastavi privzete Tailwind palete (`--color-*: initial` …).
 * Tako razred, ki ne izhaja iz tokena (npr. `bg-blue-500`), sploh ne obstaja.
 */

export type TokenValue = string | number | string[];

export interface FlatToken {
  /** Pot v tokens.json, npr. `["color", "on-primary"]`. */
  path: string[];
  /** CSS spremenljivka, npr. `--color-on-primary`. */
  cssVar: string;
  value: TokenValue;
  type?: string;
}

export interface BuildThemeOptions {
  /**
   * Vloge fontov, ki jih naloži Astro Fonts API (npr. `body`, `heading`).
   * Za te vloge `--font-<vloga>` najprej uporabi `var(--factory-font-<vloga>)`.
   */
  fontRoles?: string[];
}

export interface ContrastIssue {
  foreground: string;
  background: string;
  ratio: number;
}

/** Skupina v tokens.json → Tailwind 4 namespace. */
const NAMESPACES: Record<string, string> = {
  color: 'color',
  font: 'font',
  text: 'text',
  'font-weight': 'font-weight',
  leading: 'leading',
  tracking: 'tracking',
  spacing: 'spacing',
  radius: 'radius',
  shadow: 'shadow',
  container: 'container',
  breakpoint: 'breakpoint',
  ease: 'ease',
  duration: 'duration',
};

/** Namespaci, ki se vedno ponastavijo: design brez teh tokenov ne sme dobiti Tailwindovih privzetih vrednosti. */
const ALWAYS_RESET = ['color', 'font', 'text', 'radius', 'shadow', 'inset-shadow', 'drop-shadow', 'text-shadow'];

/** Namespaci, ki se ponastavijo le, če jih tokeni definirajo (sicer ostanejo razumne Tailwind privzete vrednosti). */
const RESET_IF_DEFINED = ['font-weight', 'leading', 'tracking', 'container', 'breakpoint', 'ease'];

/** Skupine tokenov, ki ne gredo v CSS (meta podatki). */
const IGNORED_GROUPS = new Set(['$schema', '$description', '$metadata', '$themes']);

const MIN_CONTRAST = 4.5;

type TokenNode = Record<string, unknown>;

function isToken(node: unknown): node is TokenNode {
  return typeof node === 'object' && node !== null && ('$value' in node || 'value' in node);
}

export function flattenTokens(tokens: TokenNode): FlatToken[] {
  const out: FlatToken[] = [];

  const walk = (node: unknown, path: string[]) => {
    if (isToken(node)) {
      const value = (node.$value ?? node.value) as TokenValue;
      const type = (node.$type ?? node.type) as string | undefined;
      out.push({ path, cssVar: toCssVar(path), value, type });
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || IGNORED_GROUPS.has(key)) continue;
      walk(child, [...path, key]);
    }
  };

  walk(tokens, []);
  return out;
}

function toCssVar(path: string[]): string {
  const [group, ...rest] = path;
  const namespace = NAMESPACES[group] ?? group;
  // `spacing.base` je Tailwindov množitelj `--spacing` (p-4 = 4 × base).
  if (group === 'spacing' && rest.length === 1 && rest[0] === 'base') return '--spacing';
  return `--${[namespace, ...rest].map(kebab).join('-')}`;
}

function kebab(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_/.]+/g, '-')
    .toLowerCase();
}

const REFERENCE = /\{([^}]+)\}/g;

function formatValue(token: FlatToken): string {
  const { value, type } = token;
  if (Array.isArray(value)) {
    return value.map((family) => (/[\s]/.test(family) && !/^["']/.test(family) ? `"${family}"` : family)).join(', ');
  }
  const str = String(value);
  if (type === 'fontFamily' && !str.includes(',') && /\s/.test(str)) return `"${str}"`;
  // Reference `{color.primary}` → `var(--color-primary)`
  return str.replace(REFERENCE, (_, ref: string) => `var(${toCssVar(ref.split('.'))})`);
}

export function buildThemeCss(tokens: TokenNode, options: BuildThemeOptions = {}): string {
  const flat = flattenTokens(tokens);
  const definedGroups = new Set(flat.map((t) => NAMESPACES[t.path[0]] ?? t.path[0]));
  const fontRoles = new Set(options.fontRoles ?? []);

  const resets = [
    ...ALWAYS_RESET,
    ...RESET_IF_DEFINED.filter((ns) => definedGroups.has(ns)),
  ].map((ns) => `  --${ns}-*: initial;`);

  const lines = flat.map((token) => {
    let value = formatValue(token);
    const role = token.path[0] === 'font' ? token.path.slice(1).join('-') : undefined;
    if (role && fontRoles.has(role)) value = `var(--factory-font-${role}), ${value}`;
    return `  ${token.cssVar}: ${value};`;
  });

  // Preflight Tailwinda bere te spremenljivke; brez njih bi ostal privzeti sans/mono.
  const defaults: string[] = [];
  if (flat.some((t) => t.cssVar === '--font-body')) defaults.push('  --default-font-family: var(--font-body);');
  if (flat.some((t) => t.cssVar === '--font-mono')) defaults.push('  --default-mono-font-family: var(--font-mono);');

  return [
    '/* Generirano iz tokens.json z @e-visuals-studio/core – ne urejaj ročno. */',
    '@theme static {',
    ...resets,
    ...defaults,
    ...lines,
    '}',
    '',
  ].join('\n');
}

/* ---------- Kontrast (WCAG 2.1 AA) ---------- */

function resolveColor(name: string, colors: Map<string, string>, depth = 0): string | undefined {
  const raw = colors.get(name);
  if (!raw || depth > 10) return undefined;
  const ref = /^\{color\.(.+)\}$/.exec(raw.trim());
  return ref ? resolveColor(ref[1].split('.').join('-'), colors, depth + 1) : raw;
}

function hexToRgb(hex: string): [number, number, number] | undefined {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return undefined;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number | undefined {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return undefined;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Preveri pare `on-<ozadje>` proti `<ozadje>`. Za `on-surface-muted` se uporabi najdaljše obstoječe ozadje
 * (`surface-muted`, sicer `surface`). Barve, ki niso hex, se preskočijo.
 */
export function checkContrast(tokens: TokenNode, min = MIN_CONTRAST): ContrastIssue[] {
  const colors = new Map(
    flattenTokens(tokens)
      .filter((t) => t.path[0] === 'color')
      .map((t) => [t.path.slice(1).join('-'), String(t.value)]),
  );

  const issues: ContrastIssue[] = [];
  for (const name of colors.keys()) {
    if (!name.startsWith('on-')) continue;
    const parts = name.slice(3).split('-');
    let background: string | undefined;
    for (let i = parts.length; i > 0 && !background; i--) {
      const candidate = parts.slice(0, i).join('-');
      if (colors.has(candidate)) background = candidate;
    }
    if (!background) continue;
    const fg = resolveColor(name, colors);
    const bg = resolveColor(background, colors);
    const ratio = fg && bg ? contrastRatio(fg, bg) : undefined;
    if (ratio !== undefined && ratio < min) {
      issues.push({ foreground: name, background, ratio: Math.round(ratio * 100) / 100 });
    }
  }
  return issues;
}
