import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, user } from './fixtures';

const city = { id: 'city', nameFa: 'ارومیه', slug: 'urmia', provinceNameFa: 'آذربایجان غربی', center: { latitude: 37.55, longitude: 45.07 } };
const place = { id: 'result-1', providerId: null, name: 'کافه آزمون', address: 'ارومیه خیابان دانشکده', latitude: 37.55, longitude: 45.07 };
const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: dayOfWeek === 0, storeOpenTime: dayOfWeek === 0 ? '09:00' : '', storeCloseTime: dayOfWeek === 0 ? '18:00' : '' }));
const application = { id: 'application', ownerName: 'مالک آزمایشی', businessNameFa: place.name, businessType: 'CAFE', cityId: city.id, cityNameFa: city.nameFa, addressFa: place.address, latitude: place.latitude, longitude: place.longitude, hours, status: 'PENDING', revision: 1, reviewReason: null, merchantId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

async function setup(page: Page, authenticated = false) {
  await installFixtures(page);
  if (!authenticated) {
    await page.context().clearCookies();
    await page.route('**/api/auth/session', r => r.fulfill({ json: { authenticated: false, user: null } }));
  }
  // Map availability must not control form tests; the fallback is tested explicitly.
  await page.route('https://map.ir/**', r => r.abort());
  await page.route('**/api/business/cities', r => r.fulfill({ json: { success: true, data: [city] } }));
  await page.route('**/api/business/places/search?**', r => r.fulfill({ json: { success: true, data: [place] } }));
  await page.route('**/api/business/places/reverse?**', r => r.fulfill({ json: { success: true, data: { address: 'نشانی پیشنهادی نقشه' } } }));
  await page.route('**/api/business/application', r => r.fulfill({ json: { success: true, data: null } }));
}

async function chooseManual(page: Page) {
  await page.getByLabel('نام کسب‌وکار', { exact: true }).fill('کافه دستی');
  await page.getByRole('button', { name: 'کسب‌وکارم را پیدا نکردم' }).click();
  await page.getByRole('radio', { name: 'کافه', exact: true }).check();
  await page.getByRole('button', { name: 'تأیید و ادامه', exact: true }).click();
}

test('guest navbar exposes both entry points including at 360px', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 360, height: 800 }); await page.goto('/');
  const customer = page.getByRole('link', { name: 'ورود و تأیید شماره همراه', exact: true });
  const business = page.getByRole('link', { name: 'کسب‌وکار', exact: true });
  await expect(customer).toBeVisible(); await expect(customer).toHaveAttribute('href', /^\/login/);
  await expect(business).toBeVisible(); await expect(business).toHaveAttribute('href', '/business');
  await business.click(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('کسب‌وکارتان را پیدا کنید');
});

test('manual onboarding validates, edits pin by keyboard, recovers draft, verifies OTP and submits', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/business/places/search?**', r => r.fulfill({ status: 503, json: { success: false, message: 'نقشه در دسترس نیست؛ دستی وارد کنید' } }));
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/business/application', r => {
    if (r.request().method() === 'POST') submitted = r.request().postDataJSON();
    return r.fulfill({ json: { success: true, data: submitted ? { ...application, ...submitted } : null } });
  });
  await page.goto('/business'); await chooseManual(page);
  await page.getByRole('button', { name: 'تأیید و ادامه', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeFocused();
  await page.getByLabel('آدرس کامل').fill('ارومیه خیابان آزمایش شماره ۱۲');
  await page.getByLabel('عرض جغرافیایی').fill('37.56');
  await expect(page.getByLabel('عرض جغرافیایی')).toBeFocused();
  await page.getByLabel('طول جغرافیایی').fill('45.08');
  await page.reload();
  await expect(page.getByLabel('آدرس کامل')).toHaveValue('ارومیه خیابان آزمایش شماره ۱۲');
  await expect(page.getByLabel('عرض جغرافیایی')).toHaveValue('37.56');
  await page.getByRole('button', { name: 'تأیید و ادامه', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید ساعت‌های کاری و ادامه' }).click();
  await expect(page.getByText('حداقل یک روز کاری انتخاب کنید').first()).toBeVisible();
  await page.getByRole('switch', { name: 'شنبه باز است', exact: true }).click();
  await page.getByLabel('شروع شنبه', { exact: true }).fill('09:00');
  await page.getByLabel('پایان شنبه', { exact: true }).fill('18:00');
  await page.getByRole('switch', { name: 'یکشنبه باز است', exact: true }).click();
  await page.getByRole('button', { name: 'کپی ساعت به روزهای باز دیگر' }).first().click();
  await expect(page.getByLabel('شروع یکشنبه', { exact: true })).toHaveValue('09:00');
  await page.getByRole('button', { name: 'تأیید ساعت‌های کاری و ادامه' }).click();
  await page.getByLabel('نام و نام خانوادگی مالک').fill('مالک جدید');
  await page.getByLabel('شماره موبایل', { exact: true }).fill('09120000000');
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();
  await page.getByLabel('کد تایید ۵ رقمی').fill('12345');
  await page.getByRole('button', { name: 'تایید و ورود' }).click();
  await page.getByRole('button', { name: 'تأیید و ارسال درخواست' }).click();
  await expect(page).toHaveURL(/business\/status$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('درخواست شما در انتظار بررسی است');
  expect(submitted).toMatchObject({ ownerName: 'مالک جدید', latitude: 37.56, longitude: 45.08 });
  expect(submitted).not.toHaveProperty('ownerUserId');
  expect(await page.evaluate(() => sessionStorage.getItem('loqme-business-draft-v1'))).toBeNull();
});

test('selects search results and applies reverse address only on confirmation', async ({ page }) => {
  await setup(page); await page.goto('/business');
  await page.getByLabel('نام کسب‌وکار', { exact: true }).fill('کافه');
  await page.getByRole('button', { name: /کافه آزمون ارومیه/ }).click();
  await page.getByRole('radio', { name: 'کافه', exact: true }).check();
  await page.getByRole('button', { name: 'تأیید و ادامه', exact: true }).click();
  await expect(page.getByLabel('نام فروشگاه')).toHaveValue(place.name);
  await page.getByRole('button', { name: 'پیشنهاد آدرس از روی نقشه' }).click();
  await expect(page.getByLabel('آدرس کامل')).toHaveValue(place.address);
  await page.getByRole('button', { name: 'استفاده از این آدرس' }).click();
  await expect(page.getByLabel('آدرس کامل')).toHaveValue('نشانی پیشنهادی نقشه');
});

test('rejected application corrections survive refresh without being overwritten', async ({ page }) => {
  await setup(page, true);
  await page.route('**/api/business/application', r => r.fulfill({ json: { success: true, data: { ...application, status: 'REJECTED', reviewReason: 'نشانی دقیق اصلاح شود' } } }));
  await page.goto('/business/status'); await expect(page.getByText('نشانی دقیق اصلاح شود')).toBeVisible();
  await page.getByRole('link', { name: 'اصلاح و ارسال دوباره' }).click();
  await chooseManual(page); await page.getByLabel('آدرس کامل').fill('نشانی اصلاح‌شده متقاضی');
  await page.reload(); await expect(page.getByLabel('آدرس کامل')).toHaveValue('نشانی اصلاح‌شده متقاضی');
});

for (const role of ['MERCHANT_OWNER', 'MERCHANT_STAFF']) test(`returning ${role} logs in without onboarding`, async ({ page }) => {
  await installFixtures(page, role);
  await page.route('**/api/auth/session', r => r.fulfill({ json: { authenticated: false } }));
  await page.goto('/business/login?redirect=/merchant/orders');
  await page.getByLabel('شماره موبایل', { exact: true }).fill(user.mobile);
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();
  await page.getByLabel('کد تایید ۵ رقمی').fill('12345');
  await page.getByRole('button', { name: 'تایید و ورود' }).click();
  await expect(page).toHaveURL(/merchant\/orders$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('customer checkout return and invalid OTP remain within the correct journey', async ({ page }) => {
  await setup(page, true); let valid = false;
  await page.route('**/api/auth/verify-otp', r => r.fulfill({ status: valid ? 200 : 400, json: valid ? { success: true, user } : { success: false, message: 'کد تایید اشتباه است یا منقضی شده است' } }));
  await page.goto('/login?redirect=%2Fcheckout%2Fui-reservation');
  await page.getByLabel('شماره موبایل', { exact: true }).fill(user.mobile);
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();
  await page.getByLabel('کد تایید ۵ رقمی').fill('00000'); await page.getByRole('button', { name: 'تایید و ورود' }).click();
  await expect(page.getByText('کد تایید اشتباه است یا منقضی شده است')).toBeVisible();
  valid = true; await page.getByLabel('کد تایید ۵ رقمی').fill('12345'); await page.getByRole('button', { name: 'تایید و ورود' }).click();
  await expect(page).toHaveURL(/checkout\/ui-reservation$/);
});

test('admin reviews full application, requires reason, rejects and approves', async ({ page }) => {
  await installFixtures(page, 'ADMIN'); await page.route('https://map.ir/**', r => r.abort());
  let status = 'PENDING'; let reason = '';
  await page.route('**/api/admin/merchant-applications?**', r => r.fulfill({ json: { success: true, data: { items: [{ ...application, status, reviewReason: reason, applicantMobile: user.mobile, duplicates: [] }], total: 1 } } }));
  await page.route('**/api/admin/merchant-applications/application', r => { const body = r.request().postDataJSON(); status = body.decision; reason = body.reasonFa; return r.fulfill({ json: { success: true, data: { ...application, status } } }); });
  await page.goto('/admin/merchants'); await page.getByRole('button', { name: 'درخواست‌های عضویت', exact: true }).click();
  await page.getByRole('button', { name: 'بررسی درخواست', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('مالک آزمایشی');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'رد درخواست با توضیح' }).click();
  await expect(page.getByText('دلیل بررسی را با حداقل ۵ نویسه وارد کنید')).toBeVisible();
  await page.getByLabel('دلیل بررسی').fill('نشانی دقیق اصلاح شود'); await page.getByRole('button', { name: 'رد درخواست با توضیح' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(status).toBe('REJECTED');
  status = 'PENDING'; await page.getByRole('button', { name: 'تازه‌سازی', exact: true }).click();
  await page.getByRole('button', { name: 'بررسی درخواست', exact: true }).click();
  await page.getByLabel('دلیل بررسی').fill('مدارک و موقعیت تأیید شد'); await page.getByRole('button', { name: 'تأیید و فعال‌سازی فروشگاه' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); expect(status).toBe('APPROVED');
});

test('logout clears the business draft', async ({ page }) => {
  await setup(page, true); await page.goto('/business'); await chooseManual(page);
  expect(await page.evaluate(() => sessionStorage.getItem('loqme-business-draft-v1'))).not.toBeNull();
  await page.goto('/profile'); await page.getByRole('button', { name: 'خروج از حساب' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem('loqme-business-draft-v1'))).toBeNull();
});

test('approved status requests a fresh merchant login and is not cacheable/indexable', async ({ page }) => {
  await setup(page, true);
  await page.route('**/api/business/application', r => r.fulfill({ json: { success: true, data: { ...application, status: 'APPROVED', merchantId: 'store' } } }));
  const response = await page.goto('/business/status');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByText(/دوباره با کد پیامکی وارد شوید/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'ورود به پنل کسب‌وکار' })).toHaveAttribute('href', '/business/login');
});

test('late search responses cannot replace a newer query', async ({ page }) => {
  await setup(page); let oldRequested = false; let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/business/places/search?**', async r => {
    const old = new URL(r.request().url()).searchParams.get('q') === 'قدیمی';
    if (old) { oldRequested = true; await gate; }
    await r.fulfill({ json: { success: true, data: [{ ...place, name: old ? 'نتیجه قدیمی' : 'نتیجه جدید' }] } }).catch(() => { });
  });
  await page.goto('/business'); await page.getByLabel('نام کسب‌وکار', { exact: true }).fill('قدیمی');
  await expect.poll(() => oldRequested).toBe(true);
  await page.getByLabel('نام کسب‌وکار', { exact: true }).fill('جدید');
  await expect(page.locator('.business-results').getByRole('button', { name: /نتیجه جدید/ })).toBeVisible(); release();
  await expect(page.locator('.business-results').getByRole('button', { name: /نتیجه قدیمی/ })).toHaveCount(0);
});

test('expired drafts are discarded and a short keyboard-height viewport remains scrollable', async ({ page }) => {
  await setup(page); await page.goto('/business');
  await chooseManual(page);
  await page.evaluate(() => { const key = 'loqme-business-draft-v1'; const value = JSON.parse(sessionStorage.getItem(key)!); value.expiresAt = 1; sessionStorage.setItem(key, JSON.stringify(value)); });
  await page.reload(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('کسب‌وکارتان را پیدا کنید');
  await page.setViewportSize({ width: 390, height: 420 }); await page.goto('/login');
  await page.getByLabel('شماره موبایل', { exact: true }).fill(user.mobile);
  const button = page.getByRole('button', { name: 'دریافت کد تایید' }); await button.focus();
  await expect(button).toBeInViewport(); await button.press('Enter');
  await expect(page.getByLabel('کد تایید ۵ رقمی')).toBeFocused();
});

for (const width of [360, 390, 768, 1024, 1440, 1920]) test(`full-screen composition, accessibility and keyboard at ${width}px`, async ({ page }, testInfo) => {
  await setup(page); await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/login', '/business', '/business/login']) {
    await page.goto(path); await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.market-header')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const photo = await page.locator('.auth-split-photo').boundingBox();
    expect(photo!.x).toBe(0); expect(photo!.y).toBe(0);
    expect(Math.round(photo!.width)).toBe(width >= 1024 ? width / 2 : width);
    expect(Math.round(photo!.height)).toBe(width >= 1024 ? 900 : 230);
    await expect(page.locator('.auth-split-photo img').first()).toHaveJSProperty('complete', true);
    await page.getByRole('link', { name: 'رفتن به فرم' }).focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#auth-content')).toBeFocused();
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll('/', '-')}-${width}.png`), fullPage: true });
  }
});
