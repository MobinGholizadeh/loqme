import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), merchant: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.user }, merchant: { findUnique: mocks.merchant } } }));
import { merchantService } from "@/domain/merchant/merchant.service";
import { pickupService } from "@/domain/pickup/pickup.service";
describe("merchant role and tenant boundary", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["ADMIN", "CUSTOMER"])("denies %s even with an explicit merchant id", async (role) => {
    mocks.user.mockResolvedValue({ role, isActive: true });
    await expect(merchantService.resolveMerchantAndAuthorize("user", "store")).rejects.toThrow("عدم دسترسی");
    expect(mocks.merchant).not.toHaveBeenCalled();
  });
  it("checks ownership after checking seller role", async () => {
    mocks.user.mockResolvedValue({ role: "MERCHANT_OWNER", isActive: true });
    mocks.merchant.mockResolvedValue({ ownerUserId: "other", staff: [] });
    await expect(merchantService.resolveMerchantAndAuthorize("user", "store")).rejects.toThrow("عضو کادر");
    await expect(pickupService.getMerchantPickupQueue("user", "store")).rejects.toThrow("عضو کادر");
  });
  it("allows the active store owner", async () => {
    mocks.user.mockResolvedValue({ role: "MERCHANT_OWNER", isActive: true });
    mocks.merchant.mockResolvedValue({ ownerUserId: "user", staff: [] });
    expect((await merchantService.resolveMerchantAndAuthorize("user", "store")).isOwner).toBe(true);
  });
});
