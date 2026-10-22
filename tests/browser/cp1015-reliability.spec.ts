import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, merchant } from './fixtures';

async function guest(page: import('@playwright/test').Page) {
  await installFixtures(page);
  await page.context().clearCookies();
  await page.route('**/api/auth/session', r => r.fulfill({ json: { authenticated: false, user: null } }));
  await page.route('**/api/business/cities', r => r.fulfill({ json: { success: true, data: [{ id: 'city', nameFa: 'ارومیه', slug: 'urmia', provinceNameFa: 'آذربایجان غربی', center: { latitude: 37.55, longitude: 45.07 } }] } }));
  await page.route('**/api/business/places/search?**', r => r.fulfill({ json: { success: true, data: [] } }));
  await page.route(/(map\.ir|tile\.openstreetmap\.org)/, r => r.abort());
}

for (const width of [360, 390, 768, 1440]) {
  test(`onboarding focus and form bounds at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 }); await guest(page);
    await page.goto('/business');
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeFocused();
    expect(await title.evaluate(e => getComputedStyle(e).outlineStyle)).toBe('none');
    for (const selector of ['input', 'select']) {
      const fontSize = await page.locator(selector).first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
      if (width < 768) expect(fontSize).toBeGreaterThanOrEqual(16);
    }
    await page.getByLabel('نام کسب‌وکار', { exact: true }).fill('کافه تست');
    await page.getByRole('button', { name: 'کسب‌وکارم را پیدا نکردم' }).click();
    await page.getByRole('radio', { name: 'کافه', exact: true }).check();
    const button = page.getByRole('button', { name: 'تأیید و ادامه', exact: true });
    const bounds = await button.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(16);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`business-types-${width}.png`), fullPage: true });
    await button.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('SMS failure remains on phone form with a visible retryable error', async ({ page }) => {
  await guest(page);
  await page.route('**/api/auth/request-otp', r => r.fulfill({ status: 503, json: { success: false, message: 'ارسال پیامک انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.', expiresInSeconds: 0 } }));
  await page.goto('/login'); await page.getByLabel('شماره موبایل', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();
  await expect(page.getByText('ارسال پیامک انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.')).toBeVisible();
  await expect(page.getByLabel('کد تایید ۵ رقمی')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'دریافت کد تایید' })).toBeEnabled();
});

test('map marker opens its store products and a detail uses the full-width photo', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await installFixtures(page); await page.route(/(map\.ir|tile\.openstreetmap\.org)/, r => r.abort());
  await page.goto('/?view=map');
  await page.locator('.leaflet-marker-icon').first().click();
  await page.getByRole('link', { name: 'مشاهده بسته‌ها', exact: true }).click();
  await expect(page).toHaveURL(/merchants\/ui-store$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(merchant.businessNameFa);
  await page.locator('.listing-card').first().click();
  await expect(page.locator('.detail-hero img, .detail-photo img').first()).toHaveAttribute('sizes', /1216px/);
  expect(errors).toEqual([]);
});

test('footer keeps useful links at a compact height', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await installFixtures(page); await page.goto('/');
  await page.locator('.market-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.footer-wordmark')).toHaveCount(0);
  await expect(page.locator('.footer-navigation')).toBeVisible();
  expect((await page.locator('.market-footer').boundingBox())!.height).toBeLessThan(500);
  await page.screenshot({ path: info.outputPath('footer-compact-desktop.png') });
});
