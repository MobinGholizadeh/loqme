import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, merchant, user, now } from './fixtures';

for (const role of ['CUSTOMER', 'MERCHANT_OWNER']) {
  test(`support workspace ${role} desktop and mobile`, async ({ page }, info) => {
    await installFixtures(page, role);
    await page.route('**/api/notifications**', route => route.fulfill({ json: { success: true, data: { items: [], unreadCount: 0 } } }));
    await page.route('**/api/merchant/contexts', route => route.fulfill({ json: { success: true, data: { items: [] } } }));
    const messages = [{ id: 'message-1', senderUserId: 'admin', senderType: 'ADMIN', body: 'سلام، چطور می‌توانیم کمکتان کنیم؟', createdAt: now, attachments: [{ id: 'file-1', attachmentType: 'DOCUMENT', mimeType: 'application/pdf', fileName: 'receipt.pdf', fileSize: 2048, fileUrl: '/api/support/attachments/file-1' }] }];
    const conversation = { id: 'support-ui', channelType: role === 'CUSTOMER' ? 'CUSTOMER_ADMIN' : 'MERCHANT_ADMIN', status: 'OPEN', subject: 'پیگیری سفارش', createdAt: now, merchant, user: { customer: { fullName: user.fullName } }, messages };
    await page.route('**/api/support/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/events')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': connected\n\n' });
      if (path.endsWith('/messages') && route.request().method() === 'POST') {
        const message = { ...route.request().postDataJSON(), id: `message-${messages.length + 1}`, senderUserId: user.userId, senderType: role === 'CUSTOMER' ? 'CUSTOMER' : 'MERCHANT', createdAt: now, attachments: [] };
        messages.push(message);
        return route.fulfill({ json: { success: true, data: message } });
      }
      return route.fulfill({ json: { success: true, data: path.endsWith('/conversations') ? { items: [conversation] } : conversation } });
    });
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(role === 'CUSTOMER' ? '/support' : '/merchant/support');
      const workspace = page.locator('[data-support-workspace]');
      await expect(workspace).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'متن پیام' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const composer = await page.getByRole('textbox', { name: 'متن پیام' }).boundingBox();
      expect(composer!.y + composer!.height).toBeLessThan(width === 390 ? 840 : 900);
      if (width < 1280) await page.getByRole('button', { name: 'فایل‌های گفتگو', exact: true }).click();
      const files = page.getByRole('complementary', { name: 'فایل‌های گفتگو' });
      await expect(files.getByRole('link', { name: /receipt.pdf/ })).toBeVisible();
      await files.getByRole('button', { name: 'تصاویر', exact: true }).click();
      await expect(files.getByText('فایلی از این نوع وجود ندارد')).toBeVisible();
      await files.getByRole('button', { name: 'همه', exact: true }).click();
      if (width < 1280) await files.getByRole('button', { name: 'بستن فایل‌ها' }).click();
      await page.getByRole('textbox', { name: 'متن پیام' }).fill('پیگیری سفارش من');
      await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
      await expect(page.getByRole('log').getByText('پیگیری سفارش من').last()).toBeVisible();
      const audit = await new AxeBuilder({ page }).include('[data-support-workspace]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
      await page.screenshot({ path: info.outputPath(`support-${width}.png`), fullPage: true });
    }
    messages.splice(0);
    await page.reload();
    await expect(page.getByText('کانال گفتگوی رسمی با پشتیبانی لقمه')).toBeVisible();
    await page.getByRole('button', { name: 'فایل‌های گفتگو', exact: true }).click();
    await expect(page.getByText('هنوز فایلی ارسال نشده')).toBeVisible();
    await page.getByRole('button', { name: 'بستن فایل‌ها' }).click();
    await page.screenshot({ path: info.outputPath('support-empty-mobile.png'), fullPage: true });
  });
}
