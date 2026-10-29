import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sitemap, { type SitemapOptions } from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';
import type { OgTheme } from './og/render.ts';
import { detectSiteEnv } from './preview.ts';
import { buildThemeCss, checkContrast, resolveColorToken } from './tokens/build-tokens.ts';

type AstroFontFamily = NonNullable<import('astro').AstroUserConfig['fonts']>[number];

/** Astro font family brez `cssVariable` – tega določi vloga (`--factory-font-<vloga>`). */
export type FactoryFont = Omit<AstroFontFamily, 'cssVariable'>;

export interface FactoryRssOptions {
  /** Ime content kolekcije, npr. `blog`. */
  collection: string;
  title: string;
  description: string;
  /** Pot, pod katero so posti, npr. `/blog/`. */
  basePath?: string;
}

export interface FactoryOgOptions {
  /** Slogan na privzeti OG sliki (`/og/default.png`). */
  tagline?: string;
  /** Kolekcije, za katere se generira OG slika postov brez lastne slike. Privzeto kolekcija iz `rss`. */
  collections?: string[];
}

/**
 * Analitika. Privzeto `none` (0 B JavaScripta). Umami in Plausible sta brez piškotkov, zato brez bannerja;
 * GA4 samo kot izjema (zapis v EXCEPTIONS.md) – z bannerjem in Google Consent Mode v2.
 * Skripte se naložijo samo v produkcijskem buildu, nikoli v `astro dev`.
 */
export type FactoryAnalyticsOptions =
  | { provider: 'none' }
  | {
      provider: 'umami';
      /** URL sledilne skripte, npr. `https://analytics.e-visuals.si/script.js`. */
      scriptUrl: string;
      /** UUID strani v Umami. */
      websiteId: string;
    }
  | {
      provider: 'plausible';
      /** URL sledilne skripte, npr. `https://plausible.io/js/script.js`. */
      scriptUrl: string;
      /** Domena strani, kot je vpisana v Plausible. */
      domain: string;
    }
  | {
      provider: 'ga4';
      /** GA4 Measurement ID, npr. `G-XXXXXXXXXX`. */
      measurementId: string;
      /** Povezava na politiko zasebnosti v bannerju; niz ali po jezikih (`{ sl: '/zasebnost/', en: '/en/privacy/' }`). */
      privacyHref?: string | Record<string, string>;
    };

export interface FactoryOptions {
  /** Ime strani (na samodejnih OG slikah). */
  siteName?: string;
  /** Pot do tokens.json, relativno na koren projekta. Privzeto `tokens.json`, sicer privzeta tema iz core. */
  tokens?: string;
  /** Fonti po vlogah (`body`, `heading`). Self-hostani prek Astro Fonts API. */
  fonts?: Partial<Record<'body' | 'heading', FactoryFont>>;
  /** Vlogi fontov, za kateri se doda `<link rel="preload">`. Privzeto samo `body`. */
  preloadFonts?: Array<'body' | 'heading'>;
  /** Samodejne OG slike na `/og/…` (1200×630 PNG v barvah tokenov), ali `false` za izklop. */
  og?: FactoryOgOptions | false;
  /** RSS na `/rss.xml`. */
  rss?: FactoryRssOptions | false;
  /** Dodatne nastavitve za @astrojs/sitemap, ali `false` za izklop. */
  sitemap?: SitemapOptions | false;
  /** robots.txt: poti, ki jih iskalniki ne indeksirajo, ali `noindex: true` za preview okolja. */
  robots?: { disallow?: string[]; noindex?: boolean };
  /** Analitika (Umami, Plausible ali GA4 s privolitvijo). Privzeto `{ provider: 'none' }`. */
  analytics?: FactoryAnalyticsOptions;
  /**
   * Preview build: robots.txt `Disallow: /`, `<meta name="robots" content="noindex">` na vseh straneh in brez analitike.
   * Privzeto iz okolja (`SITE_ENV`, sicer branch iz `CF_PAGES_BRANCH`/`GITHUB_REF_NAME`; vse razen `main` je preview).
   */
  preview?: boolean;
}

/** Konfiguracija, ki jo komponente preberejo iz `virtual:factory/config`. */
export interface FactoryRuntimeConfig {
  fontRoles: string[];
  preloadFonts: string[];
  rss: FactoryRssOptions | false;
  og: { siteName: string; tagline?: string; host: string; collections: string[]; theme: OgTheme } | false;
  robots: { disallow: string[]; noindex: boolean };
  preview: boolean;
  i18n: { defaultLocale: string; locales: string[] } | null;
  /** `enabled` je `true` samo v produkcijskem buildu (`astro build`). */
  analytics: FactoryAnalyticsOptions & { enabled: boolean };
}

const PACKAGE_ROOT = new URL('../', import.meta.url);
const CONFIG_ID = 'virtual:factory/config';
const THEME_ID = 'virtual:factory/theme.css';
const ANALYTICS_ID = 'virtual:factory/analytics';
const ANALYTICS_COMPONENTS = { none: 'None', umami: 'Umami', plausible: 'Plausible', ga4: 'Ga4' } as const;

export default function factory(options: FactoryOptions = {}): AstroIntegration {
  const fontRoles = Object.keys(options.fonts ?? {});
  let themeFile = '';
  let runtimeConfig: FactoryRuntimeConfig;

  return {
    name: '@e-visuals-studio/core',
    hooks: {
      'astro:config:setup': async ({ command, config, updateConfig, injectRoute, addWatchFile, createCodegenDir, logger }) => {
        if (!config.site) {
          throw new Error('[factory] `site` v astro.config je obvezen (canonical, OG, sitemap, RSS).');
        }

        // 1) Tokeni → tema za Tailwind
        const tokensUrl = new URL(options.tokens ?? 'tokens.json', config.root);
        const source = existsSync(tokensUrl) ? tokensUrl : new URL('tokens.default.json', PACKAGE_ROOT);
        if (source !== tokensUrl) logger.info('tokens.json ni najden, uporabljam privzeto temo iz core.');
        addWatchFile(source);

        const tokens = JSON.parse(await readFile(source, 'utf8'));
        const issues = checkContrast(tokens);
        if (issues.length) {
          const list = issues.map((i) => `color.${i.foreground} na color.${i.background}: ${i.ratio} : 1`).join('\n  ');
          throw new Error(`[factory] Premajhen kontrast v tokenih (min 4.5 : 1):\n  ${list}`);
        }

        const codegenDir = createCodegenDir();
        await mkdir(codegenDir, { recursive: true });
        themeFile = fileURLToPath(new URL('theme.css', codegenDir));
        await writeFile(themeFile, entryCss(buildThemeCss(tokens, { fontRoles }), fileURLToPath(config.srcDir)));

        // 2) Preview ali produkcija
        const siteEnv = detectSiteEnv();
        const preview = options.preview ?? siteEnv.env === 'preview';
        logger.info(
          preview
            ? `Preview build (${options.preview === undefined ? siteEnv.reason : 'factory({ preview })'}): noindex, brez analitike.`
            : `Produkcijski build (${options.preview === undefined ? siteEnv.reason : 'factory({ preview })'}).`,
        );

        // 3) Konfiguracija za komponente
        const i18n = config.i18n
          ? {
              defaultLocale: config.i18n.defaultLocale,
              locales: config.i18n.locales.map((l) => (typeof l === 'string' ? l : l.path)),
            }
          : null;
        runtimeConfig = {
          fontRoles,
          preloadFonts: options.preloadFonts ?? fontRoles.filter((r) => r === 'body'),
          rss: options.rss ?? false,
          og:
            options.og === false
              ? false
              : {
                  siteName: options.siteName ?? new URL(config.site).hostname,
                  tagline: options.og?.tagline,
                  host: new URL(config.site).hostname,
                  collections: options.og?.collections ?? (options.rss ? [options.rss.collection] : []),
                  theme: {
                    background: resolveColorToken(tokens, 'primary') ?? 'black',
                    foreground: resolveColorToken(tokens, 'on-primary') ?? 'white',
                    accent: resolveColorToken(tokens, 'accent') ?? resolveColorToken(tokens, 'on-primary') ?? 'white',
                    fonts: (['latin', 'latin-ext'] as const).flatMap((subset) =>
                      ([400, 700] as const).map((weight) => ({
                        name: subset === 'latin' ? 'Inter' : 'Inter Ext',
                        weight,
                        path: fileURLToPath(import.meta.resolve(`@fontsource/inter/files/inter-${subset}-${weight}-normal.woff`)),
                      })),
                    ),
                  },
                },
          robots: { disallow: options.robots?.disallow ?? [], noindex: preview || (options.robots?.noindex ?? false) },
          preview,
          i18n,
          // Preview nikoli ne meri obiskov (ne pokvari statistike in ne potrebuje privolitve).
          analytics: preview
            ? { provider: 'none', enabled: false }
            : { ...validateAnalytics(options.analytics), enabled: command === 'build' },
        };
        if (runtimeConfig.analytics.provider !== 'none') {
          logger.info(
            `Analitika: ${runtimeConfig.analytics.provider}` +
              (runtimeConfig.analytics.enabled ? '' : ' (v dev načinu se ne naloži)'),
          );
        }

        // 4) Sitemap (z hreflang, če je vklopljen i18n), robots.txt, RSS
        const integrations: AstroIntegration[] = [];
        if (options.sitemap !== false) {
          integrations.push(
            sitemap({
              ...(i18n && {
                i18n: {
                  defaultLocale: i18n.defaultLocale,
                  locales: Object.fromEntries(i18n.locales.map((l) => [l, l])),
                },
              }),
              filter: (page) => !/\/(404|admin)\/?$/.test(new URL(page).pathname),
              ...options.sitemap,
            }),
          );
        }
        injectRoute({ pattern: '/robots.txt', entrypoint: new URL('src/routes/robots.txt.ts', PACKAGE_ROOT), prerender: true });
        if (options.og !== false) {
          injectRoute({ pattern: '/og/[...slug].png', entrypoint: new URL('src/routes/og.ts', PACKAGE_ROOT), prerender: true });
        }
        if (options.rss) {
          injectRoute({ pattern: '/rss.xml', entrypoint: new URL('src/routes/rss.xml.ts', PACKAGE_ROOT), prerender: true });
        }

        updateConfig({
          // CSS iz tokenov je majhen (~5 KB gzip): inline odstrani render-blocking zahtevo (kritični CSS).
          ...(config.build.inlineStylesheets === 'auto' && { build: { inlineStylesheets: 'always' } }),
          integrations,
          fonts: Object.entries(options.fonts ?? {}).map(([role, font]) => ({
            ...font,
            cssVariable: `--factory-font-${role}`,
          })) as AstroFontFamily[],
          vite: {
            plugins: [tailwindcss(), virtualModules(() => runtimeConfig, () => themeFile)],
          },
        });
      },

      'astro:config:done': ({ injectTypes }) => {
        injectTypes({
          filename: 'types.d.ts',
          content:
            `declare module '${CONFIG_ID}' {\n  const config: import('@e-visuals-studio/core/integration').FactoryRuntimeConfig;\n  export default config;\n}\n` +
            `declare module '${ANALYTICS_ID}' {\n  const Provider: (props: Record<string, unknown>) => unknown;\n  export default Provider;\n}\n`,
        });
      },
    },
  };
}

/** Preveri nastavitve analitike, da napačen ID ne pride tiho v produkcijo. */
function validateAnalytics(analytics: FactoryAnalyticsOptions = { provider: 'none' }): FactoryAnalyticsOptions {
  const fail = (message: string): never => {
    throw new Error(`[factory] analytics (${analytics.provider}): ${message}`);
  };
  const checkScriptUrl = (url: string) => {
    // Absoluten https URL ali pot na isti domeni (npr. proxy prek Workerja).
    if (!/^(https:\/\/[^\s/]+\/|\/(?!\/))\S*$/.test(url ?? '')) fail(`scriptUrl mora biti https URL ali pot, ki se začne z /, ne "${url}".`);
  };
  switch (analytics.provider) {
    case 'none':
      return analytics;
    case 'umami':
      checkScriptUrl(analytics.scriptUrl);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(analytics.websiteId ?? '')) {
        fail(`websiteId mora biti UUID, ne "${analytics.websiteId}".`);
      }
      return analytics;
    case 'plausible':
      checkScriptUrl(analytics.scriptUrl);
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(analytics.domain ?? '')) fail(`domain mora biti domena brez protokola, ne "${analytics.domain}".`);
      return analytics;
    case 'ga4':
      if (!/^G-[A-Z0-9]+$/.test(analytics.measurementId ?? '')) fail(`measurementId mora biti oblike G-XXXXXXXXXX, ne "${analytics.measurementId}".`);
      return analytics;
    default:
      return fail(`neznan ponudnik; dovoljeni so umami, plausible, ga4 in none.`);
  }
}

/** Vstopni CSS: Tailwind + tema iz tokenov + osnovni stili core; viri za skeniranje razredov so našteti izrecno. */
function entryCss(theme: string, srcDir: string): string {
  const tailwind = fileURLToPath(import.meta.resolve('tailwindcss/index.css'));
  const coreSrc = fileURLToPath(new URL('src/', PACKAGE_ROOT));
  return [
    `@import ${JSON.stringify(tailwind)} source(none);`,
    `@source ${JSON.stringify(srcDir)};`,
    `@import ${JSON.stringify(coreSrc + 'styles/base.css')};`,
    `@source ${JSON.stringify(coreSrc)};`,
    theme,
    '',
  ].join('\n');
}

function virtualModules(getConfig: () => FactoryRuntimeConfig, getThemeFile: () => string) {
  const resolvedConfigId = '\0' + CONFIG_ID;
  return {
    name: 'factory:virtual',
    resolveId(id: string) {
      if (id === CONFIG_ID) return resolvedConfigId;
      // Tema je prava datoteka, da jo Tailwind obdela kot vsak drug CSS.
      if (id === THEME_ID) return getThemeFile();
      // Samo izbrani ponudnik pride v graf uvozov: brez tega bi CSS bannerja (GA4) in skripte
      // vseh ponudnikov končali v buildu tudi pri `none`.
      if (id === ANALYTICS_ID) {
        const { provider, enabled } = getConfig().analytics;
        const component = ANALYTICS_COMPONENTS[enabled ? provider : 'none'];
        return fileURLToPath(new URL(`src/analytics/providers/${component}.astro`, PACKAGE_ROOT));
      }
      return undefined;
    },
    load(id: string) {
      if (id === resolvedConfigId) return `export default ${JSON.stringify(getConfig())};`;
      return undefined;
    },
  };
}
