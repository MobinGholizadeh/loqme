import { withDatabaseService } from '@/lib/db/context';
import { prisma } from '@/lib/prisma';
import { generateOtpCode, hashOtp } from '@/lib/auth/crypto';
import { createSessionToken } from '@/lib/auth/session';
import { getNotificationService } from '@/lib/notifications';
import { userService } from '../user/user.service';
import { RequestOtpResult, VerifyOtpResult } from './auth.types';

const OTP_EXPIRY_SECONDS = Number(process.env.OTP_EXPIRY_SECONDS) || 15 * 60; // 15 minutes (900 seconds)
const OTP_RESEND_COOLDOWN_SECONDS = 120; // 2 minutes resend cooldown
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

export interface RequestOtpOptions {
  mode?: 'login' | 'register';
  audience?: 'customer' | 'business';
  checkExists?: boolean;
}

export class AuthService {
  /**
   * Enforces rate limit: Max 3 requests in 10 minutes
   */
  private checkRateLimit(mobile: string): { allowed: boolean; cooldownSeconds?: number } {
    const now = Date.now();
    for (const [key, times] of Array.from(inMemoryRequestTimestamps.entries())) {
      if (!times.some(t => now - t < RATE_LIMIT_WINDOW_MS)) inMemoryRequestTimestamps.delete(key);
    }
    if (!inMemoryRequestTimestamps.has(mobile) && inMemoryRequestTimestamps.size >= 10000) {
      return { allowed: false, cooldownSeconds: 600 };
    }
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
  async requestOtp(mobile: string, options?: RequestOtpOptions): Promise<RequestOtpResult> {
    return withDatabaseService('auth', mobile, async () => {
    const rateCheck = this.checkRateLimit(mobile);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `تعداد دفعات ارسال بیش از حد مجاز است؛ لطفاً ${rateCheck.cooldownSeconds} ثانیه دیگر دوباره امتحان کنید`,
        expiresInSeconds: 0,
        mobile,
        cooldownSeconds: rateCheck.cooldownSeconds,
      };
    }

    const shouldCheckExists = options?.checkExists === true || options?.mode !== 'register';
    const isRegister = options?.mode === 'register';

    if (shouldCheckExists || isRegister) {
      const existingUser = await userService.findByMobile(mobile);

      if (existingUser && !existingUser.isActive) {
        return { success: false, code: 'ACCOUNT_UNAVAILABLE', message: 'ورود به این حساب امکان‌پذیر نیست؛ با پشتیبانی لقمه تماس بگیرید', expiresInSeconds: 0, mobile };
      }

      if (shouldCheckExists && !existingUser) {
        return {
          success: false,
          code: 'ACCOUNT_NOT_FOUND',
          message: options?.audience === 'business'
            ? 'حساب کاربری با این شماره یافت نشد؛ برای ثبت فروشگاه، لطفاً ثبت کسب‌وکار را انجام دهید'
            : 'حساب کاربری با این شماره یافت نشد؛ می‌توانید از بخش ثبت‌نام، حساب جدید بسازید',
          expiresInSeconds: 0,
          mobile,
        };
      }

      if (isRegister && existingUser) {
        return {
          success: false,
          code: 'ACCOUNT_ALREADY_EXISTS',
          message: 'این شماره موبایل قبلاً در لقمه ثبت شده است؛ لطفاً وارد حساب خود شوید',
          expiresInSeconds: 0,
          mobile,
        };
      }
    }

    // 1. Generate 5-digit OTP
    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

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
      return { success: false, message: 'ارسال پیامک انجام نشد؛ لطفاً کمی بعد دوباره تلاش کنید', expiresInSeconds: 0, mobile };
    }

    return {
      success: true,
      message: 'کد تایید ۵ رقمی ارسال گردید',
      expiresInSeconds: OTP_EXPIRY_SECONDS,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      mobile,
    };
  
    });
  }

  /**
   * Verifies OTP code, generates session cookie payload
   */
  async verifyOtp(mobile: string, code: string): Promise<VerifyOtpResult> {
    return withDatabaseService('auth', mobile, async () => {
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
        where: {
          id: dbRecord.id,
          isUsed: false,
          attempts: { lt: 5 },
          expiresAt: { gt: new Date() },
          // Also bound age so codes issued by the former long-expiry implementation expire.
          createdAt: { gt: new Date(Date.now() - OTP_EXPIRY_SECONDS * 1000) },
        },
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
    if (!user.isActive) {
      return { success: false, message: 'این حساب غیرفعال است؛ با پشتیبانی لقمه تماس بگیرید' };
    }

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
  
    });
  }
}

export const authService = new AuthService();
