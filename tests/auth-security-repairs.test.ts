import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { guardOtpRequest } from '@/lib/auth/request-guard';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('authentication abuse boundaries', () => {
  it('rejects cross-site OTP requests before account checks', () => {
    const request = new NextRequest('https://loqme.shop/api/auth/request-otp', {
      headers: { origin: 'https://untrusted.example', 'x-real-ip': '192.0.2.100' },
    });
    expect(guardOtpRequest(request)?.status).toBe(403);
  });
  it('accepts legitimate reverse-proxied production requests with HTTPS origin', () => {
    const request = new NextRequest('http://127.0.0.1:3000/api/auth/request-otp', {
      headers: {
        origin: 'https://loqme.shop',
        host: 'loqme.shop',
        'x-forwarded-host': 'loqme.shop',
        'x-forwarded-proto': 'https',
        'x-real-ip': '192.0.2.100',
      },
    });
    expect(guardOtpRequest(request)).toBeNull();
  });
  it('accepts requests from native mobile clients without origin header', () => {
    const request = new NextRequest('https://loqme.shop/api/auth/request-otp', {
      headers: { 'x-real-ip': '192.0.2.100' },
    });
    expect(guardOtpRequest(request)).toBeNull();
  });
  it('limits one IP across different numbers, ignores spoofed forwarding chains and recovers after expiry', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2030-01-01'));
    const request = () => new NextRequest('https://loqme.shop/api/auth/request-otp', {
      headers: { 'x-real-ip': '192.0.2.101', 'x-forwarded-for': String(Math.random()) },
    });
    for (let i = 0; i < 10; i++) expect(guardOtpRequest(request())).toBeNull();
    const response = guardOtpRequest(request())!;
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('600');
    vi.advanceTimersByTime(600001);
    expect(guardOtpRequest(request())).toBeNull();
  });
  it.each([undefined, 'short', 'loqme-development-session-super-secret-key-change-in-production-32c'])(
    'fails closed for unsafe production signing configuration', async secret => {
      vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SESSION_SECRET', secret);
      await expect(createSessionToken({ userId: 'user', mobile: '09121111111', role: 'CUSTOMER' })).rejects.toThrow('SESSION_SECRET');
      expect(await verifySessionToken('forged')).toBeNull();
    },
  );
});
