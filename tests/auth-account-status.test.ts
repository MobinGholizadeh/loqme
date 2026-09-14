import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ otp: vi.fn(), issue: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { otpCode: { findFirst: mocks.otp, update: vi.fn() } } }));
vi.mock("@/lib/auth/session", () => ({ createSessionToken: mocks.issue }));
vi.mock("@/domain/user/user.service", () => ({ userService: { findOrCreateCustomer: vi.fn().mockResolvedValue({ id: "disabled", mobile: "09129999971", role: "MERCHANT_OWNER", isActive: false }) } }));
import { authService } from "@/domain/auth/auth.service";
import { hashOtp } from "@/lib/auth/crypto";
describe("disabled merchant login", () => {
  it("does not issue a session even when the submitted OTP is valid", async () => {
    mocks.otp.mockResolvedValue({ id: "otp", codeHash: await hashOtp("12345") });
    const result = await authService.verifyOtp("09129999971", "12345");
    expect(result.success).toBe(false);
    expect(result.message).toContain("غیرفعال");
    expect(mocks.issue).not.toHaveBeenCalled();
  });
});
