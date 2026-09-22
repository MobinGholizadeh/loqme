import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, detail } from './fixtures';

for (const width of [360, 390, 768, 1440]) {
  test(`footer, empty ratings and packaging at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await installFixtures(page);
    await page.route('**/api/listings/ui-listing-0', route => route.fulfill({ json: { success: true, data: {
      ...detail, pickupDetails: { containerProvided: true, carrierBagProvided: false, instructionsFa: 'به صندوق مراجعه کنید.' },
      merchant: { ...detail.merchant, ratings: undefined },
    } } }));
    await page.goto('/listings/ui-listing-0');
    await expect(page.locator('.merchant-rating-score strong')).toHaveText(['۰.۰','۰.۰','۰.۰','۰.۰']);
    for (const bar of await page.locator('.rating-meter span').all()) expect(await bar.evaluate(el => el.getBoundingClientRect().width)).toBe(0);
    await expect(page.locator('.packaging-option[data-provided="true"]')).toContainText('ظرف غذا');
    await expect(page.locator('.packaging-option[data-provided="false"]')).toContainText('کیسه حمل');
    await expect(page.getByText('به صندوق مراجعه کنید.')).toBeVisible();
    await page.locator('.pickup-information').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`packaging-${width}.png`) });
    await page.locator('.footer-signature').scrollIntoViewIfNeeded();
    await expect(page.locator('.footer-signature')).toHaveAttribute('data-revealed', 'true');
    await expect(page.locator('.footer-wordmark')).toHaveText('Loqme');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`footer-${width}.png`) });
  });
}

test('login help dismisses for the session and remains available in footer', async ({ page }) => {
  await installFixtures(page); await page.context().clearCookies();
  await page.route('**/api/auth/session', route => route.fulfill({ json: { authenticated: false, user: null } }));
  await page.goto('/login');
  const opener = page.locator('.guide-notice .how-it-works-link');
  await opener.click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await page.getByRole('button', { name: 'بستن پیشنهاد راهنما' }).click(); await page.reload();
  await expect(page.locator('.guide-notice')).toHaveCount(0);
  await page.goto('/'); await expect(page.locator('.how-it-works-card')).toHaveCount(0);
  await page.locator('.market-footer .how-it-works-link').click(); await expect(page.getByRole('dialog')).toBeVisible();
});

test('mobile session refresh replaces authenticated chrome with a phone verification link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await installFixtures(page); await page.goto('/');
  await expect(page.locator('.customer-shell')).toHaveAttribute('data-session', 'authenticated');
  await expect(page.locator('.header-actions')).toBeHidden();
  await expect(page.locator('.mobile-verification-notice')).toHaveCount(0);
  await page.route('**/api/auth/session', route => route.fulfill({ json: { authenticated: false, user: null } }));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('link', { name: 'ورود و تأیید شماره همراه' })).toBeVisible();
  await expect(page.locator('.category-nav')).toBeVisible();
});

test('reduced motion footer stays static and legacy packaging stays unknown', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await installFixtures(page); await page.goto('/listings/ui-listing-0');
  await expect(page.locator('.packaging-option[data-provided="unknown"]')).toHaveCount(2);
  expect(await page.locator('.footer-wordmark').evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001);
  await expect(page.locator('.footer-wordmark')).toHaveCSS('opacity', '1');
});

test('merchant can save packaging choices without changing stock', async ({ page }) => {
  await installFixtures(page, 'MERCHANT_OWNER');
  let saved: unknown;
  await page.route('**/api/merchant/listings/ui-listing-0', route => {
    saved = route.request().postDataJSON();
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/merchant/listings');
  await page.getByRole('button', { name: 'بسته‌بندی و راهنمای دریافت' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'ویرایش راهنمای دریافت' });
  await dialog.getByLabel('ظرف غذا', { exact: true }).selectOption('true');
  await dialog.getByLabel('کیسه حمل', { exact: true }).selectOption('false');
  await dialog.getByLabel('راهنمای دریافت از فروشگاه').fill('به صندوق مراجعه کنید.');
  await dialog.getByRole('button', { name: 'ذخیره', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(saved).toEqual({ pickupDetails: { containerProvided: true, carrierBagProvided: false, instructionsFa: 'به صندوق مراجعه کنید.' } });
});
