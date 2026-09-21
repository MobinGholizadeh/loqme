import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("cached old CSS cannot remove the explainer layout on first navigation", async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.locator('.how-it-works-card').waitFor();
  await page.evaluate(async () => {
    const keys = (await caches.keys()).filter(key => key.startsWith('loqme-cache-'));
    const styles = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
    for (const key of keys) {
      const cache = await caches.open(key);
      for (const style of styles) {
        await cache.put(style.href, new Response('body { --stale-css: 1; }', {
          headers: { 'Content-Type': 'text/css' },
        }));
      }
    }
  });
  await page.reload();
  await expect(page.locator('.how-it-works-card')).toHaveCSS('display', 'flex');
  await page.locator('.how-it-works-card').click();
  await expect(page.locator('.explainer-art')).toHaveCSS('display', 'grid');
  await expect(page.locator('.explainer-phone')).toHaveCSS('border-top-width', '5px');
});

test("service worker installs, excludes private responses and serves offline navigation", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    await fetch("/api/auth/session");
    await fetch("/api/orders");
    await fetch("/business/status");
  });
  const cacheUrls = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = await Promise.all(
      keys.map(async (key) => (await caches.open(key)).keys()),
    );
    return requests.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cacheUrls).toContain("/offline");
  expect(
    cacheUrls.some((path) =>
      /^\/(api|orders|profile|login|checkout|admin|merchant|business)(\/|$)/.test(path),
    ),
  ).toBe(false);
  await context.setOffline(true);
  await page.goto("/explore?offline-check=1");
  await expect(
    page.getByRole("heading", { name: "ارتباط اینترنت برقرار نیست" }),
  ).toBeVisible();
  await context.setOffline(false);
});
