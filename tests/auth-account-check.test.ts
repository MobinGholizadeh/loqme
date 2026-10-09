import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as checkAccountGet, POST as checkAccountPost } from '@/app/api/auth/check-account/route';
import { POST as requestOtpRoute } from '@/app/api/auth/request-otp/route';
import { authService } from '@/domain/auth/auth.service';
import { userService } from '@/domain/user/user.service';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    otpCode: {
      create: vi.fn().mockResolvedValue({ id: 'otp-123' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/notifications', () => ({
  getNotificationService: () => ({
    sendOtp: vi.fn().mockResolvedValue(true),
  }),
}));

describe('Account Existence Pre-Check & Guardrails', () => {
  let clock = Date.now();
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(clock += 660000));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('retired account lookup', () => {
    it('does not disclose account existence, role, status or phone', async () => {
      const lookup = vi.spyOn(userService, 'findByMobile');
      for (const handler of [checkAccountGet, checkAccountPost]) {
        const response = handler();
        expect(response.status).toBe(410);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        const body = await response.json();
        for (const field of ['exists', 'mobile', 'role', 'isActive']) expect(body).not.toHaveProperty(field);
      }
      expect(lookup).not.toHaveBeenCalled();
    });
  });

  describe('AuthService.requestOtp with mode constraints', () => {
    it('throttles missing accounts before repeating database lookups', async () => {
      const lookup = vi.spyOn(userService, 'findByMobile').mockResolvedValue(null);
      for (let i = 0; i < 3; i++) expect((await authService.requestOtp('09125554444')).code).toBe('ACCOUNT_NOT_FOUND');
      expect((await authService.requestOtp('09125554444')).cooldownSeconds).toBeGreaterThan(0);
      expect(lookup).toHaveBeenCalledTimes(3);
    });
    it('does not persist or dispatch codes to disabled users', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.spyOn(userService, 'findByMobile').mockResolvedValue({ id: 'disabled', mobile: '09125554445', role: 'CUSTOMER', isActive: false, fullName: null, createdAt: new Date() });
      expect((await authService.requestOtp('09125554445')).code).toBe('ACCOUNT_UNAVAILABLE');
      expect(prisma.otpCode.create).not.toHaveBeenCalled();
    });

    it('defaults to login even with checkExists false and never writes an OTP', async () => {
      const { prisma } = await import('@/lib/prisma');
      vi.spyOn(userService, 'findByMobile').mockResolvedValue(null);
      const result = await authService.requestOtp('09124443333', { checkExists: false });
      expect(result.code).toBe('ACCOUNT_NOT_FOUND');
      expect(prisma.otpCode.create).not.toHaveBeenCalled();
    });
    it('blocks OTP dispatch in login mode if user does not exist', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce(null);

      const result = await authService.requestOtp('09129998877', { mode: 'login' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_NOT_FOUND');
      expect(result.message).toContain('حساب کاربری با این شماره یافت نشد');
    });

    it('allows OTP dispatch in login mode when user exists', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce({
        id: 'u-1',
        mobile: '09121111111',
        role: 'CUSTOMER',
        isActive: true,
        fullName: 'کاربر موجود',
        createdAt: new Date(),
      });

      const result = await authService.requestOtp('09121111111', { mode: 'login' });
      expect(result.success).toBe(true);
      expect(result.expiresInSeconds).toBe(900);
    });

    it('blocks OTP dispatch in register mode if user already exists', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce({
        id: 'u-1',
        mobile: '09121111111',
        role: 'CUSTOMER',
        isActive: true,
        fullName: 'کاربر موجود',
        createdAt: new Date(),
      });

      const result = await authService.requestOtp('09121111111', { mode: 'register' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_ALREADY_EXISTS');
      expect(result.message).toContain('قبلاً در لقمه ثبت شده است');
    });

    it('allows OTP dispatch in register mode when user is new', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce(null);

      const result = await authService.requestOtp('09127776655', { mode: 'register' });
      expect(result.success).toBe(true);
      expect(result.expiresInSeconds).toBe(900);
    });
  });

  describe('POST /api/auth/request-otp endpoint contracts with mode', () => {
    it('returns HTTP 404 with ACCOUNT_NOT_FOUND when login mode user is missing', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce(null);

      const req = new NextRequest('https://shop.test/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile: '09129998877', mode: 'login' }),
      });
      const res = await requestOtpRoute(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe('ACCOUNT_NOT_FOUND');
      expect(data.success).toBe(false);
    });

    it('returns HTTP 409 with ACCOUNT_ALREADY_EXISTS when register mode user exists', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce({
        id: 'u-1',
        mobile: '09121111111',
        role: 'CUSTOMER',
        isActive: true,
        fullName: 'کاربر موجود',
        createdAt: new Date(),
      });

      const req = new NextRequest('https://shop.test/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile: '09121111111', mode: 'register' }),
      });
      const res = await requestOtpRoute(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.code).toBe('ACCOUNT_ALREADY_EXISTS');
      expect(data.success).toBe(false);
    });
  });
});
