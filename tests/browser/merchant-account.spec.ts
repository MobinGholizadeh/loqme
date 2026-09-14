import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installFixtures, user } from "./fixtures";

test("session is unknown while loading, then survives customer shell remounts", async ({
  page,
}) => {
  await installFixtures(page);
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/auth/session", async (route) => {
    requests++;
    await wait;
    await route.fulfill({ json: { authenticated: true, user } });
  });
  await page.goto("/");
  await expect(page.getByLabel("در حال بررسی حساب")).toBeVisible();
  await expect(page.getByRole("link", { name: "ورود / ثبت‌نام" })).toHaveCount(
    0,
  );
  release();
  await expect(
    page.locator("header").getByRole("link", { name: "حساب من" }),
  ).toBeVisible();
  await page.locator("header").getByRole("link", { name: "اطراف من" }).click();
  await expect(page).toHaveURL(/explore/);
  await expect(
    page.locator("header").getByRole("link", { name: "حساب من" }),
  ).toBeVisible();
  await page.locator("header").getByRole("link", { name: "کشف لقمه" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "ورود / ثبت‌نام" })).toHaveCount(
    0,
  );
  expect(requests).toBe(1);
});

for (const width of [390, 1440]) {
  test(`admin store account and scoped orders at ${width}px`, async ({
    page,
  }, info) => {
    await installFixtures(page, "ADMIN");
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/merchants");
    await page.getByRole("link", { name: /تنظیمات نانوایی/ }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(
      page.getByText("رمز یک‌بارمصرف پیامکی؛ بدون پسورد ثابت"),
    ).toBeVisible();
    await page.getByRole("button", { name: "سفارش‌ها", exact: true }).click();
    await expect(page.getByText("LQ-1024")).toBeVisible();
    await page
      .getByRole("button", { name: "حساب فروشنده", exact: true })
      .click();
    await page.getByLabel("نام و نام خانوادگی").fill("مالک ویرایش‌شده");
    await page
      .getByLabel("علت تغییر برای گزارش حسابرسی")
      .fill("اصلاح اطلاعات با درخواست مالک");
    await page
      .getByRole("button", { name: "ثبت تغییرات", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const mutation = page.waitForRequest(
      (r) => r.method() === "PATCH" && r.url().includes("/account"),
    );
    await page
      .getByRole("button", { name: "تأیید و ذخیره", exact: true })
      .click();
    expect((await mutation).postDataJSON()).toMatchObject({
      action: "UPDATE_ACCOUNT",
      isActive: true,
      fullName: "مالک ویرایش‌شده",
    });
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "ثبت تغییرات", exact: true }),
    ).toBeFocused();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    // Axe may move focus while checking contrast; restore the workflow state.
    await page
      .getByRole("button", { name: "ثبت تغییرات", exact: true })
      .focus();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`merchant-account-${width}.png`),
      fullPage: true,
    });
  });
}

test("owner replacement uses a separate confirmed operation", async ({
  page,
}) => {
  await installFixtures(page, "ADMIN");
  await page.goto("/admin/merchants/ui-store/settings");
  await page.getByRole("button", { name: "تغییر حساب متصل" }).click();
  await page.getByLabel("شماره موبایل حساب فروشنده").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page.getByLabel("نام و نام خانوادگی").fill("مالک جدید");
  await page
    .getByLabel("علت تغییر برای گزارش حسابرسی")
    .fill("انتقال مدیریت با تأیید مالک");
  await page.getByRole("button", { name: "ثبت تغییرات", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("دسترسی حساب مالک قبلی");
  const mutation = page.waitForRequest((r) => r.method() === "PATCH");
  await page
    .getByRole("button", { name: "تأیید و ذخیره", exact: true })
    .click();
  expect((await mutation).postDataJSON()).toMatchObject({
    action: "ASSIGN_OWNER",
    mobile: "09123456789",
  });
});
