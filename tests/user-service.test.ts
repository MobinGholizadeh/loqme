import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ user: { findUnique: vi.fn(), create: vi.fn() } }));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
import { UserService } from '@/domain/user/user.service';

describe('User lookup and development fallback isolation', () => {
  const service = new UserService();
  const user = { id: 'user', mobile: '09120000000', role: 'CUSTOMER', isActive: true, createdAt: new Date(), customer: { fullName: 'نام' } };
  beforeEach(() => { vi.resetAllMocks(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  it('returns database identity with or without an optional customer profile', async () => {
    db.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce({ ...user, customer: null }).mockResolvedValueOnce(null);
    expect(await service.findByMobile(user.mobile)).toMatchObject({ id: 'user', fullName: 'نام' });
    expect(await service.findByMobile(user.mobile)).toMatchObject({ fullName: null });
    expect(await service.findByMobile(user.mobile)).toBeNull();
  });
  it('reuses an existing identity and creates new users only as customers', async () => {
    db.user.findUnique.mockResolvedValueOnce(user).mockResolvedValue(null);
    expect((await service.findOrCreateCustomer(user.mobile)).id).toBe('user'); expect(db.user.create).not.toHaveBeenCalled();
    db.user.create.mockResolvedValueOnce(user).mockResolvedValueOnce({ ...user, customer: null });
    expect((await service.findOrCreateCustomer(user.mobile)).fullName).toBe('نام');
    expect(db.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'CUSTOMER' }) }));
    expect((await service.findOrCreateCustomer(user.mobile)).fullName).toBeNull();
  });
  it('never substitutes offline demo identities in production', async () => {
    vi.stubEnv('NODE_ENV', 'production'); const error = new Error('offline'); db.user.findUnique.mockRejectedValue(error);
    await expect(service.findByMobile('09123333333')).rejects.toBe(error);
    await expect(service.findOrCreateCustomer('09123333333')).rejects.toBe(error);
  });
  it('retains a stable customer identity only in development fallback', async () => {
    vi.stubEnv('NODE_ENV', 'development'); db.user.findUnique.mockRejectedValue(new Error('offline')); db.user.create.mockRejectedValue(new Error('offline'));
    expect(await service.findByMobile('not-a-user')).toBeNull();
    expect(await service.findByMobile('09121111111')).toMatchObject({ role: 'CUSTOMER' });
    const created = await service.findOrCreateCustomer('09129999888');
    expect(created).toMatchObject({ role: 'CUSTOMER', isActive: true, fullName: 'کاربر 9888' });
    expect((await service.findOrCreateCustomer('09129999888')).id).toBe(created.id);
  });
});
