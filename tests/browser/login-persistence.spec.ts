import { test, expect, Page } from '@playwright/test';
import { installFixtures, user } from './fixtures';

// Real browser cookies and protected-route middleware; only SMS/account data are fixtures.
async function anonymousLogin(page: Page, issueCookie = true) {
  await installFixtures(page);
  const token = (await page.context().cookies()).find(c => c.name === 'loqme_session')!.value;
  await page.context().clearCookies();
  await page.route('**/api/auth/session', async route => {
    const authenticated = (await route.request().allHeaders()).cookie?.includes(`loqme_session=${token}`) ?? false;
    await route.fulfill({ json: { authenticated, user: authenticated ? user : null } });
  });
  await page.route('**/api/auth/verify-otp', route => route.fulfill({
    headers: issueCookie ? { 'set-cookie': `loqme_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000` } : {},
    json: { success: true, user },
  }));
}

async function enterCode(page: Page) {
  await page.getByLabel('شماره موبایل', { exact: true }).fill(user.mobile);
  await page.getByRole('button', { name: 'دریافت کد تایید', exact: true }).click();
  await page.getByLabel('کد تایید ۵ رقمی').fill('12345');
  await page.getByRole('button', { name: 'تایید و ورود', exact: true }).click();
}

test('anonymous account redirect is discarded after login and profile survives reload', async ({ page }) => {
  await anonymousLogin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const account = page.locator('a[href="/profile"]').filter({ visible: true });
  await account.click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await enterCode(page);
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: user.fullName })).toBeVisible();
  await page.goto('/explore');
  await page.locator('a[href="/profile"]').filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: user.fullName })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: user.fullName })).toBeVisible();
  expect((await page.context().cookies()).find(c => c.name === 'loqme_session')?.httpOnly).toBe(true);
});

test('successful OTP response without a persisted cookie does not claim login success', async ({ page }) => {
  await anonymousLogin(page, false);
  await page.goto('/login');
  await enterCode(page);
  await expect(page.getByText('ورود ذخیره نشد. کوکی‌های مرورگر را فعال کنید و دوباره وارد شوید.')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
