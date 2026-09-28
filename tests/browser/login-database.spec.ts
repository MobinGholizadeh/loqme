import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { installFixtures } from './fixtures';

test('real OTP endpoint persists the account through discovery, profile, reload and logout', async ({ page, baseURL }) => {
  test.skip(process.env.LOQME_TEST_REAL_AUTH !== '1', 'Requires the preview to use the same disposable test database');
  const database = process.env.DATABASE_URL;
  if (!database || !new URL(database).pathname.includes('_test_') || !baseURL?.startsWith('http://localhost:')) {
    throw new Error('Real auth browser test is limited to a local disposable database');
  }
  const db = new Client({ connectionString: database });
  await db.connect();
  const mobile = '09127772017';
  const code = '58173';
  try {
    await db.query('DELETE FROM "OtpCode" WHERE mobile=$1', [mobile]);
    await db.query('INSERT INTO "OtpCode" (id,mobile,"codeHash","expiresAt") VALUES ($1,$2,$3,$4)', [
      randomUUID(), mobile, createHash('sha256').update(`${code}:loqme-otp-salt`).digest('hex'), new Date(Date.now() + 120000),
    ]);
    await installFixtures(page);
    await page.context().clearCookies();
    // Only delivery and unrelated marketplace data are stubbed. Verification,
    // HttpOnly cookie, session reads, middleware and logout use the actual server.
    for (const endpoint of ['session', 'verify-otp', 'logout']) {
      await page.route(`**/api/auth/${endpoint}`, route => route.continue());
    }
    await page.route('**/api/auth/request-otp', route => route.fulfill({ json: { success: true, mobile, expiresInSeconds: 120 } }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('link', { name: 'ورود و تأیید شماره همراه', exact: true }).click();
    await page.getByLabel('شماره موبایل', { exact: true }).fill(mobile);
    await page.getByRole('button', { name: 'دریافت کد تایید', exact: true }).click();
    await page.getByLabel('کد تایید ۵ رقمی').fill(code);
    await page.getByRole('button', { name: 'تایید و ورود', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.locator('a[href="/profile"]').filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: 'کاربر 2017', exact: true })).toBeVisible();
    await expect(page.getByText('۰۹۱۲۷۷۷۲۰۱۷', { exact: true })).toBeVisible();
    const profile = await page.reload();
    expect(profile?.headers()['cache-control']).toContain('no-store');
    await expect(page.getByRole('heading', { name: 'کاربر 2017', exact: true })).toBeVisible();
    const cookie = (await page.context().cookies()).find(c => c.name === 'loqme_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?redirect=/);
  } finally {
    await db.query('DELETE FROM "OtpCode" WHERE mobile=$1', [mobile]);
    await db.query('DELETE FROM "Customer" WHERE "userId" IN (SELECT id FROM "User" WHERE mobile=$1)', [mobile]);
    await db.query('DELETE FROM "User" WHERE mobile=$1', [mobile]);
    await db.end();
  }
});
