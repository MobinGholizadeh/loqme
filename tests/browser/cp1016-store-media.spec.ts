import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { installFixtures, merchant, location } from './fixtures';

for (const width of [360, 390, 768, 1440]) {
  test(`business finder and fixed center pin at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await installFixtures(page);
    await page.route('**/api/auth/session', r => r.fulfill({ json: { authenticated: false, user: null } }));
    await page.route('**/api/business/cities', r => r.fulfill({ json: { success: true, data: [{id:'city',nameFa:'ارومیه',slug:'urmia',provinceNameFa:'آذربایجان غربی',center:{latitude:37.55,longitude:45.07}}] } }));
    await page.route('**/api/business/places/search?**', r => r.fulfill({ json: { success: true, data: [{id:'place',providerId:null,name:'کافه آرام',address:'ارومیه، خیابان دانشکده',latitude:37.55,longitude:45.07}] } }));
    await page.route(/(map\.ir|tile\.openstreetmap\.org)/, r => r.abort());
    await page.goto('/business'); await page.getByLabel('نام کسب‌وکار', {exact:true}).fill('آرام');
    await expect(page.getByRole('button', {name:/کافه آرام ارومیه/})).toBeVisible();
    await expect(page.locator('.business-map')).toHaveCount(0);
    await page.screenshot({path:info.outputPath(`finder-${width}.png`),fullPage:true});
    await page.getByRole('button', {name:'کسب‌وکارم را پیدا نکردم'}).click();
    await page.getByRole('radio', {name:'کافه',exact:true}).check();
    await page.getByRole('button', {name:'تأیید و ادامه',exact:true}).click();
    const map=page.getByRole('region', {name:'نقشه موقعیت فروشگاه'});
    const pin=page.locator('.business-map-center-pin'); await expect(pin).toBeVisible();
    const before=await pin.boundingBox();
    await map.focus(); await page.keyboard.press('ArrowLeft');
    await page.getByRole('button',{name:'تأیید این موقعیت'}).click();
    await expect(page.getByRole('button',{name:'موقعیت فروشگاه تأیید شد'})).toBeVisible();
    const after=await pin.boundingBox(); expect(after!.x).toBeCloseTo(before!.x,0);
    await page.getByText('ویرایش مختصات با صفحه‌کلید',{exact:true}).click();
    expect(Number(await page.getByLabel('طول جغرافیایی').inputValue())).not.toBe(45.07);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:info.outputPath(`center-pin-${width}.png`),fullPage:true});
  });
}
test('merchant profile shows a wide cover and settings accepts an uploaded cover', async ({page}, info) => {
  await installFixtures(page,'MERCHANT_OWNER');
  await page.route('**/api/merchants/ui-store',r=>r.fulfill({json:{success:true,data:{...merchant,location,activeListings:[],bannerImageUrl:'/lifestyle-1.jpg'}}}));
  await page.goto('/merchants/ui-store');
  await expect(page.locator('.merchant-profile-cover img')).toBeVisible();
  await page.screenshot({path:info.outputPath('merchant-cover.png'),fullPage:true});
  await page.route('**/api/merchant/listings/image',r=>r.fulfill({json:{success:true,imageUrl:'/lifestyle-1.jpg'}}));
  await page.goto('/merchant/settings');
  await page.getByLabel('عکس از گالری').setInputFiles('apps/web/public/listing-defaults/bread.png');
  await expect(page.locator('.merchant-profile-cover img')).toBeVisible();
  const request=page.waitForRequest(r=>r.method()==='PUT'&&r.url().includes('/api/merchant/settings'));
  await page.getByRole('button',{name:'ذخیره کلیه تغییرات فروشگاه'}).click();
  expect((await request).postDataJSON().bannerImageUrl).toBe('/lifestyle-1.jpg');
});
test('publication requires an image in the form', async ({page}) => {
  await installFixtures(page,'MERCHANT_OWNER'); await page.goto('/merchant');
  await page.getByRole('button',{name:'ثبت بسته',exact:true}).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('button',{name:/انتشار آنی/}).click();
  await expect(page.getByText('تصویر بسته را انتخاب کنید',{exact:true})).toBeVisible();
});
