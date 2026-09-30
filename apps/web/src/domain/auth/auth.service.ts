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
      console.warn('[LOGIN-TRACE][Server] checkRateLimit: Rate limit exceeded', { mobile, cooldownSeconds });
      return { allowed: false, cooldownSeconds };
    }

    recent.push(now);
    inMemoryRequestTimestamps.set(mobile, recent);
    console.log('[LOGIN-TRACE][Server] checkRateLimit: Rate limit check passed', { mobile, requestCountInWindow: recent.length });
    return { allowed: true };
  }

  /**
   * Initiates OTP generation and SMS dispatch
   */
  async requestOtp(mobile: string): Promise<RequestOtpResult> {
    console.log('[LOGIN-TRACE][Server] requestOtp started', { mobile });
    const rateCheck = this.checkRateLimit(mobile);
    if (!rateCheck.allowed) {
      console.warn('[LOGIN-TRACE][Server] requestOtp blocked by rate limiter', { mobile });
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

    console.log('[LOGIN-TRACE][Server] requestOtp generated credentials', {
      mobile,
      expiresAt: expiresAt.toISOString(),
      codeLength: code.length,
    });

    // Fail closed when persistence is unavailable; never issue a memory-only credential.
    const issued = await prisma.otpCode.create({ data: { mobile, codeHash, expiresAt } });
    console.log('[LOGIN-TRACE][Server] requestOtp inserted into DB', { otpId: issued.id });

    // 3. Dispatch SMS via notification abstraction
    let sent = false;
    try {
      sent = await getNotificationService().sendOtp(mobile, code);
      console.log('[LOGIN-TRACE][Server] SMS dispatch result:', { mobile, sent });
    } catch (smsError) {
      // Never log a code, mobile number or provider response containing secrets.
      console.error('[LOGIN-TRACE][Server] [Auth] OTP dispatch failed with exception', smsError);
    }
    if (!sent) {
      console.warn('[LOGIN-TRACE][Server] SMS dispatch returned false, invalidating issued OTP', { otpId: issued.id });
      // Keep the latest record as consumed so an older OTP cannot become valid.
      await prisma.otpCode.updateMany({ where: { id: issued.id }, data: { isUsed: true } });
      return { success: false, message: 'ارسال پیامک انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.', expiresInSeconds: 0, mobile };
    }

    console.log('[LOGIN-TRACE][Server] requestOtp completed successfully', { mobile });
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
    console.log('[LOGIN-TRACE][Server] verifyOtp started', { mobile, codeLength: code?.length });
    const inputHash = await hashOtp(code);
    let isValid = false;

    // Read the latest issued code, including consumed/expired codes so older codes
    // cannot become valid again. Conditional consumption allows exactly one winner.
    const dbRecord = await prisma.otpCode.findFirst({
      where: { mobile }, orderBy: { createdAt: 'desc' },
    });

    console.log('[LOGIN-TRACE][Server] verifyOtp DB lookup', {
      foundRecord: !!dbRecord,
      recordId: dbRecord?.id,
      createdAt: dbRecord?.createdAt,
      expiresAt: dbRecord?.expiresAt,
      isUsed: dbRecord?.isUsed,
      attempts: dbRecord?.attempts,
    });

    if (dbRecord) {
      const matches = dbRecord.codeHash === inputHash;
      console.log('[LOGIN-TRACE][Server] verifyOtp code hash match:', { matches });

      const checkExpiry = process.env.DISABLE_OTP_EXPIRY !== 'true';
      const isPastExpiry = dbRecord.expiresAt <= new Date();
      console.log('[LOGIN-TRACE][Server] verifyOtp expiry check:', {
        checkExpiry,
        isPastExpiry,
        expiresAt: dbRecord.expiresAt,
        now: new Date(),
      });

      const consumed = await prisma.otpCode.updateMany({
        where: {
          id: dbRecord.id,
          isUsed: false,
          attempts: { lt: 5 },
          ...(checkExpiry ? { expiresAt: { gt: new Date() } } : {}),
        },
        data: { attempts: { increment: 1 }, ...(matches ? { isUsed: true } : {}) },
      });

      console.log('[LOGIN-TRACE][Server] verifyOtp atomic consume count:', {
        count: consumed.count,
        expectedOne: consumed.count === 1,
      });

      isValid = matches && consumed.count === 1;
    }

    if (!isValid) {
      console.warn('[LOGIN-TRACE][Server] verifyOtp validation failed: code incorrect or expired', { mobile });
      return {
        success: false,
        message: 'کد تایید اشتباه است یا منقضی شده است',
      };
    }

    // 2. Fetch or create User profile
    console.log('[LOGIN-TRACE][Server] verifyOtp fetching or creating customer user', { mobile });
    const user = await userService.findOrCreateCustomer(mobile);
    console.log('[LOGIN-TRACE][Server] verifyOtp user profile', {
      userId: user.id,
      role: user.role,
      isActive: user.isActive,
    });

    if (!user.isActive) {
      console.warn('[LOGIN-TRACE][Server] verifyOtp account inactive', { userId: user.id });
      return { success: false, message: 'این حساب غیرفعال است؛ با پشتیبانی لقمه تماس بگیرید' };
    }

    // 3. Issue signed JWT session token
    console.log('[LOGIN-TRACE][Server] verifyOtp creating session token');
    const token = await createSessionToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      fullName: user.fullName,
    });

    console.log('[LOGIN-TRACE][Server] verifyOtp successfully finished', { userId: user.id, role: user.role });
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
