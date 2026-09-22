import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, listings, detail, merchant, location } from './fixtures';

const ratings = {
  overallRating: { average: 4.2, count: 12 }, collectionRating: { average: 4.5, count: 10 },
  qualityRating: { average: 4.2, count: 12 }, varietyRating: { average: null, count: 0 }, quantityRating: { average: 4.8, count: 9 },
};

test('playback accepts an initial frame timestamp earlier than effect setup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installFixtures(page); await page.goto('/');
  await page.locator('.market-footer .how-it-works-link').click();
  await page.getByRole('dialog').waitFor();
  await page.evaluate(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window);
    // A busy frame can already have started before the playback effect runs.
    window.requestAnimationFrame = callback => nativeFrame(time => callback(time - 250));
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'پخش راهنما', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: 'یک طعم تازه کشف کن' })).toBeVisible();
    await page.getByRole('button', { name: 'توقف', exact: true }).click();
  }
  expect(errors).toEqual([]);
  await expect(page.locator('#explainer-progress')).not.toHaveValue(/^-|NaN/);
});
for (const width of [360,390,768,1440]) {
  test(`merchant ratings and unavailable cards at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await installFixtures(page);
    await page.route('**/api/merchants/ui-store', route => route.fulfill({ json: { success: true, data: {
      ...merchant, location, ratings, activeListings: listings.map((item, i) => ({ ...item, availability: i === 0 ? 'RESERVED' : 'SOLD_OUT', canReserve: false, remainingQuantity: 0 })),
    } } }));
    await page.goto('/merchants/ui-store');
    await expect(page.getByRole('region', { name: 'امتیازهای خریداران' })).toBeVisible();
    await expect(page.locator('.merchant-rating-score strong').nth(2)).toHaveText('۰.۰');
    await expect(page.locator('.listing-stock').first()).toHaveText('ناموجود');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`merchant-${width}.png`), fullPage: true });
  });
  test(`explainer controls and layout at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await installFixtures(page); await page.goto('/');
    const opener = page.locator('.market-footer .how-it-works-link'); await opener.click();
    const dialog = page.getByRole('dialog', { name: 'لقمه چطور کار می‌کند؟' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('.explainer-panel')).toHaveAttribute('data-playing','false');
    await dialog.getByRole('button', { name: 'پخش راهنما' }).click();
    await expect(page.locator('.explainer-panel')).toHaveAttribute('data-playing','true');
    await dialog.getByRole('button', { name: 'توقف', exact: true }).click();
    await dialog.getByRole('button', { name: 'مرحله بعد' }).click();
    await expect(dialog.getByRole('heading', { name: 'انتخاب کن، رزرو کن' })).toBeVisible();
    await dialog.getByRole('button', { name: 'مرحله قبل' }).click();
    await expect(dialog.getByRole('heading', { name: 'یک طعم تازه کشف کن' })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`explainer-${width}.png`) });
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
  });
}
test('unavailable detail blocks checkout and refreshes after focus', async ({ page }) => {
  await installFixtures(page); let available = false;
  await page.route('**/api/listings/ui-listing-0', route => route.fulfill({ json: { success: true, data: {
    ...detail, canReserve: available, availability: available ? 'AVAILABLE' : 'RESERVED', isSoldOut: !available,
    inventory: { totalQuantity: 5, availableQuantity: available ? 2 : 0 },
  } } }));
  await page.goto('/listings/ui-listing-0');
  await expect(page.getByRole('button', { name: /ناموجود|تکمیل|پایان|رزرو این بسته/ }).last()).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'همه بسته‌ها' })).toBeVisible();
  available = true; await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: /رزرو/ }).last()).toBeEnabled();
});
test('reduced motion uses static manually navigable scenes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await installFixtures(page); await page.goto('/');
  await page.locator('.market-footer .how-it-works-link').click();
  await expect(page.getByText('نمایش بدون حرکت')).toBeVisible();
  await expect(page.getByRole('button', { name: 'پخش راهنما' })).toHaveCount(0);
  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await expect(page.getByRole('heading', { name: 'انتخاب کن، رزرو کن' })).toBeVisible();
  expect(await page.locator('.scene-enter').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
});
test('map controls stay below sticky navigation while scrolling', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await installFixtures(page);
  await page.route(/map\.ir/, route => route.abort()); await page.goto('/explore?view=map');
  await expect(page.getByRole('button', { name: 'نمایش موقعیت من روی نقشه' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.leaflet-container')!.getBoundingClientRect().top + window.scrollY));
  const headerAbove = await page.locator('.market-header').evaluate(header => {
    const rect = header.getBoundingClientRect();
    return header.contains(document.elementFromPoint(rect.left + 25, rect.bottom - 5));
  });
  expect(headerAbove).toBe(true);
  const tabsAbove = await page.locator('.mobile-tabs').evaluate(nav => {
    const rect = nav.getBoundingClientRect();
    return nav.contains(document.elementFromPoint(rect.left + 25, rect.top + 10));
  });
  expect(tabsAbove).toBe(true);
  await page.screenshot({ path: info.outputPath('map-scrolled.png') });
});

test('reservation race refreshes the detail without removing the offer', async ({ page }) => {
  await installFixtures(page); let reserved = false;
  await page.route('**/api/listings/ui-listing-0', route => route.fulfill({ json: { success: true, data: { ...detail,
    canReserve: !reserved, availability: reserved ? 'RESERVED' : 'AVAILABLE', isSoldOut: reserved,
    inventory: { totalQuantity: 1, availableQuantity: reserved ? 0 : 1 },
  } } }));
  await page.route('**/api/reservations', route => { reserved = true; return route.fulfill({ status: 409, json: { success: false, message: 'موجودی این بسته به پایان رسیده است' } }); });
  await page.goto('/listings/ui-listing-0'); await page.getByRole('button', { name: /رزرو/ }).last().click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('status').filter({ hasText: 'همه بسته‌ها' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ناموجود|تکمیل|پایان/ }).last()).toBeDisabled();
});
test('explainer plays all scenes, stops at the end and resets on reopen', async ({ page }) => {
  await installFixtures(page); await page.goto('/'); await page.locator('.market-footer .how-it-works-link').click();
  await page.clock.install(); await page.getByRole('button', { name: 'پخش راهنما' }).click();
  await page.clock.runFor(8000); await expect(page.getByRole('heading', { name: 'انتخاب کن، رزرو کن' })).toBeVisible();
  await page.clock.runFor(8000); await expect(page.getByRole('heading', { name: 'سر وقت، حضوری دریافت کن' })).toBeVisible();
  await page.clock.runFor(15000); await expect(page.getByRole('heading', { name: 'لذت ببر و تجربه‌ات را بگو' })).toBeVisible();
  await expect(page.locator('.explainer-panel')).toHaveAttribute('data-playing','false');
  await page.keyboard.press('Escape'); await page.locator('.market-footer .how-it-works-link').click();
  await expect(page.getByRole('heading', { name: 'یک طعم تازه کشف کن' })).toBeVisible();
});
