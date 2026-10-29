/**
 * Pred `playwright test`: zgradi core in playground za vsakega ponudnika (zaporedno, ker si buildi delijo cache).
 * Uporaba: node e2e/build.ts   (kliče ga `pnpm test:e2e`)
 */
import { execSync } from 'node:child_process';
import { BUILDS, outDir, type BuildName } from './builds.ts';

const run = (cmd: string, env: Record<string, string> = {}) =>
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });

run('pnpm --filter @e-visuals-studio/core build');
for (const [name, { env }] of Object.entries(BUILDS)) {
  console.log(`\n▶ playground: ${name}`);
  run(`pnpm --filter playground exec astro build --outDir ${outDir(name as BuildName)}`, env);
}
