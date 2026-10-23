import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures } from "./fixtures";

test("editorial homepage leads to shopping and the ticker can be paused", async ({ page }, info) => {
  await installFixtures(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".landing-hero h1")).toHaveCount(1);
    const titleLines = page.locator(".landing-hero h1 > .landing-title-line");
    await expect(titleLines).toHaveCount(2);
    expect(await titleLines.evaluateAll(lines => lines.map(line => ({
      tag: line.tagName,
      size: getComputedStyle(line).fontSize,
      headingSize: getComputedStyle(line.parentElement!).fontSize,
    })))).toEqual([
      expect.objectContaining({ tag: "SPAN" }),
      expect.objectContaining({ tag: "SPAN" }),
    ]);
    for (const line of await titleLines.evaluateAll(lines => lines.map(line => ({
      size: getComputedStyle(line).fontSize,
      headingSize: getComputedStyle(line.parentElement!).fontSize,
    })))) expect(line.size).toBe(line.headingSize);
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
    await expect(page.locator(".listing-card")).toHaveCount(0);
    await expect(page.locator(".market-header")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("video")).toHaveCount(0);
    const heroImage = page.locator(".landing-hero-media img");
    expect(await heroImage.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain(width < 768 ? "loqme-mobile-" : "loqme-desktop-");
    await page.getByRole("button", { name: "توقف حرکت دسته‌ها" }).click();
    await expect(page.getByRole("region", { name: "طعم‌هایی برای کشف" }).locator(".food-ticker-track")).toHaveCSS("animation-play-state", "paused");
    await page.getByRole("button", { name: "ادامه حرکت دسته‌ها" }).click();
    await page.locator(".landing-hero h1").click();
    await page.mouse.move(0, 0);
    await expect(page.getByRole("region", { name: "طعم‌هایی برای کشف" }).locator(".food-ticker-track")).toHaveCSS("animation-play-state", "running");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`homepage-${width}.png`), fullPage: true });
    await page.getByRole("link", { name: "کشف خوراکی‌ها", exact: true }).click();
    await expect(page).toHaveURL(/\/discover$/);
    await expect(page.locator(".listing-card")).toHaveCount(3);
    await expect(page.locator(".listing-card").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.screenshot({ path: info.outputPath(`shopping-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "طعم‌هایی برای کشف" }).locator(".food-ticker-track")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("region", { name: "طعم‌هایی برای کشف" }).locator(".food-ticker-group").first()).toBeVisible();
});

test("mobile moves business entry from the header into the account section", async ({ page }) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".business-entry-link")).toBeHidden();
  await page.getByRole("navigation", { name: "منوی موبایل" }).last().getByRole("link", { name: "حساب من" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('a[href="/business/login"]').first()).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.locator(".business-entry-link")).toBeHidden();
  await expect(page.locator('.header-actions a[href="/login"]')).toBeHidden();
  await page.getByRole("navigation", { name: "منوی موبایل" }).last().getByRole("link", { name: "حساب من" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile$/);
  await expect(page.getByRole("heading", { name: "ورود به حساب کاربری" })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('.header-actions a[href="/login"]')).toBeVisible();
  await expect(page.locator(".business-entry-link")).toBeVisible();
});

test("pickup stack advances in order and offers a static reduced-motion layout", async ({ page }, info) => {
  await installFixtures(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const scroll = page.locator(".cards-scroll");
    await expect(scroll).toBeVisible();
    await expect(page.locator(".landing-how, .landing-coverage, .landing-business")).toHaveCount(0);
    const cards = page.locator(".stack-card");
    await expect(cards).toHaveCount(3);
    const bounds = await scroll.evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, distance: el.clientHeight - innerHeight }));
    for (const [step, progress] of [0.05, 0.46, 0.98].entries()) {
      await page.evaluate(y => window.scrollTo(0, y), bounds.top + bounds.distance * progress);
      if (step > 0) await expect(cards.nth(step - 1)).toHaveCSS("opacity", "0");
      await expect(cards.nth(step)).toHaveCSS("opacity", "1");
      await page.screenshot({ path: info.outputPath(`pickup-${width}-${step}.png`) });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.evaluate(y => window.scrollTo(0, y), bounds.top);
    await expect(cards.first()).toHaveCSS("opacity", "1");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".pickup-sticky")).toHaveCSS("position", "relative");
  for (const card of await page.locator(".stack-card").all()) {
    await expect(card).toHaveCSS("transform", "none");
    await expect(card).toHaveCSS("opacity", "1");
  }
  await page.setViewportSize({ width: 667, height: 375 });
  await page.locator(".pickup-story-actions a").scrollIntoViewIfNeeded();
  await expect(page.locator(".pickup-story-actions a")).toBeInViewport();
});

test("nature section reveals locally and preserves readable content on mobile", async ({ page }, info) => {
  await installFixtures(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const section = page.locator(".smooth-hero");
    await expect(section).toBeAttached();
    await expect(page.locator(".food-impact .response-stream").first()).toHaveAttribute("data-motion", "waiting");
    const bounds = await section.evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.clientHeight }));
    const reveal = page.locator(".smooth-hero-reveal");
    const initial = await reveal.evaluate(el => getComputedStyle(el).clipPath);
    await page.evaluate(y => window.scrollTo(0, y), bounds.top + bounds.height - 900);
    await expect.poll(() => reveal.evaluate(el => getComputedStyle(el).clipPath)).toBe("polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)");
    expect(await reveal.evaluate(el => getComputedStyle(el).clipPath)).not.toBe(initial);
    await expect(page.locator(".food-impact h2")).toBeInViewport();
    await expect(page.locator(".food-impact .action-link")).toBeInViewport();
    const img = page.locator(".smooth-hero-picture img");
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate((el: HTMLImageElement) => el.currentSrc)).toContain(width < 768 ? "mobile" : "desktop");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator(".food-impact .response-stream-word").last()).toHaveCSS("opacity", "1");
    await expect(page.locator(".food-impact .response-stream").first()).toHaveAttribute("data-motion", "playing");
    await page.screenshot({ path: info.outputPath(`nature-${width}.png`) });
    const audit = await new AxeBuilder({ page }).include(".food-impact").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(audit.violations).toEqual([]);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".smooth-hero-reveal")).toHaveCSS("clip-path", "none");
  await expect(page.locator(".food-impact .response-stream-word").first()).toHaveCSS("animation-name", "none");
  await expect(page.locator(".smooth-hero-sticky")).toHaveCSS("position", "relative");
  await page.setViewportSize({ width: 667, height: 375 });
  await page.locator(".food-impact .action-link").scrollIntoViewIfNeeded();
  await expect(page.locator(".food-impact .action-link")).toBeInViewport();
});
