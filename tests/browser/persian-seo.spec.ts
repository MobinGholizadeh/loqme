import { test, expect } from "@playwright/test";

test("homepage exposes Persian brand identity without JavaScript", async ({ browser, request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<h1>لقمه؛ خوراکی‌های تازه، نزدیک شما</h1>');
  expect(html).toContain('rel="canonical" href="https://loqme.shop"');
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  expect(scripts).toHaveLength(1);
  const graph = JSON.parse(scripts[0][1])["@graph"];
  expect(graph.find((item: { "@type": string }) => item["@type"] === "WebSite")).toMatchObject({ name: "لقمه", alternateName: expect.arrayContaining(["Loqme"]) });

  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(response.url());
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("لقمه؛ خوراکی‌های تازه، نزدیک شما");
  await expect(page.locator(".discovery-heading p")).toContainText("Loqme");
  await context.close();
});

test("public canonicals and authentication indexing controls", async ({ request }) => {
  for (const route of ["/login", "/register"]) {
    const html = await (await request.get(route)).text();
    expect(html).toMatch(/name="robots" content="noindex, follow"/);
  }
  const explore = await (await request.get("/explore")).text();
  expect(explore).toContain('rel="canonical" href="https://loqme.shop/explore"');
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/login");
  expect(sitemap).not.toContain("/register");
});

test("Persian homepage remains usable at mobile and desktop widths", async ({ page }) => {
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
