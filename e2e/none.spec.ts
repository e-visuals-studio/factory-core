import { baseURL } from './builds.ts';
import { expect, test } from './fixtures.ts';

test.use({ baseURL: baseURL('none') });

test('brez analitike: nič JavaScripta, nič bannerja, nobene zunanje zahteve', async ({ page, external }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0);
  await expect(page.locator('#cc-main')).toHaveCount(0);
  await expect(page.locator('footer [data-cc]')).toHaveCount(0);
  expect(external).toEqual([]);
});
