// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import factory from '@e-visuals-studio/core/integration';

/**
 * Analitika iz okoljskih spremenljivk (glej .env.example) – v repozitoriju ni pravih ID-jev.
 * Primer: ANALYTICS_PROVIDER=umami UMAMI_SCRIPT_URL=… UMAMI_WEBSITE_ID=… pnpm build
 * @returns {import('@e-visuals-studio/core/integration').FactoryAnalyticsOptions}
 */
function analyticsFromEnv() {
  const env = process.env;
  switch (env.ANALYTICS_PROVIDER ?? 'none') {
    case 'umami':
      return { provider: 'umami', scriptUrl: env.UMAMI_SCRIPT_URL ?? '', websiteId: env.UMAMI_WEBSITE_ID ?? '' };
    case 'plausible':
      return { provider: 'plausible', scriptUrl: env.PLAUSIBLE_SCRIPT_URL ?? '', domain: env.PLAUSIBLE_DOMAIN ?? '' };
    case 'ga4':
      return {
        provider: 'ga4',
        measurementId: env.GA4_MEASUREMENT_ID ?? '',
        // TODO: angleška politika zasebnosti še ne obstaja, zato tudi EN banner kaže na slovensko.
        privacyHref: '/zasebnost/',
      };
    case 'none':
      return { provider: 'none' };
    default:
      throw new Error(`ANALYTICS_PROVIDER mora biti none, umami, plausible ali ga4, ne "${env.ANALYTICS_PROVIDER}".`);
  }
}

export default defineConfig({
  // Za Lighthouse lokalno: SITE_URL=http://localhost (canonical na isti domeni).
  site: process.env.SITE_URL ?? 'https://playground.e-visuals.si',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'sl',
    locales: ['sl', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    factory({
      siteName: 'Mizarstvo Primer',
      og: { tagline: 'Pohištvo po meri iz masivnega lesa' },
      fonts: {
        body: {
          name: 'Inter',
          provider: fontProviders.fontsource(),
          // Statični rezi namesto variabilnega fonta: latin-ext (šumniki) je tako ~35 KB namesto ~130 KB.
          weights: [400, 700],
          styles: ['normal'],
          subsets: ['latin', 'latin-ext'],
          fallbacks: ['system-ui', 'sans-serif'],
        },
      },
      rss: {
        collection: 'blog',
        title: 'Mizarstvo Primer – novice',
        description: 'Novice in nasveti mizarske delavnice Primer iz Kamnika.',
        basePath: '/blog/',
      },
      analytics: analyticsFromEnv(),
    }),
  ],
});
