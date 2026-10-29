// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import factory from '@e-visuals-studio/core/integration';

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
    }),
  ],
});
