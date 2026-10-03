import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures } from './fixtures';

test('unknown account stays on phone form and registration preserves the number', async ({ page }) => {
  await installFixtures(page);
  await page.context().clearCookies();
  await page.route('**/api/auth/session', r => r.fulfill({ json: { authenticated: false, user: null } }));
  const payloads: unknown[] = [];
  await page.route('**/api/auth/request-otp', r => {
    payloads.push(r.request().postDataJSON());
    return r.fulfill({ status: 404, json: { success: false, code: 'ACCOUNT_NOT_FOUND' } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('شماره موبایل', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد تایید', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'حساب کاربری با این شماره یافت نشد' })).toContainText('حساب کاربری با این شماره یافت نشد');
  await expect(page.getByLabel('کد تایید ۵ رقمی')).toHaveCount(0);
  expect(payloads).toEqual([{ mobile: '09120000000', mode: 'login', audience: 'customer' }]);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/account-not-found.png', fullPage: true });
  await page.getByRole('button', { name: /ثبت‌نام با همین شماره/ }).click();
  await expect(page.getByLabel('شماره موبایل', { exact: true })).toHaveValue('09120000000');
  await expect(page.getByRole('heading', { name: 'ثبت‌نام در لقمه' })).toBeVisible();
  expect(payloads).toHaveLength(1);
});

test('account header logo keeps the same dimensions as discovery', async ({ page }) => {
  await installFixtures(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const size = await page.locator('header .brand-link img').boundingBox();
    const font = await page.locator('header .header-brand-name').evaluate(e => getComputedStyle(e).fontSize);
    await page.goto('/profile');
    await expect(page.locator('header .brand-link img')).toBeVisible();
    await page.locator('header .brand-link').hover();
    const account = await page.locator('header .brand-link img').boundingBox();
    expect(account!.width).toBe(size!.width);
    expect(account!.height).toBe(size!.height);
    expect(await page.locator('header .header-brand-name').evaluate(e => getComputedStyle(e).fontSize)).toBe(font);
    await page.screenshot({ path: `test-results/account-header-${width}.png`, fullPage: true });
  }
});
