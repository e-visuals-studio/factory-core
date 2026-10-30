/**
 * E2E testi analitike in privolitve (pnpm test:e2e). Buildi pripravi e2e/build.ts,
 * tu se samo zaženejo `astro preview` strežniki (en na ponudnika).
 * Chromium: CHROME_PATH (kot pri Lighthouse) ali `pnpm exec playwright install chromium`.
 */
import { defineConfig, devices } from '@playwright/test';
import { BUILDS, baseURL, outDir, type BuildName } from './e2e/builds.ts';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Pixel 7'],
        launchOptions: {
          ...(process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH }),
          // Brez tega je navigator.webdriver true in cookieconsent banner skrije (hideFromBots).
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },
  ],
  // --ignore-lock: Astro 7 pod AI agentom (Claude Code) preview sicer zažene v ozadju in se takoj vrne,
  // Playwright pa potrebuje strežnik v ospredju, ki ga ob koncu testov sam ustavi.
  webServer: (Object.keys(BUILDS) as BuildName[]).map((name) => ({
    command: `pnpm --filter playground exec astro preview --ignore-lock --outDir ${outDir(name)} --port ${BUILDS[name].port}`,
    url: `${baseURL(name)}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  })),
});
