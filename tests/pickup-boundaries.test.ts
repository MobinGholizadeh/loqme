import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { db, qr, merchants } = vi.hoisted(() => ({
  db: { order: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), updateManyAndReturn: vi.fn() }, pickupVerification: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, user: { findUnique: vi.fn() }, merchant: { findMany: vi.fn() }, merchantStaff: { findMany: vi.fn() }, $transaction: vi.fn() },
  qr: { toDataURL: vi.fn(), toString: vi.fn() }, merchants: { resolveMerchantAndAuthorize: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('qrcode', () => ({ default: qr }));
vi.mock('@/domain/merchant/merchant.service', () => ({ merchantService: merchants }));
import { PickupService } from '@/domain/pickup/pickup.service';

describe('Pickup security and boundary behavior', () => {
  const service = new PickupService();
  const now = new Date();
  const verification = () => ({ id: 'verification', otpCode: '1234', isVerified: false, attemptCount: 0, lockedUntil: null, verifiedAt: null });
  const order = () => ({ id: 'order', orderNumber: 'LQ-1', customerId: 'customer', status: 'READY_FOR_PICKUP', totalAmountToman: 100n, createdAt: now,
    customer: { fullName: 'مشتری', user: { mobile: '09121111111' } }, merchant: { id: 'merchant', businessNameFa: 'فروشگاه', ownerUserId: 'owner', staff: [], locations: [{ latitude: 37, longitude: 45, addressFa: 'نشانی', phone: '123' }] },
    items: [{ quantity: 2, listing: { titleFa: 'بسته', pickupStart: new Date(Date.now() - 60000), pickupEnd: new Date(Date.now() + 60000) } }], pickupVerification: verification() });
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv('SESSION_SECRET', 'test-only-pickup-secret');
    vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
    db.order.findUnique.mockResolvedValue(order()); db.user.findUnique.mockResolvedValue({ role: 'MERCHANT_OWNER', isActive: true });
    db.pickupVerification.updateMany.mockResolvedValue({ count: 1 }); db.order.updateMany.mockResolvedValue({ count: 1 }); db.$transaction.mockImplementation(fn => fn(db));
    qr.toDataURL.mockResolvedValue('data:image/png;base64,TEST'); qr.toString.mockResolvedValue('<svg/>');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  function signed(payload: unknown) { const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${encoded}.${crypto.createHmac('sha256', 'test-only-pickup-secret').update(encoded).digest('base64url')}`; }
  it.each(['bad', 'a.b.c', 'a.b'])('rejects malformed QR token %s', token => { expect(service.verifyDynamicQrToken(token).valid).toBe(false); });
  it.each([{ t: 1 }, { orderId: 'order' }, { orderId: {}, t: Math.floor(Date.now() / 1000) }, { orderId: 'order', t: 'not-a-number' }])('rejects invalid signed payload %o', payload => { expect(service.verifyDynamicQrToken(signed(payload)).valid).toBe(false); });
  it('rejects future QR tokens and accepts the freshness boundary', () => {
    const t = Math.floor(Date.now() / 1000);
    expect(service.verifyDynamicQrToken(service.generateDynamicQrToken('order', t + 31)).valid).toBe(false);
    expect(service.verifyDynamicQrToken(service.generateDynamicQrToken('order', t - 180)).valid).toBe(true);
  });
  it('does not verify an order without customer proof', async () => {
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderId: 'order' })).response.success).toBe(false);
    expect(db.pickupVerification.updateMany).not.toHaveBeenCalled();
  });
  it.each(['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'NO_SHOW'])('cannot complete an order in state %s', async status => {
    db.order.findUnique.mockResolvedValue({ ...order(), status });
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderId: 'order', otpCode: '1234' })).response.success).toBe(false);
    expect(db.pickupVerification.updateMany).not.toHaveBeenCalled();
  });
  it('rejects invalid QR before querying and returns missing-order errors', async () => {
    expect((await service.verifyPickup({ merchantUserId: 'owner', qrToken: 'invalid' })).statusCode).toBe(400); expect(db.order.findUnique).not.toHaveBeenCalled();
    db.order.findUnique.mockResolvedValue(null); expect((await service.verifyPickup({ merchantUserId: 'owner', orderNumber: 'LQ-1', otpCode: '1234' })).statusCode).toBe(404);
  });
  it.each([null, { role: 'ADMIN', isActive: false }, { role: 'CUSTOMER', isActive: true }])('rejects inactive or unauthorized actors %o', async user => {
    db.user.findUnique.mockResolvedValue(user);
    expect((await service.verifyPickup({ merchantUserId: 'stranger', orderId: 'order', otpCode: '1234' })).statusCode).toBe(403); expect(db.pickupVerification.updateMany).not.toHaveBeenCalled();
  });
  it('enforces existing lockout and duplicate pickup guards', async () => {
    db.order.findUnique.mockResolvedValueOnce({ ...order(), pickupVerification: { ...verification(), lockedUntil: new Date(Date.now() + 60000) } });
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderId: 'order', otpCode: '1234' })).statusCode).toBe(429);
    db.order.findUnique.mockResolvedValueOnce({ ...order(), pickupVerification: { ...verification(), isVerified: true, verifiedAt: now } });
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderId: 'order', otpCode: '1234' })).response.alreadyVerified).toBe(true);
  });
  it.each([0, 4])('records incorrect OTP and locks after five attempts, starting from %s', async attemptCount => {
    db.order.findUnique.mockResolvedValue({ ...order(), pickupVerification: { ...verification(), attemptCount } });
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderId: 'order', otpCode: '0000' })).statusCode).toBe(400);
    expect(db.pickupVerification.update).toHaveBeenCalledWith({ where: { id: 'verification' }, data: { attemptCount: attemptCount + 1, lockedUntil: attemptCount === 4 ? expect.any(Date) : null } });
  });
  it('accepts Persian OTP/order digits and reports concurrent consumption', async () => {
    db.pickupVerification.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderNumber: ' lq-۱ ', otpCode: '۱۲۳۴' })).statusCode).toBe(409);
    expect(db.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { orderNumber: 'LQ-1' } }));
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderNumber: 'LQ-1', otpCode: '1234' })).response).toMatchObject({ success: true, status: 'COMPLETED', quantity: 2 });
  });
  it('scopes OTP-only lookup to accessible stores', async () => {
    db.merchant.findMany.mockResolvedValue([{ id: 'owned' }]); db.merchantStaff.findMany.mockResolvedValue([{ merchantId: 'staffed' }, { merchantId: 'owned' }]);
    db.pickupVerification.findFirst.mockResolvedValue({ order: order() });
    expect((await service.verifyPickup({ merchantUserId: 'owner', otpCode: '1234' })).response.success).toBe(true);
    expect(db.pickupVerification.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ order: expect.objectContaining({ merchantId: { in: ['owned', 'staffed'] } }) }) }));
  });
  it('conceals missing or foreign customer orders', async () => {
    db.order.findUnique.mockResolvedValueOnce(null); expect(await service.getCustomerPickupCredentials('order', 'customer')).toBeNull();
    expect(await service.getCustomerPickupCredentials('order', 'foreign')).toBeNull(); expect(qr.toDataURL).not.toHaveBeenCalled();
  });
  it.each(['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'NO_SHOW'])('does not issue usable credentials for %s orders', async status => {
    db.order.findUnique.mockResolvedValue({ ...order(), status }); expect(await service.getCustomerPickupCredentials('order', 'customer')).toBeNull(); expect(qr.toDataURL).not.toHaveBeenCalled();
  });
  it('returns owned credentials and still provides OTP after QR rendering failure', async () => {
    const result = await service.getCustomerPickupCredentials('order', 'customer');
    expect(result).toMatchObject({ orderId: 'order', otpCode: '1234', qrSvg: '<svg/>', quantity: 2, merchant: { directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=37,45' } });
    qr.toDataURL.mockRejectedValue(new Error('render failure'));
    expect(await service.getCustomerPickupCredentials('order', 'customer')).toMatchObject({ otpCode: '1234', qrSvg: '', qrDataUrl: '' });
  });
  it('creates verification once or reuses the existing record', async () => {
    db.pickupVerification.findUnique.mockResolvedValueOnce(verification()).mockResolvedValueOnce(null); db.pickupVerification.create.mockResolvedValue(verification());
    expect(await service.getOrCreateVerification('order')).toMatchObject({ id: 'verification' }); expect(db.pickupVerification.create).not.toHaveBeenCalled();
    await service.getOrCreateVerification('order'); expect(db.pickupVerification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'order', otpCode: expect.stringMatching(/^\d{4}$/), qrCodeHash: expect.stringMatching(/^[a-f0-9]{64}$/), isVerified: false }) });
  });
  it('does not consume pickup proof if the paid-order claim loses a race', async () => {
    db.order.updateMany.mockResolvedValue({ count: 0 });
    expect((await service.verifyPickup({ merchantUserId: 'owner', orderId: 'order', otpCode: '1234' })).statusCode).toBe(409);
    expect(db.pickupVerification.updateMany).not.toHaveBeenCalled();
  });
  it('only reports orders actually swept and rechecks paid/uncollected state during mutation', async () => {
    db.order.findMany.mockResolvedValueOnce([]); expect(await service.sweepNoShows()).toEqual({ success: true, sweptCount: 0, orderIds: [] });
    db.order.findMany.mockResolvedValue([{ id: 'expired' }, { id: 'collected-concurrently' }]); db.order.updateManyAndReturn.mockResolvedValue([{ id: 'expired' }]);
    expect(await service.sweepNoShows()).toEqual({ success: true, sweptCount: 1, orderIds: ['expired'] });
    expect(db.order.updateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ['PAID', 'READY_FOR_PICKUP'] }, OR: [{ pickupVerification: null }, { pickupVerification: { isVerified: false } }] }) }));
  });
});
