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
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET & POST /api/auth/check-account', () => {
    it('returns exists: true when user is present in database', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce({
        id: 'user-1',
        mobile: '09121111111',
        role: 'CUSTOMER',
        isActive: true,
        fullName: 'کاربر تست',
        createdAt: new Date(),
      });

      const getReq = new NextRequest('https://shop.test/api/auth/check-account?mobile=09121111111');
      const getRes = await checkAccountGet(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.exists).toBe(true);
      expect(getData.role).toBe('CUSTOMER');

      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce({
        id: 'user-1',
        mobile: '09121111111',
        role: 'CUSTOMER',
        isActive: true,
        fullName: 'کاربر تست',
        createdAt: new Date(),
      });

      const postReq = new NextRequest('https://shop.test/api/auth/check-account', {
        method: 'POST',
        body: JSON.stringify({ mobile: '۰۹۱۲۱۱۱۱۱۱۱' }),
      });
      const postRes = await checkAccountPost(postReq);
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.exists).toBe(true);
      expect(postData.mobile).toBe('09121111111');
    });

    it('returns exists: false when user is NOT in database', async () => {
      vi.spyOn(userService, 'findByMobile').mockResolvedValueOnce(null);

      const getReq = new NextRequest('https://shop.test/api/auth/check-account?mobile=09120000000');
      const getRes = await checkAccountGet(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.exists).toBe(false);
      expect(getData.message).toContain('حساب کاربری با این شماره یافت نشد');
    });

    it('rejects invalid mobile numbers with 400', async () => {
      const getReq = new NextRequest('https://shop.test/api/auth/check-account?mobile=123');
      const getRes = await checkAccountGet(getReq);
      expect(getRes.status).toBe(400);

      const postReq = new NextRequest('https://shop.test/api/auth/check-account', {
        method: 'POST',
        body: JSON.stringify({ mobile: 'invalid-phone' }),
      });
      const postRes = await checkAccountPost(postReq);
      expect(postRes.status).toBe(400);
    });
  });

  describe('AuthService.requestOtp with mode constraints', () => {
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
      expect(result.expiresInSeconds).toBe(120);
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
      expect(result.expiresInSeconds).toBe(120);
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
