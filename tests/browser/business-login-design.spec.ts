import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures } from "./fixtures";

test("business login has merchant artwork and accessible mobile and desktop forms", async ({ page }, info) => {
  await installFixtures(page);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/business/login");
    await expect(page.locator(".botanical-auth")).toHaveAttribute("data-audience", "business");
    await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator(".botanical-scene img").evaluate((image: HTMLImageElement) => image.currentSrc)).toContain(width < 768 ? "loqme-business-mobile" : "loqme-business-desktop");
    await expect(page.getByRole("heading", { name: "ورود به حساب کسب‌وکار" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ثبت کسب‌وکار", exact: true })).toHaveAttribute("href", "/business");
    await expect(page.getByRole("link", { name: "ورود مشتری", exact: true })).toHaveAttribute("href", "/login");
    await page.getByLabel("شماره موبایل", { exact: true }).fill("۰۹۱۲۰۰۰۰۰۰۰");
    await expect(page.getByLabel("شماره موبایل", { exact: true })).toHaveCSS("color", "rgb(32, 59, 59)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
    if (width !== 768) await page.screenshot({ path: info.outputPath(`business-login-${width}.png`), fullPage: true });
  }
});

test("business entry opens sign-in and still reaches store registration", async ({ page }) => {
  await installFixtures(page);
  await page.route("**/api/business/cities", route => route.fulfill({ json: { success: true, data: [{ id: "city", nameFa: "ارومیه", slug: "urmia", provinceNameFa: "آذربایجان غربی", center: { latitude: 37.55, longitude: 45.07 } }] } }));
  await page.route("**/api/business/application", route => route.fulfill({ json: { success: true, data: null } }));
  await page.goto("/");
  await page.locator(".business-entry-link").click();
  await expect(page).toHaveURL(/\/business\/login$/);
  await page.getByRole("link", { name: "ثبت کسب‌وکار", exact: true }).click();
  await expect(page).toHaveURL(/\/business$/);
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-mode", "onboarding");
  await page.goto("/login");
  await page.locator(".botanical-card-footer").getByRole("link", { name: "ثبت‌نام / ورود کسب‌وکار" }).click();
  await expect(page).toHaveURL(/\/business\/login$/);
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-audience", "business");
});

test("merchant artwork failure recovers without changing business OTP or redirect", async ({ page }) => {
  await installFixtures(page, "MERCHANT_OWNER");
  await page.route("**/images/auth/loqme-business-*", route => route.abort());
  await page.goto("/business/login?redirect=/merchant/orders");
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "ادامه بدون تصویر" }).click();
  await page.getByLabel("شماره موبایل", { exact: true }).fill("۰۹۱۲۰۰۰۰۰۰۰");
  const request = page.waitForRequest(request => request.url().includes("/api/auth/request-otp") && request.method() === "POST");
  await page.getByRole("button", { name: "دریافت کد تایید", exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({ audience: "business", mode: "login", mobile: "09120000000" });
  await page.getByLabel("کد تایید ۵ رقمی").fill("۱۲۳۴۵");
  await page.getByRole("button", { name: "تایید و ورود", exact: true }).click();
  await expect(page).toHaveURL(/\/merchant\/orders$/);
});
