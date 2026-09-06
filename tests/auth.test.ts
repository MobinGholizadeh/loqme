import { describe, it, expect } from 'vitest';
import { generateOtpCode, hashOtp } from '@/lib/auth/crypto';
import { RequestOtpSchema, VerifyOtpSchema } from '@/domain/auth/auth.schema';
import { authService } from '@/domain/auth/auth.service';
import { ConsoleMockNotificationService } from '@/lib/notifications/console-mock';

describe('Authentication & OTP Security Domain', () => {
  it('generates a 5-digit cryptographically secure numerical OTP', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{5}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(10000);
      expect(num).toBeLessThanOrEqual(99999);
    }
  });

  it('hashes OTP consistently and produces 64-character hex strings (SHA-256)', async () => {
    const code = '54321';
    const hash1 = await hashOtp(code);
    const hash2 = await hashOtp(code);
    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);

    const diffHash = await hashOtp('54322');
    expect(diffHash).not.toBe(hash1);
  });

  it('validates RequestOtpSchema correctly with Zod', () => {
    const valid = RequestOtpSchema.safeParse({ mobile: '09123456789' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.mobile).toBe('09123456789');
    }

    const invalid = RequestOtpSchema.safeParse({ mobile: '12345' });
    expect(invalid.success).toBe(false);
  });

  it('validates VerifyOtpSchema correctly with Zod', () => {
    const valid = VerifyOtpSchema.safeParse({
      mobile: '09123456789',
      code: '12345',
    });
    expect(valid.success).toBe(true);

    const invalidCode = VerifyOtpSchema.safeParse({
      mobile: '09123456789',
      code: '123', // less than 5 digits
    });
    expect(invalidCode.success).toBe(false);
  });

  it('executes end-to-end OTP request and verification flow', async () => {
    const testMobile = '09129999999';

    // 1. Request OTP
    const requestResult = await authService.requestOtp(testMobile);
    expect(requestResult.success).toBe(true);
    expect(requestResult.expiresInSeconds).toBe(120);

    // 2. Fetch mock dispatched OTP
    const sentRecord = ConsoleMockNotificationService.getRecentOtp(testMobile);
    expect(sentRecord).toBeDefined();
    expect(sentRecord?.code).toMatch(/^\d{5}$/);

    // 3. Verify with wrong code should fail
    const wrongVerify = await authService.verifyOtp(testMobile, '00000');
    expect(wrongVerify.success).toBe(false);

    // 4. Verify with correct code should succeed
    const correctVerify = await authService.verifyOtp(testMobile, sentRecord!.code);
    expect(correctVerify.success).toBe(true);
    expect(correctVerify.token).toBeDefined();
    expect(correctVerify.user?.mobile).toBe(testMobile);
  });

  it('enforces rate limiting on repeated OTP requests', async () => {
    const rateMobile = '09128888888';

    // 1st request
    const r1 = await authService.requestOtp(rateMobile);
    expect(r1.success).toBe(true);

    // 2nd request
    const r2 = await authService.requestOtp(rateMobile);
    expect(r2.success).toBe(true);

    // 3rd request
    const r3 = await authService.requestOtp(rateMobile);
    expect(r3.success).toBe(true);

    // 4th request must be rate limited!
    const r4 = await authService.requestOtp(rateMobile);
    expect(r4.success).toBe(false);
    expect(r4.cooldownSeconds).toBeGreaterThan(0);
  });
});
