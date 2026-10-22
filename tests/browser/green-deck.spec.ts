import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures } from "./fixtures";

test("photo backdrop failure keeps the marketplace usable", async ({ page }) => {
  await installFixtures(page);
  await page.route("**/images/auth/**", route => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(232, 241, 238)");
  await expect(page.locator(".botanical-loading")).toHaveCount(0);
  await page.getByRole("button", { name: "نان و شیرینی", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});

test("White-first teal theme, responsive public pages and reduced-motion button feedback", async ({ page }, info) => {
  test.setTimeout(180000);
  await page.emulateMedia({ colorScheme: "dark" });
  await installFixtures(page);
  await page.route("**/api/business/cities", route => route.fulfill({ json: { success: true, data: [{ id: "city", nameFa: "ارومیه", slug: "urmia", provinceNameFa: "آذربایجان غربی", center: { latitude: 37.55, longitude: 45.07 } }] } }));
  await page.route("**/api/business/application", route => route.fulfill({ json: { success: true, data: null } }));
  await page.route(/(map\.ir|tile\.openstreetmap\.org)/, route => route.abort());
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/discover", "/about", "/login", "/business"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "green-deck");
      await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(232, 241, 238)");
      await expect(page.locator("h1").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await page.waitForTimeout(350);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(audit.violations, `${route} at ${width}`).toEqual([]);
      if (width !== 768) await page.screenshot({ path: info.outputPath(`${route.replaceAll("/", "_")}-${width}.png`), fullPage: true });
    }
  }
  await page.goto("/discover");
  await expect(page.getByRole("banner").locator(".brand-link")).toHaveText("");
  await expect(page.getByRole("banner").locator(".brand-link img")).toBeVisible();
  await expect(page.locator(".footer-wordmark")).toHaveCount(0);
  await expect(page.locator(".deck-hero-steps:visible")).toBeVisible();
  const businessEntry = page.getByRole("link", { name: "ثبت نام / ورود کسب و کار", exact: true });
  await expect(businessEntry).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(businessEntry).toHaveCSS("color", "rgb(29, 97, 106)");
  await businessEntry.hover();
  await expect(businessEntry).toHaveCSS("background-color", "rgb(239, 247, 244)");
  await expect(businessEntry).toHaveCSS("color", "rgb(29, 97, 106)");
  await page.goto("/login");
  const submit = page.getByRole("button", { name: "دریافت کد تایید", exact: true });
  await expect(submit).toHaveClass(/magic-ripple-button/);
  await expect(submit).toBeDisabled();
  await page.getByLabel("شماره موبایل", { exact: true }).fill("09120000000");
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveCSS("color", "rgb(29, 97, 106)");
  await expect(submit).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("کد تایید ۵ رقمی")).toBeVisible();
  await expect(page.locator(".magic-ripple")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/discover");
  await page.getByRole("button", { name: "نان و شیرینی", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(page.locator(".magic-ripple")).toHaveCount(0);
});
