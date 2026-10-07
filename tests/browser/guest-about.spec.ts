import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('guest entry bypasses authentication on login and register, including OTP', async ({ page, request }) => {
  let requests = 0;
  await page.route('**/api/auth/request-otp', route => {
    requests++;
    return route.fulfill({ json: { success: true, expiresInSeconds: 120 } });
  });
  await page.route('**/api/auth/session', route => route.fulfill({ json: { authenticated: false, user: null } }));
  for (const path of ['/login', '/register']) {
    await page.goto(path);
    const before = requests;
    await page.getByRole('link', { name: 'ادامه بدون حساب کاربری' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(requests).toBe(before);
    await page.goto(path);
    await page.getByLabel('شماره موبایل', { exact: true }).fill('09121111111');
    await page.getByRole('button', { name: 'دریافت کد تایید', exact: true }).click();
    await expect(page.getByLabel('کد تایید ۵ رقمی')).toBeVisible();
    await page.getByRole('link', { name: 'ادامه بدون حساب کاربری' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(requests).toBe(before + 1);
    expect((await page.context().cookies()).some(cookie => cookie.name === 'loqme_session')).toBe(false);
  }
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  expect((await request.post('/api/reservations', { data: { listingId: 'guest-check', quantity: 1 } })).status()).toBe(401);
  await page.goto('/business/login');
  await expect(page.getByRole('link', { name: 'ادامه بدون حساب کاربری' })).toHaveCount(0);
});

test('About is public, server-rendered, indexed and omits empty business details', async ({ request }) => {
  const response = await request.get('/about');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<h1>درباره لقمه</h1>');
  expect(html).toContain('id="about-safety"');
  expect(html).toContain('href="https://loqme.shop/about"');
  expect(html).not.toContain('id="about-business"');
  expect(await (await request.get('/sitemap.xml')).text()).toContain('https://loqme.shop/about');
});

test('About layout and footer are accessible across mobile and desktop', async ({ page }, testInfo) => {
  await page.route('**/api/auth/session', route => route.fulfill({ json: { authenticated: false, user: null } }));
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('درباره لقمه');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'درباره ما', exact: true })).toHaveAttribute('href', '/about');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`about-${width}.png`), fullPage: true });
  }
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'رفتن به محتوای اصلی' })).toBeFocused();
  await page.getByRole('link', { name: 'درباره ما', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
});
