/**
 * Skupni fixture za e2e teste analitike:
 * - nobena zahteva ne zapusti localhosta: zunanje zahteve se zabeležijo in prestrežejo
 *   (skripte ponudnikov dobijo stub, vse ostalo je prekinjeno), zato testi ne potrebujejo pravih ID-jev ne omrežja;
 * - klik na tel:/mailto: in oddaja obrazca ne navigirata (preventDefault v bubble fazi; sledenje je v capture fazi);
 * - `navigator.webdriver` je skrit (glej playwright.config.ts), sicer cookieconsent banner skrije pred "boti".
 */
import { test as base, expect } from '@playwright/test';

/** Stub Umami skripte: isti API, klici se shranijo v `window.__umamiCalls`. */
const UMAMI_STUB = 'window.__umamiCalls = []; window.umami = { track: (n, p) => window.__umamiCalls.push([n, p]) };';

export const test = base.extend<{ external: string[] }>({
  // auto: prestrezanje velja za vsak test in hook, tudi če `external` ne zahteva.
  external: [
    async ({ context }, use) => {
      const external: string[] = [];
      await context.route(/^https?:\/\/(?!localhost[:/])/, (route) => {
        const url = route.request().url();
        external.push(url);
        if (url.includes('umami.e2e.invalid')) return route.fulfill({ contentType: 'text/javascript', body: UMAMI_STUB });
        // gtag.js: prazen stub – dogodke beremo iz window.dataLayer, Google ne dobi ničesar.
        if (url.startsWith('https://www.googletagmanager.com/gtag/js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
        return route.abort();
      });
      await context.addInitScript(() => {
        document.addEventListener('click', (e) => {
          if ((e.target as Element).closest?.('a[href^="tel:"], a[href^="mailto:"]')) e.preventDefault();
        });
        document.addEventListener('submit', (e) => e.preventDefault());
      });
      await use(external);
    },
    { auto: true },
  ],
});

export { expect };
