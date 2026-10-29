import type { Page } from '@playwright/test';
import { baseURL, GA4_ID } from './builds.ts';
import { expect, test } from './fixtures.ts';

test.use({ baseURL: baseURL('ga4') });

const GTAG = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
const dataLayer = (page: Page, kind: 'event' | 'consent') =>
  page.evaluate((k) => (window.dataLayer ?? []).filter((a: any) => a[0] === k).map((a: any) => [a[1], a[2]]), kind);
const banner = (page: Page) => page.locator('#cc-main .cm');

test('pred privolitvijo: consent denied, banner viden, nobene zahteve na Google', async ({ page, external }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText('Piškotki');
  expect(await dataLayer(page, 'consent')).toEqual([
    [
      'default',
      { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 },
    ],
  ]);
  // Dogodek brez privolitve se zavrže (ne čaka v dataLayer).
  await page.locator('#kontakt a[href^="tel:"]').click();
  expect(await dataLayer(page, 'event')).toEqual([]);
  expect(external).toEqual([]);
});

test('po privolitvi: gtag.js naložen, dogodki gredo v GA4', async ({ page, external }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await banner(page).getByRole('button', { name: 'Sprejmi vse' }).click();
  await expect(banner(page)).toBeHidden();
  await expect.poll(() => external).toEqual([GTAG]);
  expect((await dataLayer(page, 'consent')).at(-1)).toEqual(['update', { analytics_storage: 'granted' }]);

  await page.locator('#kontakt a[href^="mailto:"]').click();
  expect(await dataLayer(page, 'event')).toEqual([['generate_lead', { method: 'email' }]]);

  // Privolitev velja tudi na naslednji strani: brez bannerja, gtag.js takoj.
  external.length = 0;
  await page.goto('/blog/', { waitUntil: 'networkidle' });
  await expect(banner(page)).toBeHidden();
  expect(external).toEqual([GTAG]);
});

test('preklic v »Nastavitve piškotkov«: denied, piškotki _ga izbrisani, gtag.js se ne naloži več', async ({ page, context, external }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await banner(page).getByRole('button', { name: 'Sprejmi vse' }).click();
  // gtag.js je stub, zato piškotke, ki bi jih postavil GA, postavimo sami.
  await context.addCookies(
    ['_ga', `_ga_${GA4_ID.slice(2)}`].map((name) => ({ name, value: 'GA1.1.1.1', domain: 'localhost', path: '/' })),
  );

  await page.getByRole('button', { name: 'Nastavitve piškotkov' }).click();
  const prefs = page.locator('#cc-main .pm');
  await expect(prefs).toBeVisible();
  await prefs.getByRole('button', { name: 'Samo nujni' }).click();
  await expect(prefs).toBeHidden();

  expect((await dataLayer(page, 'consent')).at(-1)).toEqual(['update', { analytics_storage: 'denied' }]);
  expect((await context.cookies()).map((c) => c.name).filter((n) => n.startsWith('_ga'))).toEqual([]);

  external.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  await expect(banner(page)).toBeHidden();
  await page.locator('#kontakt a[href^="tel:"]').click();
  expect(await dataLayer(page, 'event')).toEqual([]);
  expect(external).toEqual([]);
});

test('angleški banner in gumb v footerju', async ({ page, external }) => {
  await page.goto('/en/', { waitUntil: 'networkidle' });
  await expect(banner(page)).toBeVisible();
  await expect(banner(page)).toContainText('Cookies');
  await expect(banner(page).getByRole('button', { name: 'Accept all' })).toBeVisible();
  await expect(banner(page).getByRole('button', { name: 'Necessary only' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cookie settings' })).toBeVisible();
  expect(external).toEqual([]);
});
