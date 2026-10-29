import { baseURL, UMAMI_SCRIPT_URL } from './builds.ts';
import { expect, test } from './fixtures.ts';

test.use({ baseURL: baseURL('umami') });

const calls = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__umamiCalls);

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  // Skripta je defer, zato je stub po goto že izveden; poll samo za varnost.
  await expect.poll(() => calls(page)).toEqual([]);
});

test('naloži skripto ponudnika (defer), brez bannerja', async ({ page, external }) => {
  await expect(page.locator(`script[src="${UMAMI_SCRIPT_URL}"]`)).toHaveAttribute('defer', '');
  await expect(page.locator('#cc-main')).toHaveCount(0);
  await expect(page.locator('footer [data-cc]')).toHaveCount(0);
  expect(external).toEqual([UMAMI_SCRIPT_URL]);
});

test('generate_lead za telefon, e-pošto in samodejno zaznan tel: brez atributa', async ({ page }) => {
  await page.locator('#kontakt a[href^="tel:"]').click();
  await page.locator('#kontakt a[href^="mailto:"]').click();
  // Povezava v footerju nima data-track: zazna se po tel: protokolu.
  const footerTel = page.locator('footer a[href^="tel:"]');
  await expect(footerTel).not.toHaveAttribute('data-track');
  await footerTel.click();
  expect(await calls(page)).toEqual([
    ['generate_lead', { method: 'phone' }],
    ['generate_lead', { method: 'email' }],
    ['generate_lead', { method: 'phone' }],
  ]);
});

test('generate_lead za obrazec šele po uspešni HTML validaciji', async ({ page }) => {
  const form = page.locator('form[data-track]');
  await form.locator('button[type=submit]').click();
  expect(await calls(page)).toEqual([]);

  await page.fill('#kontakt-name', 'Test');
  await page.fill('#kontakt-email', 'test@example.com');
  await page.fill('#kontakt-message', 'Testno sporočilo');
  await page.check('#kontakt-consent');
  await form.locator('button[type=submit]').click();
  expect(await calls(page)).toEqual([['generate_lead', { method: 'form' }]]);
});

test('window.factoryTrack za lastne dogodke', async ({ page }) => {
  await page.evaluate(() => window.factoryTrack?.('custom_event', { a: 1 }));
  expect(await calls(page)).toEqual([['custom_event', { a: 1 }]]);
});
