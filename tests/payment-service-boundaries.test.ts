import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { db, gateway } = vi.hoisted(() => ({
  db: { payment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, paymentEvent: { create: vi.fn() }, refund: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, order: { update: vi.fn() }, financialTransaction: { create: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn() },
  gateway: { initiatePayment: vi.fn(), verifyPayment: vi.fn(), refundPayment: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/payment/mock.gateway', () => ({ mockPaymentGateway: gateway }));
vi.mock('@/domain/payment/zarinpal.gateway', () => ({ zarinpalGateway: { initiatePayment: gateway.initiatePayment, verifyPayment: gateway.verifyPayment } }));
import { PaymentService } from '@/domain/payment/payment.service';

describe('Payment persistence and refund boundaries', () => {
  afterEach(() => vi.unstubAllEnvs());
  let service: PaymentService;
  const payment = () => ({ id: 'payment', orderId: 'order', gateway: 'MOCK', authority: 'A', status: 'SUCCESS', amountToman: 100n, referenceId: 'reference', order: { merchantPayoutAmountToman: 90n, totalAmountToman: 100n, commissionAmountToman: 10n } });
  beforeEach(() => {
    vi.resetAllMocks(); service = new PaymentService();
    db.payment.findUnique.mockResolvedValue(payment()); db.payment.update.mockImplementation(async ({ data }) => ({ ...payment(), ...data }));
    db.$transaction.mockImplementation(fn => fn(db)); db.refund.create.mockResolvedValue({ id: 'refund' }); db.refund.update.mockResolvedValue({ id: 'refund' });
    gateway.refundPayment.mockResolvedValue({ success: true, refundId: 'gateway-refund' });
  });
  it('does not persist failed initiation and sends authoritative order amounts', async () => {
    gateway.initiatePayment.mockResolvedValue({ success: false });
    const order = { id: 'order', orderNumber: 'LQ-1', totalAmountToman: 100n } as never;
    expect(await service.initiateOrderPayment({ order, gatewayType: 'MOCK', callbackUrl: '/callback' })).toEqual({ success: false });
    expect(db.payment.create).not.toHaveBeenCalled();
    gateway.initiatePayment.mockResolvedValue({ success: true, authority: 'A', paymentUrl: '/pay' });
    await service.initiateOrderPayment({ order, gatewayType: 'MOCK', callbackUrl: '/callback', mobile: '09121111111' });
    expect(gateway.initiatePayment).toHaveBeenLastCalledWith(expect.objectContaining({ amountToman: 100, orderId: 'order' }));
    expect(db.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountToman: 100n, status: 'INITIATED', authority: 'A' }) });
  });
  it('never resolves mock or unimplemented gateways in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => service.getGateway('MOCK')).toThrow();
    expect(() => service.getGateway('SAMAN')).toThrow();
    expect(() => service.getGateway('SADAD')).toThrow();
    expect(service.getGateway('ZARINPAL')).toBeDefined();
  });
  it.each([0n, -1n, 9007199254740993n])('rejects unrepresentable or nonpositive amounts before provider calls (%s)', async amount => {
    expect((await service.initiateOrderPayment({ order: { totalAmountToman: amount } as never, gatewayType: 'MOCK', callbackUrl: '/callback' })).success).toBe(false);
    db.payment.findUnique.mockResolvedValue({ ...payment(), status: 'INITIATED', amountToman: amount });
    expect((await service.verifyPayment({ authority: 'A' })).success).toBe(false);
    expect(gateway.initiatePayment).not.toHaveBeenCalled(); expect(gateway.verifyPayment).not.toHaveBeenCalled(); expect(db.payment.create).not.toHaveBeenCalled();
  });
  it('rejects unimplemented gateways even outside production', () => {
    expect(() => service.getGateway('SAMAN')).toThrow();
    expect(() => service.getGateway('SADAD')).toThrow();
  });
  it('rejects missing verification records and short-circuits successful callbacks', async () => {
    db.payment.findUnique.mockResolvedValueOnce(null);
    expect((await service.verifyPayment({ authority: 'missing' })).success).toBe(false);
    expect(await service.verifyPayment({ authority: 'A' })).toMatchObject({ success: true, referenceId: 'reference', orderId: 'order' });
    db.payment.findUnique.mockResolvedValueOnce({ ...payment(), referenceId: null });
    expect((await service.verifyPayment({ authority: 'A' })).referenceId).toBeUndefined();
    expect(gateway.verifyPayment).not.toHaveBeenCalled();
  });
  it('does not re-verify or resurrect a refunded payment', async () => {
    db.payment.findUnique.mockResolvedValue({ ...payment(), status: 'REFUNDED' });
    expect((await service.verifyPayment({ authority: 'A' })).success).toBe(false);
    expect(gateway.verifyPayment).not.toHaveBeenCalled(); expect(db.payment.update).not.toHaveBeenCalled();
  });
  it.each(['declined', undefined])('records failed verification and never marks it successful (%s)', async errorMessage => {
    db.payment.findUnique.mockResolvedValue({ ...payment(), status: 'INITIATED' }); gateway.verifyPayment.mockResolvedValue({ success: false, errorMessage });
    expect(await service.verifyPayment({ authority: 'A', ipAddress: '127.0.0.1' })).toMatchObject({ success: false, errorMessage: expect.any(String) });
    expect(db.paymentEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'VERIFY_FAILED', ipAddress: '127.0.0.1' }) });
    expect(db.payment.update).toHaveBeenCalledWith({ where: { id: 'payment' }, data: { status: 'FAILED', errorMessage } });
  });
  it.each([undefined, 'caller-tracking'])('records successful verification and tracking precedence %s', async trackingCode => {
    db.payment.findUnique.mockResolvedValue({ ...payment(), status: 'INITIATED' });
    gateway.verifyPayment.mockResolvedValue({ success: true, referenceId: 'R', trackingCode: 'gateway-tracking', rawPayload: { receipt: 'R' } });
    expect(await service.verifyPayment({ authority: 'A', trackingCode })).toMatchObject({ success: true, referenceId: 'R' });
    expect(db.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'SUCCESS', referenceId: 'R', trackingCode: trackingCode || 'gateway-tracking' } }));
  });
  it.each([null, { ...{ status: 'FAILED' } }])('rejects refunds of missing/unsuccessful payments', async record => {
    db.payment.findUnique.mockResolvedValue(record);
    expect((await service.refundPayment({ paymentId: 'payment', reasonFa: 'لغو' })).success).toBe(false);
    expect(gateway.refundPayment).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, Infinity, 0.5, 101, 50])('rejects invalid or unsupported partial refund %s before contacting the provider', async amountToman => {
    expect((await service.refundPayment({ paymentId: 'payment', reasonFa: 'لغو', amountToman })).success).toBe(false);
    expect(gateway.refundPayment).not.toHaveBeenCalled(); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('does not fabricate a settled refund when the adapter has no refund operation', async () => {
    db.payment.findUnique.mockResolvedValue({ ...payment(), gateway: 'ZARINPAL' });
    expect((await service.refundPayment({ paymentId: 'payment', reasonFa: 'لغو' })).success).toBe(false);
    expect(db.refund.create).not.toHaveBeenCalled(); expect(db.financialTransaction.create).not.toHaveBeenCalled();
  });
  it.each(['provider rejected', undefined])('leaves financial state unchanged on a refund rejection %s', async errorMessage => {
    gateway.refundPayment.mockResolvedValue({ success: false, errorMessage });
    expect(await service.refundPayment({ paymentId: 'payment', reasonFa: 'لغو' })).toMatchObject({ success: false, errorMessage: expect.any(String) });
    expect(db.refund.update).toHaveBeenCalledWith({ where: { id: 'refund' }, data: { status: 'REJECTED' } });
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it.each([0n, 10n])('settles a full refund with balanced ledger reversal and commission %s', async commission => {
    const record = payment(); record.order.commissionAmountToman = commission; record.order.merchantPayoutAmountToman = 100n - commission;
    db.payment.findUnique.mockResolvedValue(record);
    expect(await service.refundPayment({ paymentId: 'payment', reasonFa: 'لغو', processedByUserId: 'admin' })).toEqual({ success: true, refund: { id: 'refund' } });
    expect(gateway.refundPayment).toHaveBeenCalledWith({ authority: 'A', amountToman: 100, reason: 'لغو' });
    expect(db.refund.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amountToman: 100n, status: 'REQUESTED', processedByUserId: 'admin' }) });
    const transfers = db.financialTransaction.create.mock.calls.map(([arg]) => arg.data);
    const clearingBalance = transfers.reduce((sum, t) => sum + (t.creditAccount === 'PLATFORM_CLEARING' ? t.amountToman : 0n) - (t.debitAccount === 'PLATFORM_CLEARING' ? t.amountToman : 0n), 0n);
    expect(clearingBalance).toBe(0n); expect(transfers).toHaveLength(commission ? 3 : 2);
    expect(db.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REFUNDED' }) }));
  });
  it('reports adapter resolution exceptions as unhealthy', async () => {
    vi.spyOn(service, 'getGateway').mockImplementation(() => { throw new Error('configuration'); });
    expect(await service.checkGatewayHealth('MOCK')).toMatchObject({ healthy: false, error: 'configuration' });
  });
  it('reports a missing adapter as unhealthy', async () => {
    vi.spyOn(service, 'getGateway').mockReturnValue(undefined as never);
    expect((await service.checkGatewayHealth('MOCK')).healthy).toBe(false);
  });
});

