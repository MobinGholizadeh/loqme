import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, detail } from './fixtures';

for (const width of [360, 390, 768, 1440, 1920]) {
  test(`centered full-width header and rating rows at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await installFixtures(page);
    await page.route('**/api/listings/ui-listing-0', route => route.fulfill({ json: { success: true, data: {
      ...detail, safety: { ...detail.safety, dietaryTags: ['HALAL', 'VEGETARIAN'], allergens: ['GLUTEN', 'DAIRY'] },
      merchant: { ...detail.merchant, ratings: {
        overallRating: { average: 4.3, count: 30 }, collectionRating: { average: 4.7, count: 28 },
        qualityRating: { average: 4.5, count: 30 }, varietyRating: { average: 4.5, count: 25 }, quantityRating: { average: 4.5, count: 29 },
      } },
    } } }));
    await page.goto('/listings/ui-listing-0');
    await expect(page.getByText('حلال', { exact: true })).toBeVisible();
    await expect(page.getByText('گیاه‌خواری', { exact: true })).toBeVisible();
    await expect(page.getByText('گلوتن', { exact: true })).toBeVisible();
    await expect(page.getByText('لبنیات', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'امتیازهای خریداران' })).toBeVisible();
    const positions = await page.evaluate(() => {
      const header = document.querySelector('.market-header-inner')!.getBoundingClientRect();
      const logo = document.querySelector('.brand-link')!.getBoundingClientRect();
      return { width: header.width, center: logo.x + logo.width / 2, viewport: document.documentElement.clientWidth,
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(positions.width).toBe(positions.viewport);
    expect(Math.abs(positions.center - positions.viewport / 2)).toBeLessThan(2);
    expect(positions.overflow).toBe(false);
    await expect(page.locator('.market-header')).toHaveAttribute('data-scrolled', 'false');
    await page.locator('.merchant-ratings').scrollIntoViewIfNeeded();
    await expect(page.locator('.market-header')).toHaveAttribute('data-scrolled', 'true');
    expect(await page.locator('.market-header').evaluate(node => getComputedStyle(node).backdropFilter)).toContain('blur');
    expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`ratings-header-${width}.png`) });
  });
}
