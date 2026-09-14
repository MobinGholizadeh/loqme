import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures, reservation, order } from "./fixtures";

test("discovery URL filters, history, photos and dialog keyboard focus", async ({
  page,
}) => {
  await installFixtures(page);
  await page.goto("/?cat=bakery");
  await expect(page).toHaveURL(/category=bakery/);
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await expect(page.locator(".listing-cover img")).toBeVisible();
  await page.getByRole("button", { name: "همه بسته‌ها", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(3);
  await page.goBack();
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.getByRole("button", { name: "فیلترها" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "فیلترها" })).toBeFocused();
  await page.reload();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});

test("Persian phone and OTP flow preserves redirect", async ({ page }) => {
  await installFixtures(page);
  await page.goto("/login?redirect=/explore");
  await page.getByLabel("شماره موبایل", { exact: true }).fill("۰۹۱۲۰۰۰۰۰۰۰");
  await page.getByRole("button", { name: /دریافت کد/ }).click();
  await page.getByLabel("کد تایید ۵ رقمی").fill("۱۲۳۴۵");
  await page.getByRole("button", { name: /تایید و ورود/ }).click();
  await expect(page).toHaveURL(/explore/);
});

test("reservation to checkout to pickup pass", async ({ page }) => {
  await installFixtures(page);
  await page.goto("/listings/ui-listing-0");
  await page.getByRole("button", { name: /رزرو/ }).click();
  await expect(page).toHaveURL(/checkout\/ui-reservation/);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /پرداخت آنلاین/ }).click();
  await expect(page).toHaveURL(/receipt/);
  await page
    .getByRole("button", { name: /کارت تحویل|بارکد|نمایش.*تحویل/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByAltText("بارکد تحویل حضوری")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("checkout rejection and unpaid receipt never claim payment success", async ({
  page,
}) => {
  await installFixtures(page);
  await page.route("**/api/orders/checkout", (route) =>
    route.fulfill({
      status: 409,
      json: { success: false, message: "رزرو منقضی شده است" },
    }),
  );
  await page.goto("/checkout/ui-reservation");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /پرداخت آنلاین/ }).click();
  await expect(page.getByRole("dialog")).toContainText("رزرو منقضی شده است");
  await page.route("**/api/orders/ui-order", (route) =>
    route.fulfill({
      json: { success: true, data: { ...order, status: "PENDING_PAYMENT" } },
    }),
  );
  await page.goto("/orders/ui-order/receipt?status=success");
  await expect(
    page.getByText("در انتظار تایید پرداخت", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /مشاهده بارکد/ })).toHaveCount(
    0,
  );
});

test("pickup pass recovers from error, refreshes, and confirms handoff", async ({
  page,
}) => {
  await installFixtures(page);
  let attempts = 0;
  await page.route("**/api/pickup/credentials/ui-order", async (route) => {
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 503,
        json: { success: false, message: "ارتباط قطع شد" },
      });
    if (attempts > 2)
      return route.fulfill({
        json: {
          success: true,
          data: { isVerified: true, verifiedAt: new Date().toISOString() },
        },
      });
    return route.fallback();
  });
  await page.goto("/orders/ui-order/receipt");
  await page.getByRole("button", { name: /مشاهده بارکد/ }).click();
  await page.getByRole("button", { name: "تلاش مجدد", exact: true }).click();
  await expect(page.getByAltText("بارکد تحویل حضوری")).toBeVisible();
  await expect(
    page.getByText("تحویل با موفقیت تایید شد", { exact: true }),
  ).toBeVisible();
});

test("merchant publishing form and stock operations send existing contracts", async ({
  page,
}) => {
  await installFixtures(page, "MERCHANT_OWNER");
  await page.goto("/merchant");
  const launch = page.getByRole("button", { name: "ثبت بسته", exact: true });
  await launch.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(launch).toBeFocused();
  await launch.click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  const request = page.waitForRequest(
    (req) =>
      req.url().endsWith("/api/merchant/listings") && req.method() === "POST",
  );
  await page.getByRole("button", { name: /انتشار آنی/ }).click();
  expect((await request).postDataJSON()).toMatchObject({
    categorySlug: "bakery",
    temperatureRequirement: "CHILLED",
    quantity: 4,
    originalPriceToman: 160000,
    discountedPriceToman: 75000,
  });
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/merchant/listings");
  const patch = page.waitForRequest((req) => req.method() === "PATCH");
  await page.getByRole("button", { name: "توقف موقت", exact: true }).click();
  expect((await patch).postDataJSON()).toMatchObject({ status: "PAUSED" });
});

test("merchant pickup verification and staff invitation", async ({ page }) => {
  await installFixtures(page, "MERCHANT_OWNER");
  await page.route("**/api/pickup/verify", (route) =>
    route.fulfill({
      json: {
        success: true,
        message: "تحویل ثبت شد",
        ...order,
        orderId: order.id,
        customerNameFa: "کاربر آزمایش",
        verifiedAt: new Date().toISOString(),
      },
    }),
  );
  await page.goto("/merchant/orders");
  await page.getByLabel("کد ۴ رقمی تحویل:").fill("۱۲۳۴");
  const verify = page.waitForRequest((req) =>
    req.url().endsWith("/api/pickup/verify"),
  );
  await page.getByRole("button", { name: /تایید و تحویل/ }).click();
  expect((await verify).postDataJSON()).toMatchObject({ otpCode: "1234" });
  await page.goto("/merchant/staff");
  await page.getByRole("button", { name: /افزودن همکار جدید/ }).click();
  await page
    .getByLabel("شماره موبایل همکار (فرمت استاندارد ایران)")
    .fill("09121111111");
  await page.getByLabel("نام و نام خانوادگی همکار").fill("همکار آزمایشی");
  const invite = page.waitForRequest(
    (req) =>
      req.url().endsWith("/api/merchant/staff") && req.method() === "POST",
  );
  await page.getByRole("dialog").locator("button[type=submit]").click();
  expect((await invite).postDataJSON()).toMatchObject({
    mobile: "09121111111",
    fullName: "همکار آزمایشی",
  });
});

test("admin merchant approval and customer action require confirmation", async ({
  page,
}) => {
  await installFixtures(page, "ADMIN");
  await page.goto("/admin/merchants");
  await page.getByRole("button", { name: "بررسی و تغییر وضعیت" }).click();
  const approval = page.waitForRequest((req) => req.method() === "PATCH");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /تایید و فعال/ })
    .click();
  expect((await approval).postDataJSON()).toMatchObject({
    verificationStatus: "APPROVED",
  });
  await page.goto("/admin/customers");
  await page.getByRole("button", { name: "مسدودسازی", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const block = page.waitForRequest((req) => req.method() === "PATCH");
  await page.getByRole("button", { name: "تایید عملیات" }).click();
  expect((await block).postDataJSON()).toMatchObject({ isActive: false });
});

test("discovery error, empty and reduced-motion states", async ({ page }) => {
  await installFixtures(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/listings/nearby?**", (route) =>
    route.fulfill({
      status: 503,
      json: { success: false, message: "ارتباط قطع شد" },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("دریافت بسته‌ها انجام نشد", { exact: true }),
  ).toBeVisible();
  await page.route("**/api/listings/nearby?**", (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await page.getByRole("button", { name: /تلاش مجدد/ }).click();
  await expect(
    page.getByText("فعلاً بسته‌ای در این محدوده نیست", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".heartbeat")).toHaveCount(0);
});

test("expired reservation cannot be paid", async ({ page }) => {
  await installFixtures(page);
  await page.route("**/api/reservations/ui-reservation", (route) =>
    route.fulfill({
      json: { success: true, data: { ...reservation, remainingSeconds: 1 } },
    }),
  );
  await page.goto("/checkout/ui-reservation");
  await expect(
    page.getByRole("button", { name: "مهلت منقضی شد" }),
  ).toBeDisabled();
});

const routes = [
  "/",
  "/explore",
  "/explore?view=map",
  "/login",
  "/listings/ui-listing-0",
  "/merchants/ui-store",
  "/checkout/ui-reservation",
  "/orders",
  "/orders/ui-order/receipt",
  "/profile",
  "/merchant",
  "/merchant/listings",
  "/merchant/orders",
  "/merchant/finance",
  "/merchant/staff",
  "/merchant/settings",
  "/admin",
  "/admin/merchants",
  "/admin/customers",
  "/admin/listings",
  "/admin/moderation",
  "/admin/finance",
  "/admin/analytics",
  "/admin/audit",
  "/admin/settings",
  "/offline",
  "/missing-redesign-route",
];
test("WCAG accessibility across customer and portal routes", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await installFixtures(page, "ADMIN");
  const violations: unknown[] = [];
  for (const path of routes) {
    await page.unrouteAll({ behavior: "wait" });
    await installFixtures(page, path === "/merchant" || path.startsWith("/merchant/") ? "MERCHANT_OWNER" : path.startsWith("/admin") ? "ADMIN" : "CUSTOMER");
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await page.waitForTimeout(300);
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (report.violations.length)
      violations.push({
        path,
        issues: report.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      });
  }
  await info.attach("accessibility.json", {
    body: JSON.stringify(violations, null, 2),
    contentType: "application/json",
  });
  expect(violations).toEqual([]);
});
for (const width of [360, 390, 768, 1440, 1920]) {
  test(`route matrix at ${width}px`, async ({ page }, info) => {
    test.setTimeout(300000);
    await page.setViewportSize({ width, height: 900 });
    await installFixtures(page, "ADMIN");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const overflow: string[] = [];
    for (const path of routes) {
      await page.unrouteAll({ behavior: "wait" });
      await installFixtures(page, path === "/merchant" || path.startsWith("/merchant/") ? "MERCHANT_OWNER" : path.startsWith("/admin") ? "ADMIN" : "CUSTOMER");
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await page.waitForTimeout(500);
      for (const img of await page.locator("img:not(.leaflet-tile)").all()) {
        if (await img.isVisible()) {
          await expect
            .poll(() =>
              img.evaluate(
                (node: HTMLImageElement) =>
                  node.complete && node.naturalWidth > 0,
              ),
            )
            .toBe(true);
        }
      }
      const problem = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      if (problem) overflow.push(path);
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: info.outputPath(`${path.replace(/[^a-z0-9]/gi, "_")}.png`),
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
    expect(overflow).toEqual([]);
  });
}
