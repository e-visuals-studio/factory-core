#!/usr/bin/env node
/**
 * factory-tokens [tokens.json] [--out theme.css]
 * Izpiše Tailwind temo iz tokenov in pade, če pari `on-*` nimajo kontrasta ≥ 4.5 : 1.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildThemeCss, checkContrast } from './build-tokens.ts';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? args.splice(outIndex, 2)[1] : undefined;
const input = resolve(args[0] ?? 'tokens.json');

const tokens = JSON.parse(await readFile(input, 'utf8'));
const issues = checkContrast(tokens);
for (const { foreground, background, ratio } of issues) {
  console.error(`✗ kontrast color.${foreground} na color.${background} je ${ratio} : 1 (min 4.5)`);
}

const css = buildThemeCss(tokens);
if (out) {
  await writeFile(out, css);
  console.error(`✓ ${out}`);
} else {
  process.stdout.write(css);
}
process.exitCode = issues.length ? 1 : 0;
