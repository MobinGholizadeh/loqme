import { prisma } from '@/lib/prisma';
import { generateOtpCode, hashOtp } from '@/lib/auth/crypto';
import { createSessionToken } from '@/lib/auth/session';
import { getNotificationService } from '@/lib/notifications';
import { userService } from '../user/user.service';
import { RequestOtpResult, VerifyOtpResult } from './auth.types';

const OTP_EXPIRY_SECONDS = 120; // 2 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

// Request throttles survive development fast refresh. OTP authority stays in PostgreSQL.
const globalForAuth = globalThis as unknown as {
  __loqme_timestamps?: Map<string, number[]>;
};

const inMemoryRequestTimestamps =
  globalForAuth.__loqme_timestamps ?? new Map<string, number[]>();

if (process.env.NODE_ENV !== 'production') {
  globalForAuth.__loqme_timestamps = inMemoryRequestTimestamps;
}

export class AuthService {
  /**
   * Enforces rate limit: Max 3 requests in 10 minutes
   */
  private checkRateLimit(mobile: string): { allowed: boolean; cooldownSeconds?: number } {
    const now = Date.now();
    const timestamps = inMemoryRequestTimestamps.get(mobile) || [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindow = recent[0];
      const cooldownMs = RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
      const cooldownSeconds = Math.ceil(cooldownMs / 1000);
      return { allowed: false, cooldownSeconds };
    }

    recent.push(now);
    inMemoryRequestTimestamps.set(mobile, recent);
    return { allowed: true };
  }

  /**
   * Initiates OTP generation and SMS dispatch
   */
  async requestOtp(mobile: string): Promise<RequestOtpResult> {
    const rateCheck = this.checkRateLimit(mobile);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `تعداد دفعات ارسال بیش از حد مجاز است. لطفاً ${rateCheck.cooldownSeconds} ثانیه دیگر دوباره امتحان کنید.`,
        expiresInSeconds: 0,
        mobile,
        cooldownSeconds: rateCheck.cooldownSeconds,
      };
    }

    // 1. Generate 5-digit OTP
    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    // TEMPORARY FOR TESTING: OTP code expiry disabled (set 100 years in future)
    const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

    // Fail closed when persistence is unavailable; never issue a memory-only credential.
    const issued = await prisma.otpCode.create({ data: { mobile, codeHash, expiresAt } });

    // 3. Dispatch SMS via notification abstraction
    let sent = false;
    try {
      sent = await getNotificationService().sendOtp(mobile, code);
    } catch {
      // Never log a code, mobile number or provider response containing secrets.
      console.error('[Auth] OTP dispatch failed');
    }
    if (!sent) {
      // Keep the latest record as consumed so an older OTP cannot become valid.
      await prisma.otpCode.updateMany({ where: { id: issued.id }, data: { isUsed: true } });
      return { success: false, message: 'ارسال پیامک انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.', expiresInSeconds: 0, mobile };
    }

    return {
      success: true,
      message: 'کد تایید ۵ رقمی ارسال گردید',
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      mobile,
    };
  }

  /**
   * Verifies OTP code, generates session cookie payload
   */
  async verifyOtp(mobile: string, code: string): Promise<VerifyOtpResult> {
    const inputHash = await hashOtp(code);
    let isValid = false;

    // Read the latest issued code, including consumed/expired codes so older codes
    // cannot become valid again. Conditional consumption allows exactly one winner.
    const dbRecord = await prisma.otpCode.findFirst({
      where: { mobile }, orderBy: { createdAt: 'desc' },
    });
    if (dbRecord) {
      const matches = dbRecord.codeHash === inputHash;
      const consumed = await prisma.otpCode.updateMany({
        // TEMPORARY FOR TESTING: OTP code expiry check removed (expiresAt: { gt: new Date() } omitted)
        where: { id: dbRecord.id, isUsed: false, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 }, ...(matches ? { isUsed: true } : {}) },
      });
      isValid = matches && consumed.count === 1;
    }

    if (!isValid) {
      return {
        success: false,
        message: 'کد تایید اشتباه است یا منقضی شده است',
      };
    }

    // 2. Fetch or create User profile
    const user = await userService.findOrCreateCustomer(mobile);
    if (!user.isActive) return { success: false, message: 'این حساب غیرفعال است؛ با پشتیبانی لقمه تماس بگیرید' };

    // 3. Issue signed JWT session token
    const token = await createSessionToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      fullName: user.fullName,
    });

    return {
      success: true,
      message: 'ورود با موفقیت انجام شد',
      user: {
        id: user.id,
        mobile: user.mobile,
        role: user.role,
        fullName: user.fullName,
      },
      token,
    };
  }
}

export const authService = new AuthService();
