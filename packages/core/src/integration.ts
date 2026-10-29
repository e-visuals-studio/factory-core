import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sitemap, { type SitemapOptions } from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';
import { buildThemeCss, checkContrast } from './tokens/build-tokens.ts';

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

export interface FactoryOptions {
  /** Pot do tokens.json, relativno na koren projekta. Privzeto `tokens.json`, sicer privzeta tema iz core. */
  tokens?: string;
  /** Fonti po vlogah (`body`, `heading`). Self-hostani prek Astro Fonts API. */
  fonts?: Partial<Record<'body' | 'heading', FactoryFont>>;
  /** Vlogi fontov, za kateri se doda `<link rel="preload">`. Privzeto samo `body`. */
  preloadFonts?: Array<'body' | 'heading'>;
  /** RSS na `/rss.xml`. */
  rss?: FactoryRssOptions | false;
  /** Dodatne nastavitve za @astrojs/sitemap, ali `false` za izklop. */
  sitemap?: SitemapOptions | false;
  /** robots.txt: poti, ki jih iskalniki ne indeksirajo, ali `noindex: true` za preview okolja. */
  robots?: { disallow?: string[]; noindex?: boolean };
}

/** Konfiguracija, ki jo komponente preberejo iz `virtual:factory/config`. */
export interface FactoryRuntimeConfig {
  fontRoles: string[];
  preloadFonts: string[];
  rss: FactoryRssOptions | false;
  robots: { disallow: string[]; noindex: boolean };
  i18n: { defaultLocale: string; locales: string[] } | null;
}

const PACKAGE_ROOT = new URL('../', import.meta.url);
const CONFIG_ID = 'virtual:factory/config';
const THEME_ID = 'virtual:factory/theme.css';

export default function factory(options: FactoryOptions = {}): AstroIntegration {
  const fontRoles = Object.keys(options.fonts ?? {});
  let themeFile = '';
  let runtimeConfig: FactoryRuntimeConfig;

  return {
    name: '@e-visuals-studio/core',
    hooks: {
      'astro:config:setup': async ({ config, updateConfig, injectRoute, addWatchFile, createCodegenDir, logger }) => {
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

        // 2) Konfiguracija za komponente
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
          robots: { disallow: options.robots?.disallow ?? [], noindex: options.robots?.noindex ?? false },
          i18n,
        };

        // 3) Sitemap (z hreflang, če je vklopljen i18n), robots.txt, RSS
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
          content: `declare module '${CONFIG_ID}' {\n  const config: import('@e-visuals-studio/core/integration').FactoryRuntimeConfig;\n  export default config;\n}\n`,
        });
      },
    },
  };
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
      return undefined;
    },
    load(id: string) {
      if (id === resolvedConfigId) return `export default ${JSON.stringify(getConfig())};`;
      return undefined;
    },
  };
}
