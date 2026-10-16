import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures } from './fixtures';
const merchantId = 'c3132103-f199-403b-9cf8-bad7c5b72ab2';
const report = { version: '1', merchantId, locationId: null, source: 'LOQME_MARKETPLACE', timezone: 'Asia/Tehran',
  startIso: '2026-10-05T20:30:00Z', endExclusiveIso: '2026-10-12T20:30:00Z', computedAtIso: '2026-10-13T10:00:00Z',
  collectionsToman: '150000', refundsToman: '50000', netCollectionsToman: '100000', bookedSalesToman: '150000', bookedCommissionToman: '15000', bookedMerchantPayableToman: '135000', paidOrderCount: 3, pickupCount: 2,
  quality: { unknownPaymentTimes: 1, unknownRefundTimes: 0, unknownLocations: 0, openReconciliations: 1, baselineOnly: false },
  insights: [{ code: 'LOW_SAMPLE', textFa: 'برای پیشنهاد قیمت، داده کافی نداریم.', evidence: ['paidOrderCount'] }],
};
for (const width of [360, 390, 768, 1440]) test(`merchant report scope, quality and accessibility at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await installFixtures(page, 'MERCHANT_OWNER');
  await page.route('**/api/merchant/contexts', route => route.fulfill({ json: { success: true, data: [{ id: merchantId, nameFa: 'نانوایی دانشکده', role: 'OWNER', locations: [] }, { id: 'second', nameFa: 'فروشگاه دوم', role: 'OWNER', locations: [] }] } }));
  await page.route('**/api/merchant/reports?**', route => route.fulfill({ json: { success: true, data: report } }));
  await page.goto('/merchant/insights');
  await expect(page.getByText('برای شروع، یک فروشگاه را انتخاب کنید.')).toBeVisible();
  await page.getByRole('combobox', { name: 'فروشگاه', exact: true }).selectOption(merchantId);
  await expect(page.getByText('۱۵۰٬۰۰۰ تومان').first()).toBeVisible();
  await expect(page.getByText('پرونده باز پرداخت (کل فروشگاه)')).toBeVisible();
  await page.getByText('مبنای این نکته').click(); await expect(page.getByText('تعداد سفارش پرداخت‌شده: ۳')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).analyze(); expect(audit.violations).toEqual([]);
  if (width === 1440) await page.screenshot({ path: '.artifacts/merchant-data-desktop.png', fullPage: true });
});
test('admin payment review rechecks the existing case and displays the result', async ({ page }) => {
  await installFixtures(page, 'ADMIN');
  await page.route('**/api/admin/reconciliation', route => route.fulfill({ json: { success: true, data: { cases: [{ id: 'case', orderId: 'test-order', reason: 'DUPLICATE_PAYMENT', createdAt: '2026-10-13T12:00:00Z' }], stalled: [] } } }));
  await page.route('**/api/admin/reconciliation/case/resolve', route => {
    expect(route.request().postDataJSON()).toEqual({ action: 'RECHECK' });
    return route.fulfill({ status: 409, json: { success: false, message: 'تا تسویه استرداد، پرونده باز می‌ماند' } });
  });
  await page.goto('/admin/reconciliation'); await page.getByRole('button', { name: 'بررسی مجدد نتیجه پرداخت' }).click();
  await expect(page.getByText('تا تسویه استرداد، پرونده باز می‌ماند')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test('merchant report failure clears old data and permits retry', async ({ page }) => {
  await installFixtures(page, 'MERCHANT_OWNER');
  await page.route('**/api/merchant/contexts', route => route.fulfill({ json: { success: true, data: [{ id: merchantId, nameFa: 'فروشگاه', role: 'OWNER', locations: [] }] } }));
  let denied = true;
  await page.route('**/api/merchant/reports?**', route => route.fulfill({ status: denied ? 403 : 200, json: denied ? { success: false, message: 'این گزارش مخصوص مالک فروشگاه است' } : { success: true, data: report } }));
  await page.goto('/merchant/insights'); await expect(page.getByRole('alert').filter({ hasText: 'مخصوص مالک' })).toBeVisible();
  denied = false; await page.getByRole('button', { name: 'تلاش دوباره' }).click(); await expect(page.getByText('خالص دریافت وجه')).toBeVisible();
});
