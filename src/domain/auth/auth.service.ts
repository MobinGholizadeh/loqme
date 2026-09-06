import { prisma } from '@/lib/prisma';
import { generateOtpCode, hashOtp } from '@/lib/auth/crypto';
import { createSessionToken } from '@/lib/auth/session';
import { getNotificationService } from '@/lib/notifications';
import { userService } from '../user/user.service';
import { RequestOtpResult, VerifyOtpResult } from './auth.types';

const OTP_EXPIRY_SECONDS = 120; // 2 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

interface MemoryOtpRecord {
  mobile: string;
  codeHash: string;
  expiresAt: Date;
  isUsed: boolean;
  attempts: number;
}

// Global development caches to survive fast refresh and multiple route handlers
const globalForAuth = globalThis as unknown as {
  __loqme_otp_store?: Map<string, MemoryOtpRecord>;
  __loqme_timestamps?: Map<string, number[]>;
};

const inMemoryOtpStore =
  globalForAuth.__loqme_otp_store ?? new Map<string, MemoryOtpRecord>();
const inMemoryRequestTimestamps =
  globalForAuth.__loqme_timestamps ?? new Map<string, number[]>();

if (process.env.NODE_ENV !== 'production') {
  globalForAuth.__loqme_otp_store = inMemoryOtpStore;
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
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    // 2. Persist OTP in DB (with in-memory fallback)
    try {
      await prisma.otpCode.create({
        data: {
          mobile,
          codeHash,
          expiresAt,
        },
      });
    } catch {
      // Fallback for offline dev
      inMemoryOtpStore.set(mobile, {
        mobile,
        codeHash,
        expiresAt,
        isUsed: false,
        attempts: 0,
      });
    }

    // Always keep latest active OTP in memory for dev lookup / tests
    inMemoryOtpStore.set(mobile, {
      mobile,
      codeHash,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    // 3. Dispatch SMS via notification abstraction
    const notificationService = getNotificationService();
    await notificationService.sendOtp(mobile, code);

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

    // 1. Check DB first
    try {
      const dbRecord = await prisma.otpCode.findFirst({
        where: {
          mobile,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbRecord && dbRecord.codeHash === inputHash) {
        isValid = true;
        await prisma.otpCode.update({
          where: { id: dbRecord.id },
          data: { isUsed: true },
        });
      }
    } catch {
      // Fallback to in-memory check
    }

    // Fallback to in-memory check if not verified in DB
    if (!isValid) {
      const memRecord = inMemoryOtpStore.get(mobile);
      if (
        memRecord &&
        !memRecord.isUsed &&
        memRecord.expiresAt > new Date() &&
        memRecord.codeHash === inputHash
      ) {
        isValid = true;
        memRecord.isUsed = true;
      }
    }

    if (!isValid) {
      return {
        success: false,
        message: 'کد تایید اشتباه است یا منقضی شده است',
      };
    }

    // 2. Fetch or create User profile
    const user = await userService.findOrCreateCustomer(mobile);

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
