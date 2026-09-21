import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ find: vi.fn(), consume: vi.fn(), create: vi.fn(), user: vi.fn(), token: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { otpCode: { findFirst: mocks.find, updateMany: mocks.consume, create: mocks.create } } }));
vi.mock('@/domain/user/user.service', () => ({ userService: { findOrCreateCustomer: mocks.user } }));
vi.mock('@/lib/auth/session', () => ({ createSessionToken: mocks.token }));
vi.mock('@/lib/notifications', () => ({ getNotificationService: () => ({ sendOtp: mocks.send }) }));
import { AuthService } from '@/domain/auth/auth.service';
import { hashOtp } from '@/lib/auth/crypto';
describe('OTP single-use database authority', () => {
  const auth = new AuthService();
  beforeEach(async () => {
    vi.resetAllMocks();
    mocks.find.mockResolvedValue({ id: 'otp', codeHash: await hashOtp('12345') });
    mocks.user.mockResolvedValue({ id: 'customer', mobile: '09120000001', role: 'CUSTOMER', isActive: true });
    mocks.token.mockResolvedValue('signed-test-token');
  });
  it('issues one session for simultaneous redemption, and rejects replay', async () => {
    mocks.consume.mockResolvedValue({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    const results = await Promise.all(Array.from({ length: 4 }, () => auth.verifyOtp('09120000001', '12345')));
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(mocks.token).toHaveBeenCalledTimes(1);
    expect((await auth.verifyOtp('09120000001', '12345')).success).toBe(false);
    expect(mocks.consume).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isUsed: false, attempts: { lt: 5 }, expiresAt: { gt: expect.any(Date) } }) }));
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
    await expect(auth.requestOtp('09120000002')).rejects.toThrow();
    expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.token).not.toHaveBeenCalled();
  });
});
