import { test, expect } from "@playwright/test";
import { installFixtures } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

for (const role of ["CUSTOMER", "ADMIN", "MERCHANT_OWNER", "MERCHANT_STAFF"]) {
  test(`navigation is scoped to ${role}`, async ({ page }) => {
    await installFixtures(page, role);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "حساب من", exact: true }).first(),
    ).toBeVisible();
    const isSeller = role.startsWith("MERCHANT_");
    await expect(page.locator('a[href="/merchant"]')).toHaveCount(
      isSeller ? 2 : 0,
    );
    await expect(page.locator('a[href="/admin"]')).toHaveCount(
      role === "ADMIN" ? 2 : 0,
    );
    if (!isSeller) {
      await page.goto("/merchant/settings");
      await expect(page).toHaveURL(role === "ADMIN" ? /\/admin$/ : /\/$/);
    }
  });
}
test("all regions is default, region labels persist through selection and back", async ({
  page,
}) => {
  await installFixtures(page);
  const request = page.waitForRequest((r) =>
    r.url().includes("/api/listings/nearby?"),
  );
  await page.goto("/");
  expect(new URL((await request).url()).searchParams.get("scope")).toBe("all");
  await expect(page.getByRole("combobox", { name: "محله" })).toHaveValue("all");
  await expect(page.locator(".listing-card").first()).toContainText(
    "ارومیه، دانشکده",
  );
  await page.getByRole("combobox", { name: "محله" }).selectOption({ index: 1 });
  await expect(page).toHaveURL(/neighborhood=/);
  await page.goBack();
  await expect(page.getByRole("combobox", { name: "محله" })).toHaveValue("all");
});
test("seller can choose catalog photo and all food categories without invalid enums", async ({
  page,
}, info) => {
  await installFixtures(page, "MERCHANT_OWNER");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/merchant");
  await page.getByRole("button", { name: "ثبت بسته", exact: true }).click();
  await page.getByLabel("دسته‌بندی خوراکی").selectOption("restaurant");
  await page.getByRole("button", { name: "برنج و مرغ", exact: true }).click();
  await expect(page.getByText("تصویر تزئینی").first()).toBeVisible();
  await page.getByLabel("دمای نگهداری").selectOption("CHILLED");
  await page.getByRole("dialog").getByRole("checkbox").check();
  expect((await new AxeBuilder({ page }).include('dialog').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath("listing-form-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().endsWith("/api/merchant/listings"),
  );
  await page.getByRole("button", { name: /انتشار آنی/ }).click();
  expect((await request).postDataJSON()).toMatchObject({
    categorySlug: "restaurant",
    temperatureRequirement: "CHILLED",
    imageUrl: "/listing-defaults/meal.png",
  });
});

test("gallery upload previews the chosen photo and submits its returned URL", async ({ page }, info) => {
  await installFixtures(page, "MERCHANT_OWNER");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/merchant/listings/image", async (route) => {
    expect(route.request().headers()["content-type"]).toBe("image/png");
    expect(route.request().postDataBuffer()!.length).toBeGreaterThan(1000);
    await route.fulfill({ json: { success: true, imageUrl: "/lifestyle-1.jpg" } });
  });
  await page.goto("/merchant");
  await page.getByRole("button", { name: "ثبت بسته", exact: true }).click();
  await page.getByLabel("عکس از گالری").setInputFiles("apps/web/public/listing-defaults/bread.png");
  await expect(page.getByAltText("تصویر انتخاب‌شده")).toBeVisible();
  await page.getByAltText("تصویر انتخاب‌شده").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("listing-form-desktop.png"), fullPage: true });
  await page.getByRole("dialog").getByRole("checkbox").check();
  const request = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/merchant/listings"));
  await page.getByRole("button", { name: /انتشار آنی/ }).click();
  expect((await request).postDataJSON().imageUrl).toBe("/lifestyle-1.jpg");
});
