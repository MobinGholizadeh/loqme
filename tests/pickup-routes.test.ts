import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { auth, pickup, db, context } = vi.hoisted(() => ({
  context: vi.fn(),
  auth: { extractSessionToken: vi.fn(), verifySessionToken: vi.fn() },
  pickup: { getCustomerPickupCredentials: vi.fn(), verifyPickup: vi.fn(), getMerchantPickupQueue: vi.fn(), sweepNoShows: vi.fn() },
  db: { customer: { findUnique: vi.fn() }, user: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/auth/session', () => auth); vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/pickup/pickup.service', () => ({ pickupService: pickup }));
vi.mock('@/domain/merchant/merchant-access.service', () => ({ requireMerchantContext: context }));
import { GET as credentials } from '@/app/api/pickup/credentials/[orderId]/route';
import { GET as queue } from '@/app/api/merchant/pickup/queue/route';
import { POST as verify } from '@/app/api/pickup/verify/route';
import { POST as sweep } from '@/app/api/pickup/no-show/route';
describe('Pickup route authentication and scope', () => {
  const params = { params: Promise.resolve({ orderId: 'order' }) };
  const req = (body?: unknown) => new NextRequest('http://localhost/api/pickup', body ? { method: 'POST', body: JSON.stringify(body) } : {});
  beforeEach(() => {
    vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
    context.mockResolvedValue({ merchantId: 'merchant' });
    db.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });
    auth.extractSessionToken.mockReturnValue('token'); auth.verifySessionToken.mockResolvedValue({ userId: 'user', role: 'MERCHANT_OWNER' }); db.customer.findUnique.mockResolvedValue({ id: 'customer' });
    pickup.getCustomerPickupCredentials.mockResolvedValue({ orderId: 'order' }); pickup.getMerchantPickupQueue.mockResolvedValue([{ orderId: 'order' }]); pickup.verifyPickup.mockResolvedValue({ statusCode: 200, response: { success: true } }); pickup.sweepNoShows.mockResolvedValue({ success: true, sweptCount: 0, orderIds: [] });
  });
  afterEach(() => vi.restoreAllMocks());
  it.each([['credentials', (r: NextRequest) => credentials(r, params)], ['queue', queue], ['verify', verify], ['sweep', sweep]] as const)('rejects missing or invalid sessions for %s', async (_, handler) => {
    auth.extractSessionToken.mockReturnValueOnce(null); expect((await handler(req())).status).toBe(401);
    auth.verifySessionToken.mockResolvedValueOnce(null); expect((await handler(req())).status).toBe(401);
    expect(pickup.sweepNoShows).not.toHaveBeenCalled(); expect(pickup.verifyPickup).not.toHaveBeenCalled(); expect(pickup.getCustomerPickupCredentials).not.toHaveBeenCalled();
  });
  it('never bypasses ownership when an authenticated user lacks a customer profile', async () => {
    db.customer.findUnique.mockResolvedValue(null); expect((await credentials(req(), params)).status).toBe(404); expect(pickup.getCustomerPickupCredentials).not.toHaveBeenCalled();
  });
  it('scopes ordinary credentials to the customer and reserves the override for administrators', async () => {
    const response = await credentials(req(), params); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(pickup.getCustomerPickupCredentials).toHaveBeenCalledWith('order', 'customer');
    auth.verifySessionToken.mockResolvedValue({ userId: 'admin', role: 'ADMIN' }); db.customer.findUnique.mockResolvedValue(null);
    expect((await credentials(req(), params)).status).toBe(200); expect(pickup.getCustomerPickupCredentials).toHaveBeenLastCalledWith('order', undefined);
  });
  it('handles missing IDs, hidden orders and database failures', async () => {
    expect((await credentials(req(), { params: Promise.resolve({ orderId: '' }) })).status).toBe(400);
    pickup.getCustomerPickupCredentials.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    expect((await credentials(req(), params)).status).toBe(404); expect((await credentials(req(), params)).status).toBe(500);
  });
  it('passes queue scope through domain authorization and reports denial separately', async () => {
    expect((await queue(req())).status).toBe(200); expect(pickup.getMerchantPickupQueue).toHaveBeenCalledWith('user', undefined);
    const response = await queue(new NextRequest('http://localhost/api/merchant/pickup/queue?merchantId=store'));
    expect(await response.json()).toMatchObject({ count: 1, data: [{ orderId: 'order' }] }); expect(pickup.getMerchantPickupQueue).toHaveBeenLastCalledWith('user', 'store');
    pickup.getMerchantPickupQueue.mockRejectedValueOnce(new Error('عدم دسترسی')).mockRejectedValueOnce(new Error('offline'));
    expect((await queue(req())).status).toBe(403); expect((await queue(req())).status).toBe(500);
  });
  it('validates pickup proof, uses the authenticated actor and preserves domain status', async () => {
    expect((await verify(req({}))).status).toBe(400); expect(pickup.verifyPickup).not.toHaveBeenCalled();
    expect((await verify(req({ orderId: 'order', otpCode: '1234', merchantUserId: 'attacker' }))).status).toBe(200);
    expect(pickup.verifyPickup).toHaveBeenCalledWith(expect.objectContaining({ merchantUserId: 'user', orderId: 'order', otpCode: '1234' }));
    pickup.verifyPickup.mockResolvedValueOnce({ statusCode: 409, response: { success: false } }).mockRejectedValueOnce(new Error('offline'));
    expect((await verify(req({ otpCode: '1234' }))).status).toBe(409); expect((await verify(req({ otpCode: '1234' }))).status).toBe(500);
    expect((await verify(new NextRequest('http://localhost', { method: 'POST', body: '{' }))).status).toBe(400);
  });
  it('denies customer-triggered sweeps and reports authorized sweep failures safely', async () => {
    auth.verifySessionToken.mockResolvedValueOnce({ role: 'CUSTOMER' }); expect((await sweep(req())).status).toBe(403); expect(pickup.sweepNoShows).not.toHaveBeenCalled();
    expect((await sweep(req())).status).toBe(200); pickup.sweepNoShows.mockRejectedValue(new Error('offline')); expect((await sweep(req())).status).toBe(500);
  });
});
