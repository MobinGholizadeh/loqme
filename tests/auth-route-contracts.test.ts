// Unit-test route contracts independently; real JWT-to-RLS binding is covered in rls.integration.test.ts.
vi.mock('@/lib/db/request', () => ({ withDatabaseRequest: (handler: unknown) => handler }));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { auth } = vi.hoisted(() => ({ auth: { requestOtp: vi.fn(), verifyOtp: vi.fn() } }));
vi.mock('@/domain/auth/auth.service', () => ({ authService: auth }));
vi.mock('@/lib/auth/session', () => ({ SESSION_COOKIE_NAME: 'loqme_session', SESSION_COOKIE_OPTIONS: { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 3600 } }));
import { POST as requestOtp } from '@/app/api/auth/request-otp/route';
import { POST as verifyOtp } from '@/app/api/auth/verify-otp/route';
describe('OTP endpoint contracts', () => {
  let requestNumber = 0;
  const request = (body: unknown) => new NextRequest('https://shop.test/api/auth', { method: 'POST', headers: { 'x-real-ip': `192.0.2.${++requestNumber}` }, body: JSON.stringify(body) });
  beforeEach(() => { vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => vi.restoreAllMocks());
  it.each([{}, { mobile: '123' }, { mobile: 'not-a-phone' }])('rejects invalid OTP request %o before dispatch', async body => {
    expect((await requestOtp(request(body))).status).toBe(400); expect(auth.requestOtp).not.toHaveBeenCalled();
  });
  it('normalizes Persian mobile digits and returns the advertised expiry', async () => {
    auth.requestOtp.mockResolvedValue({ success: true, expiresInSeconds: 120, mobile: '09121111111' });
    const response = await requestOtp(request({ mobile: '۰۹۱۲۱۱۱۱۱۱۱' })); expect(response.status).toBe(200); expect(auth.requestOtp).toHaveBeenCalledWith('09121111111'); expect(await response.json()).toMatchObject({ expiresInSeconds: 120 });
  });
  it.each([[120, 429], [undefined, 503]])('distinguishes rate limiting from delivery failure (%s)', async (cooldownSeconds, status) => {
    auth.requestOtp.mockResolvedValue({ success: false, cooldownSeconds }); expect((await requestOtp(request({ mobile: '09121111111' }))).status).toBe(status);
  });
  it.each([{}, { mobile: '09121111111', code: '' }, { mobile: 'invalid', code: '12345' }])('rejects invalid verification payload %o', async body => {
    const response = await verifyOtp(request(body)); expect(response.status).toBe(400); expect(response.headers.has('set-cookie')).toBe(false); expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
  it.each([{ success: false }, { success: true }])('never issues cookies without a successful token-bearing result %o', async result => {
    auth.verifyOtp.mockResolvedValue(result); const response = await verifyOtp(request({ mobile: '09121111111', code: '12345' })); expect(response.status).toBe(400); expect(response.headers.has('set-cookie')).toBe(false);
  });
  it('issues an HTTP-only secure cookie and a non-cacheable mobile token response', async () => {
    auth.verifyOtp.mockResolvedValue({ success: true, token: 'signed', message: 'accepted', user: { id: 'user' } });
    const response = await verifyOtp(request({ mobile: '09121111111', code: '۱۲۳۴۵' })); expect(response.status).toBe(200);
    expect(auth.verifyOtp).toHaveBeenCalledWith('09121111111', '12345'); expect(await response.json()).toMatchObject({ token: 'signed', user: { id: 'user' } });
    const cookie = response.headers.get('set-cookie')!; expect(cookie).toContain('loqme_session=signed'); expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('Secure'); expect(cookie).toContain('SameSite=lax'); expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
  it.each([requestOtp, verifyOtp])('returns a generic server error for exceptions and malformed JSON', async handler => {
    auth.requestOtp.mockRejectedValue(new Error('private detail')); auth.verifyOtp.mockRejectedValue(new Error('private detail'));
    const response = await handler(request({ mobile: '09121111111', code: '12345' })); expect(response.status).toBe(500); expect(await response.text()).not.toContain('private detail');
    expect((await handler(new NextRequest('https://shop.test', { method: 'POST', body: '{' }))).status).toBe(handler === requestOtp ? 400 : 500);
  });
});
