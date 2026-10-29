/**
 * Buildi playgrounda za e2e teste: en na ponudnika, vsak v svoji mapi in na svojem portu.
 * Vse vrednosti so lažne; skripte ponudnikov so na domeni .invalid in jih testi prestrežejo (glej fixtures.ts).
 */
export const UMAMI_SCRIPT_URL = 'https://umami.e2e.invalid/script.js';
export const GA4_ID = 'G-E2ETEST000';

// SITE_ENV=production: na CI (GITHUB_REF_NAME ≠ main) bi bil build sicer preview, ta pa izklopi analitiko.
export const BUILDS = {
  none: { port: 4401, env: { SITE_ENV: 'production', ANALYTICS_PROVIDER: 'none' } },
  umami: {
    port: 4402,
    env: {
      SITE_ENV: 'production',
      ANALYTICS_PROVIDER: 'umami',
      UMAMI_SCRIPT_URL,
      UMAMI_WEBSITE_ID: '00000000-0000-0000-0000-000000000000',
    },
  },
  ga4: { port: 4403, env: { SITE_ENV: 'production', ANALYTICS_PROVIDER: 'ga4', GA4_MEASUREMENT_ID: GA4_ID } },
} as const;

export type BuildName = keyof typeof BUILDS;

/** Mapa z buildom, relativno na playground/. */
export const outDir = (name: BuildName) => `dist-e2e/${name}`;
export const baseURL = (name: BuildName) => `http://localhost:${BUILDS[name].port}`;
