import { useDatabaseAdmin } from './helpers/database-admin';
useDatabaseAdmin();
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashOtp } from '@/lib/auth/crypto';
import { POST as verify } from '@/app/api/auth/verify-otp/route';
import { GET as session } from '@/app/api/auth/session/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { proxy as middleware } from '@/proxy';

const mobile = '09127771017';
const request = (path: string, cookie?: string) => new NextRequest(`https://loqme.test${path}`, {
  headers: cookie ? { cookie } : {},
});

describe('cookie-backed login persistence', () => {
  let disposable = false;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.includes('_test_')) throw new Error('Disposable test database required');
    disposable = true;
    await prisma.otpCode.deleteMany({ where: { mobile } });
    await prisma.otpCode.create({ data: { mobile, codeHash: await hashOtp('57182'), expiresAt: new Date(Date.now() + 120000) } });
  });
  afterAll(async () => {
    if (!disposable) return;
    await prisma.otpCode.deleteMany({ where: { mobile } });
    await prisma.customer.deleteMany({ where: { user: { mobile } } });
    await prisma.user.deleteMany({ where: { mobile } });
  });

  it('issues an HttpOnly cookie that authenticates independent session and profile requests', async () => {
    const verified = await verify(new NextRequest('https://loqme.test/api/auth/verify-otp', {
      method: 'POST', body: JSON.stringify({ mobile, code: '57182' }), headers: { 'Content-Type': 'application/json' },
    }));
    expect(verified.status).toBe(200);
    const cookie = verified.cookies.get('loqme_session');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 2592000 });
    expect(verified.headers.get('Cache-Control')).toContain('no-store');
    const header = `loqme_session=${cookie!.value}`;
    for (let i = 0; i < 2; i++) {
      const current = await session(request('/api/auth/session', header));
      expect(await current.json()).toMatchObject({ authenticated: true, user: { mobile, role: 'CUSTOMER' } });
      expect(current.headers.get('Cache-Control')).toContain('no-store');
      const profile = await middleware(request('/profile', header));
      expect(profile.headers.get('location')).toBeNull();
      expect(profile.headers.get('Cache-Control')).toContain('no-store');
    }
    const exited = await logout();
    expect(exited.cookies.get('loqme_session')?.maxAge).toBe(0);
    expect((await middleware(request('/profile'))).headers.get('location')).toContain('/login?redirect=');
  });

  it.each([undefined, 'loqme_session=invalid'])('does not cache anonymous session or protected redirects (%s)', async cookie => {
    const current = await session(request('/api/auth/session', cookie));
    expect(await current.json()).toEqual({ authenticated: false, user: null });
    expect(current.headers.get('Cache-Control')).toContain('no-store');
    const protectedPage = await middleware(request('/profile', cookie));
    expect(protectedPage.status).toBe(307);
    expect(protectedPage.headers.get('Cache-Control')).toContain('no-store');
  });
});
