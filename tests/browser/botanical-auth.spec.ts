import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures } from "./fixtures";

test("food pickup login renders accessible mobile and desktop layouts with responsive artwork", async ({ page }, info) => {
  test.setTimeout(120000);
  await installFixtures(page);
  for (const [width, height] of [[375, 812], [768, 1024], [1440, 1000], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/login");
    await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
    await expect(page.locator(".botanical-footer")).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeVisible();
    const image = page.locator(".botanical-scene img");
    expect(await image.evaluate((el: HTMLImageElement) => el.currentSrc)).toContain(width < 768 ? "loqme-mobile-" : "loqme-desktop-");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`login-${width}.png`), fullPage: true });
    if (width === 375) {
      await page.getByLabel("شماره موبایل", { exact: true }).fill("123");
      await page.getByRole("button", { name: "دریافت کد تایید", exact: true }).click();
      await expect(page.locator("#auth-content").getByRole("alert")).toContainText("شماره موبایل معتبر");
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
      await page.getByLabel("شماره موبایل", { exact: true }).fill("۰۹۱۲۰۰۰۰۰۰۰");
      await page.getByRole("button", { name: "دریافت کد تایید", exact: true }).click();
      await expect(page.getByLabel("کد تایید ۵ رقمی")).toBeFocused();
      await page.getByLabel("کد تایید ۵ رقمی").fill("۱۲۳۴۵");
      await expect(page.getByLabel("کد تایید ۵ رقمی")).toHaveCSS("color", "rgb(32, 59, 59)");
      await expect(page.locator(".magic-ripple")).toHaveCount(0);
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
      await page.screenshot({ path: info.outputPath("login-mobile-otp.png"), fullPage: true });
    }
  }
  for (const route of ["/register", "/business/login"]) {
    await page.goto(route);
    await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
    await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  }
});

test("customer registration copy stays compact without changing the card height", async ({ page }) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
  const loginHeight = await page.locator(".botanical-card").evaluate(node => node.getBoundingClientRect().height);
  await page.getByRole("button", { name: "ثبت‌نام", exact: true }).click();
  const registerTab = page.getByRole("button", { name: "ثبت‌نام", exact: true });
  const loginTab = page.getByRole("button", { name: "ورود", exact: true });
  await expect(registerTab).toHaveAttribute("data-selected", "true");
  await expect(loginTab).toHaveAttribute("data-selected", "false");
  await expect(registerTab).toHaveCSS("background-color", "rgb(225, 239, 235)");
  await expect(loginTab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const copy = page.locator(".otp-heading > p");
  await expect(copy).toHaveText("با شماره موبایل خود ثبت‌نام کنید.");
  const metrics = await copy.evaluate(node => {
    const style = getComputedStyle(node);
    return { height: node.getBoundingClientRect().height, lineHeight: Number.parseFloat(style.lineHeight) };
  });
  expect(metrics.height).toBeLessThan(metrics.lineHeight * 1.5);
  const registerHeight = await page.locator(".botanical-card").evaluate(node => node.getBoundingClientRect().height);
  expect(registerHeight).toBeLessThanOrEqual(loginHeight + 2);
});

test("login stays hidden and unfocusable until its image is decoded", async ({ page }, info) => {
  await installFixtures(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/images/auth/**", async route => { await held; await route.continue(); });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toContainText("در حال آماده‌سازی");
  await expect(page.locator(".botanical-experience")).toHaveAttribute("inert", "");
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeHidden();
  await page.screenshot({ path: info.outputPath("login-loading.png"), caret: "initial" });
  release();
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
  await page.getByLabel("شماره موبایل", { exact: true }).fill("۰۹۱۲۰۰۰۰۰۰۰");
  await page.getByRole("button", { name: "دریافت کد تایید", exact: true }).click();
  await expect(page.getByLabel("کد تایید ۵ رقمی")).toBeFocused();
  await page.reload();
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
});

test("failed artwork supports retry and a deliberate image-free login", async ({ page }) => {
  await installFixtures(page);
  await page.route("**/images/auth/**", route => route.abort());
  await page.goto("/login");
  await expect(page.getByRole("status")).toContainText("تصویر بارگیری نشد");
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeHidden();
  await page.unroute("**/images/auth/**");
  await page.getByRole("button", { name: "تلاش دوباره" }).click();
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "ready");
  await expect(page.locator("#auth-content")).toBeFocused();
  await page.route("**/images/auth/**", route => route.abort());
  await page.reload();
  await page.getByRole("button", { name: "ادامه بدون تصویر" }).click();
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "fallback");
  await page.getByLabel("شماره موبایل", { exact: true }).fill("09120000000");
  await page.getByRole("button", { name: "دریافت کد تایید", exact: true }).click();
  await expect(page.getByLabel("کد تایید ۵ رقمی")).toBeVisible();
});

test("slow images keep the loader visible and reduced motion stops its animation", async ({ page }) => {
  await installFixtures(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/images/auth/**", async route => { await held; await route.continue(); });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".botanical-loading-leaf")).toHaveCSS("animation-name", "none");
  await page.clock.fastForward(13000);
  await expect(page.getByRole("status")).toContainText("بارگیری کمی طول کشیده");
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "ادامه بدون تصویر" }).click();
  release();
  await expect(page.locator(".botanical-auth")).toHaveAttribute("data-scene", "fallback");
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toBeVisible();
});
