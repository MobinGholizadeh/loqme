import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures, order, merchant, user, now } from "./fixtures";

test("OTP error and resend recover without losing the phone", async ({
  page,
}) => {
  await installFixtures(page);
  await page.route("**/api/auth/verify-otp", (route) =>
    route.fulfill({
      status: 400,
      json: { success: false, message: "کد تایید اشتباه است" },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("شماره موبایل", { exact: true }).fill(user.mobile);
  await page.getByRole("button", { name: /دریافت کد/ }).click();
  await page.getByLabel("کد تایید ۵ رقمی").fill("00000");
  await page.getByRole("button", { name: /تایید و ورود/ }).click();
  await expect(
    page.getByText("کد تایید اشتباه است", { exact: true }),
  ).toBeVisible();
  const resend = page.waitForRequest((req) =>
    req.url().endsWith("/api/auth/request-otp"),
  );
  await page
    .getByRole("button", { name: "ارسال مجدد کد", exact: true })
    .click();
  expect((await resend).postDataJSON()).toMatchObject({ mobile: user.mobile, mode: 'login' });
  await page.getByRole("button", { name: "ویرایش شماره" }).click();
  await expect(page.getByLabel("شماره موبایل", { exact: true })).toHaveValue(
    user.mobile,
  );
});

test("map frames pins, reports tile availability, opens details and survives tile failure", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/explore?view=map");
  const marker = page.locator(".leaflet-marker-icon").first();
  await expect(marker).toBeInViewport();
  await expect
    .poll(
      async () =>
        (await page.locator(".leaflet-tile-loaded").count()) > 0 ||
        (await page.getByText(/تصویر نقشه بارگذاری نشد/).isVisible()),
      { timeout: 30000 },
    )
    .toBe(true);
  const loadedTiles = await page.locator(".leaflet-tile-loaded").count();
  await info.attach("tile-availability.json", {
    body: JSON.stringify({
      loadedTiles,
      note: loadedTiles
        ? "Live tiles rendered"
        : "External tile connection failed; fallback list verified",
    }),
    contentType: "application/json",
  });
  await marker.click();
  await expect(
    page.getByRole("link", { name: "مشاهده بسته‌ها", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("map-selected-mobile.png"),
    fullPage: true,
  });
  await page.route(/(basemaps\.cartocdn\.com|map\.ir)/, (route) =>
    route.abort(),
  );
  await page.reload();
  await expect(page.getByText(/تصویر نقشه بارگذاری نشد/)).toBeVisible();
  await expect(page.locator(".map-results a").first()).toBeVisible();
});

test("completed-order review is accessible and submits existing ratings", async ({
  page,
}) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [{ ...order, status: "COMPLETED", hasReview: false }],
      },
    }),
  );
  await page.goto("/orders");
  await page.getByRole("button", { name: /ثبت نظر و امتیاز/ }).click();
  await page
    .getByLabel("توضیحات و بازخورد شما (اختیاری)")
    .fill("بسته تازه و مطابق توضیحات بود.");
  await page
    .getByRole("radio", { name: "امتیاز کلی تجربه خرید: ۴ ستاره" })
    .click();
  for (const label of ["تجربه دریافت بسته", "کیفیت خوراکی", "تنوع محتویات", "مقدار خوراکی"]) {
    await page.getByRole("radio", { name: `${label}: ۵ ستاره` }).check();
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  const request = page.waitForRequest(
    (req) => req.url().endsWith("/api/reviews") && req.method() === "POST",
  );
  await page.getByRole("button", { name: "ثبت امتیاز و نظر" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    orderId: order.id,
    overallRating: 4,
    qualityRating: 5,
    collectionRating: 5,
    varietyRating: 5,
    quantityRating: 5,
  });
  await expect(page.getByText("با تشکر از ثبت نظر شما!")).toBeVisible();
});

test("complaint dialog validates description and submits without real uploads", async ({
  page,
}) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/orders/ui-order/receipt");
  await page.getByRole("button", { name: "ثبت گزارش یا شکایت" }).click();
  await page.getByLabel(/شرح دقیق مشکل/).fill("کوتاه");
  await page.getByRole("button", { name: "ارسال گزارش به تیم نظارت" }).click();
  await expect(
    page.getByText("لطفاً توضیحات را حداقل در ۱۰ کاراکتر وارد کنید"),
  ).toBeVisible();
  await page
    .getByLabel(/شرح دقیق مشکل/)
    .fill("محتویات بسته با مشخصات اعلام شده مطابقت نداشت.");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  const request = page.waitForRequest(
    (req) => req.url().endsWith("/api/complaints") && req.method() === "POST",
  );
  await page.getByRole("button", { name: "ارسال گزارش به تیم نظارت" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    orderId: order.id,
    category: "MISMATCHED_DESCRIPTION",
    evidencePhotos: [],
  });
  await expect(page.getByText("گزارش شما با موفقیت ثبت شد")).toBeVisible();
});

test("admin refund requires confirmation and preserves backend amount contract", async ({
  page,
}) => {
  await installFixtures(page, "ADMIN");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/admin/complaints", (route) =>
    route.fulfill({
      json: {
        success: true,
        items: [
          {
            id: "ui-complaint",
            orderId: order.id,
            customerId: "ui-customer",
            merchantId: merchant.id,
            category: "EXPIRED_FOOD",
            descriptionFa: "گزارش آزمایشی برای بررسی رابط نظارت",
            evidencePhotos: [],
            status: "PENDING",
            createdAt: now,
            customer: { id: "ui-customer", fullName: user.fullName, user },
            merchant,
            order,
          },
        ],
      },
    }),
  );
  await page.goto("/admin/moderation");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /استرداد وجه \(/ }).click();
  await page
    .getByLabel("توضیحات و یادداشت بازرسی مدیر:")
    .fill("مدارک بررسی و درخواست تایید شد.");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  const request = page.waitForRequest((req) =>
    req.url().endsWith("/api/admin/complaints/ui-complaint/resolve"),
  );
  await page.getByRole("button", { name: "تایید نهایی اقدام" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    action: "REFUND",
    refundAmountToman: order.totalAmountToman,
  });
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
