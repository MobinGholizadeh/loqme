import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Pin this boundary suite's two-minute policy instead of inheriting the deployment default.
vi.hoisted(() => { process.env.OTP_EXPIRY_SECONDS = '120'; });
const mocks = vi.hoisted(() => ({ find: vi.fn(), consume: vi.fn(), create: vi.fn(), user: vi.fn(), token: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { otpCode: { findFirst: mocks.find, updateMany: mocks.consume, create: mocks.create } } }));
vi.mock('@/domain/user/user.service', () => ({ userService: { findByMobile: vi.fn().mockResolvedValue(null), findOrCreateCustomer: mocks.user } }));
vi.mock('@/lib/auth/session', () => ({ createSessionToken: mocks.token }));
vi.mock('@/lib/notifications', () => ({ getNotificationService: () => ({ sendOtp: mocks.send }) }));
import { AuthService } from '@/domain/auth/auth.service';
import { hashOtp } from '@/lib/auth/crypto';
describe('OTP single-use database authority', () => {
  const auth = new AuthService();
  beforeEach(async () => {
    vi.resetAllMocks();
    const { userService } = await import('@/domain/user/user.service');
    vi.mocked(userService.findByMobile).mockResolvedValue(null);
    mocks.find.mockResolvedValue({ id: 'otp', codeHash: await hashOtp('12345') });
    mocks.user.mockResolvedValue({ id: 'customer', mobile: '09120000001', role: 'CUSTOMER', isActive: true });
    mocks.token.mockResolvedValue('signed-test-token');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  it('persists the same two-minute expiry that it advertises to the customer', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
    mocks.create.mockResolvedValue({ id: 'new-code' }); mocks.send.mockResolvedValue(true);
    const result = await auth.requestOtp('09120000777', { mode: 'register' });
    expect(result.expiresInSeconds).toBe(120);
    expect(mocks.create.mock.calls[0][0].data.expiresAt.getTime()).toBe(Date.now() + 120000);
  });
  it('always requires an unexpired code even if a legacy bypass flag is present', async () => {
    vi.stubEnv('DISABLE_OTP_EXPIRY', 'true');
    mocks.consume.mockResolvedValue({ count: 0 });
    expect((await auth.verifyOtp('09120000001', '12345')).success).toBe(false);
    expect(mocks.consume).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ expiresAt: { gt: expect.any(Date) } }) }));
  });
  it('bounds credential age even when a legacy row has a far-future expiry', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-03T12:00:00Z'));
    mocks.consume.mockResolvedValue({ count: 0 });
    expect((await auth.verifyOtp('09120000001', '12345')).success).toBe(false);
    expect(mocks.consume).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ createdAt: { gt: new Date(Date.now() - 120000) } }) }));
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it('issues one session for simultaneous redemption, and rejects replay', async () => {
    mocks.consume.mockResolvedValue({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    const results = await Promise.all(Array.from({ length: 4 }, () => auth.verifyOtp('09120000001', '12345')));
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(mocks.token).toHaveBeenCalledTimes(1);
    expect((await auth.verifyOtp('09120000001', '12345')).success).toBe(false);
    expect(mocks.consume).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isUsed: false, attempts: { lt: 5 } }) }));
  });
  it('rejects expired/exhausted codes and counts incorrect attempts', async () => {
    mocks.consume.mockResolvedValue({ count: 0 });
    expect((await auth.verifyOtp('09120000001', '12345')).success).toBe(false);
    mocks.consume.mockResolvedValue({ count: 1 });
    expect((await auth.verifyOtp('09120000001', '00000')).success).toBe(false);
    expect(mocks.consume).toHaveBeenLastCalledWith(expect.objectContaining({ data: { attempts: { increment: 1 } } }));
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it('fails closed on database failures without issuing or sending credentials', async () => {
    mocks.find.mockRejectedValue(new Error('database unavailable'));
    await expect(auth.verifyOtp('09120000001', '12345')).rejects.toThrow();
    mocks.create.mockRejectedValue(new Error('database unavailable'));
    await expect(auth.requestOtp('09120000002', { mode: 'register' })).rejects.toThrow();
    expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.token).not.toHaveBeenCalled();
  });
  it.each([false, 'throws'])('invalidates an OTP and reports failure when dispatch %s', async failure => {
    mocks.create.mockResolvedValue({ id: 'failed-send' });
    if (failure === false) mocks.send.mockResolvedValue(false);
    else mocks.send.mockRejectedValue(new Error('provider unavailable'));
    const result = await auth.requestOtp(failure === false ? '09120000003' : '09120000004', { mode: 'register' });
    expect(result).toMatchObject({ success: false, expiresInSeconds: 0 });
    expect(result.message).toContain('ارسال پیامک انجام نشد');
    expect(mocks.consume).toHaveBeenCalledWith({ where: { id: 'failed-send' }, data: { isUsed: true } });
    expect(mocks.token).not.toHaveBeenCalled();
  });
});
