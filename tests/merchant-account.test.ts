import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMerchantAccountSchema } from "@loqme/validation";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  merchant: vi.fn(),
  updateMerchant: vi.fn(),
  account: vi.fn(),
  updateAccount: vi.fn(),
  createAccount: vi.fn(),
  deleteStaff: vi.fn(),
  upsertStaff: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.actor },
    merchant: { findUnique: mocks.merchant },
    $transaction: mocks.transaction,
  },
}));
import {
  getMerchantAccount,
  updateMerchantAccount,
} from "@/domain/admin/merchant-account.service";
const ownerId = "00000000-0000-4000-8000-000000000001";
const account = {
  id: ownerId,
  mobile: "09122222222",
  role: "MERCHANT_OWNER",
  isActive: true,
  customer: { fullName: "مالک" },
  _count: { ownedStores: 1 },
};
const update = {
  action: "UPDATE_ACCOUNT" as const,
  expectedOwnerId: ownerId,
  fullName: "مالک ویرایش‌شده",
  isActive: false,
  reasonFa: "درخواست صاحب حساب",
};
const assign = {
  action: "ASSIGN_OWNER" as const,
  expectedOwnerId: ownerId,
  fullName: "مالک جدید",
  mobile: "09123456789",
  reasonFa: "انتقال مالکیت فروشگاه",
};
describe("admin merchant accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.mockResolvedValue({ role: "ADMIN", isActive: true });
    mocks.merchant.mockResolvedValue({
      id: "store",
      ownerUserId: ownerId,
      owner: account,
      staff: [],
      orders: [],
      _count: { orders: 0 },
      businessNameFa: "فروشگاه",
    });
    mocks.account.mockResolvedValue(null);
    mocks.createAccount.mockResolvedValue({ id: "new-owner" });
    mocks.transaction.mockImplementation((fn) =>
      fn({
        merchant: { findUnique: mocks.merchant, update: mocks.updateMerchant },
        user: {
          findUnique: mocks.account,
          update: mocks.updateAccount,
          create: mocks.createAccount,
        },
        merchantStaff: {
          deleteMany: mocks.deleteStaff,
          upsert: mocks.upsertStaff,
        },
        auditLog: { create: mocks.audit },
      }),
    );
  });
  it.each(["CUSTOMER", "MERCHANT_OWNER", "MERCHANT_STAFF"])(
    "denies %s",
    async (role) => {
      mocks.actor.mockResolvedValue({ role, isActive: true });
      await expect(getMerchantAccount("actor", "store")).rejects.toThrow(
        "عدم دسترسی",
      );
      await expect(
        updateMerchantAccount("actor", "store", update),
      ).rejects.toThrow("عدم دسترسی");
      expect(mocks.merchant).not.toHaveBeenCalled();
    },
  );
  it("returns only a scoped account DTO without passwords or pickup credentials", async () => {
    const result = await getMerchantAccount("admin", "store", 2);
    expect(result.owner.mobile).toBe("09122222222");
    expect(result.page).toBe(2);
    expect(mocks.merchant).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "store" },
        include: expect.objectContaining({
          orders: expect.objectContaining({ skip: 20, take: 20 }),
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toMatch(/password|otpCode|qrToken/);
  });
  it("audits an account status change atomically", async () => {
    await updateMerchantAccount("admin", "store", update);
    expect(mocks.updateAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ownerId },
        data: expect.objectContaining({ isActive: false }),
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin",
          entityId: "store",
          action: "ADMIN_MERCHANT_UPDATE_ACCOUNT",
        }),
      }),
    );
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
  it("rejects a stale owner before mutating", async () => {
    await expect(
      updateMerchantAccount("admin", "store", {
        ...update,
        expectedOwnerId: "00000000-0000-4000-8000-000000000002",
      }),
    ).rejects.toThrow("مالک فروشگاه تغییر کرده");
    expect(mocks.updateAccount).not.toHaveBeenCalled();
  });
  it("creates an independent owner and revokes previous-owner store membership", async () => {
    await updateMerchantAccount("admin", "store", assign);
    expect(mocks.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "MERCHANT_OWNER",
          mobile: assign.mobile,
        }),
      }),
    );
    expect(mocks.updateMerchant).toHaveBeenCalledWith({
      where: { id: "store" },
      data: { ownerUserId: "new-owner" },
    });
    expect(mocks.deleteStaff).toHaveBeenCalledWith({
      where: { merchantId: "store", userId: ownerId },
    });
    expect(mocks.audit).toHaveBeenCalled();
  });
  it("refuses assigning an admin login", async () => {
    mocks.account.mockResolvedValue({ id: "other-admin", role: "ADMIN" });
    await expect(
      updateMerchantAccount("admin", "store", assign),
    ).rejects.toThrow("حساب مدیر");
    expect(mocks.updateMerchant).not.toHaveBeenCalled();
  });
  it("refuses an account attached to a different merchant", async () => {
    mocks.account.mockResolvedValue({
      role: "MERCHANT_OWNER",
      ownedStores: [{ id: "other" }],
      staffRoles: [],
    });
    await expect(
      updateMerchantAccount("admin", "store", assign),
    ).rejects.toThrow("فروشگاه دیگری");
  });
  it("does not silently disable an account shared by several stores", async () => {
    mocks.merchant.mockResolvedValue({
      ownerUserId: ownerId,
      owner: { ...account, _count: { ownedStores: 2 } },
    });
    await expect(
      updateMerchantAccount("admin", "store", update),
    ).rejects.toThrow("چند فروشگاه");
  });
  it("normalizes Persian mobile and requires an audit reason", () => {
    expect(
      AdminMerchantAccountSchema.parse({ ...assign, mobile: "۰۹۱۲۳۴۵۶۷۸۹" })
        .action,
    ).toBe("ASSIGN_OWNER");
    expect(
      AdminMerchantAccountSchema.safeParse({ ...assign, reasonFa: "" }).success,
    ).toBe(false);
  });
});
