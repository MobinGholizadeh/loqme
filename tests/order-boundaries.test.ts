import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { db, payment, pickup, inventory } = vi.hoisted(() => ({
  db: { payment: { findUnique: vi.fn() }, refund: { findFirst: vi.fn() }, reconciliationCase: { upsert: vi.fn() }, reservation: { findUnique: vi.fn(), updateMany: vi.fn() }, order: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() }, listing: { findUnique: vi.fn() }, customer: { update: vi.fn() }, financialTransaction: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn() },
  payment: { initiateOrderPayment: vi.fn(), verifyPayment: vi.fn() }, pickup: { getOrCreateVerification: vi.fn() }, inventory: { atomicConfirmSold: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/payment/payment.service', () => ({ paymentService: payment }));
vi.mock('@/domain/pickup/pickup.service', () => ({ pickupService: pickup }));
vi.mock('@/domain/inventory/inventory.service', () => ({ inventoryService: inventory }));
import { OrderService } from '@/domain/order/order.service';

describe('Order lifecycle boundaries', () => {
  const service = new OrderService(); const now = new Date('2026-10-02T12:00:00Z');
  const order = () => ({ id: 'order', orderNumber: 'LQ-1', customerId: 'customer', reservationId: 'hold', status: 'PENDING_PAYMENT', totalAmountToman: 100n, merchantPayoutAmountToman: 90n, commissionAmountToman: 10n,
    items: [{ listingId: 'listing', quantity: 1, unitPriceToman: 100n }] });
  const hold = () => ({ id: 'hold', customerId: 'customer', quantity: 2, status: 'PENDING', expiresAt: new Date(now.getTime() + 600000), order: null,
    listing: { id: 'listing', status: 'PUBLISHED', pickupEnd: new Date(now.getTime() + 3600000), discountedPriceToman: 100n, safety: { safetyStatus: 'APPROVED' }, merchant: { id: 'merchant', commissionPercent: 10, verificationStatus: 'APPROVED' } } });
  const checkout = () => service.createOrderFromReservation({ customerId: 'customer', reservationId: 'hold', callbackUrl: 'http://localhost/callback' });
  beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now); vi.spyOn(console, 'warn').mockImplementation(() => {});
    db.reservation.findUnique.mockResolvedValue(hold()); db.reservation.updateMany.mockResolvedValue({ count: 1 });
    db.order.create.mockImplementation(async ({ data }) => ({ id: 'order', ...data })); db.order.findUnique.mockResolvedValue(order()); db.order.update.mockResolvedValue({ ...order(), status: 'READY_FOR_PICKUP' });
    db.$transaction.mockImplementation(fn => fn(db)); db.listing.findUnique.mockResolvedValue({ originalPriceToman: 200n });
    inventory.atomicConfirmSold.mockResolvedValue({ success: true }); payment.initiateOrderPayment.mockResolvedValue({ success: true, authority: 'A', paymentUrl: '/pay' });
    db.payment.findUnique.mockResolvedValue({ id: 'payment', orderId: 'order', status: 'SUCCESS', amountToman: 100n });
    payment.verifyPayment.mockResolvedValue({ success: true, payment: { id: 'payment', amountToman: 100n }, orderId: 'order', referenceId: 'reference' });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it.each([null, { ...{ customerId: 'other' } }, { customerId: 'customer', status: 'EXPIRED' }, { customerId: 'customer', status: 'PENDING', expiresAt: now }])('rejects absent, foreign and expired holds %o', async record => {
    db.reservation.findUnique.mockResolvedValue(record); expect((await checkout()).success).toBe(false); expect(payment.initiateOrderPayment).not.toHaveBeenCalled();
  });
  it.each([null, { safetyStatus: 'UNSAFE' }])('requires positive food safety approval: %o', async safety => {
    const record = hold(); record.listing.safety = safety as never; db.reservation.findUnique.mockResolvedValue(record);
    expect((await checkout()).success).toBe(false); expect(db.order.create).not.toHaveBeenCalled();
  });
  it.each(['PAID', 'READY_FOR_PICKUP', 'COMPLETED', 'REFUNDED', 'CANCELLED'])('does not initiate a second payment for a %s order', async status => {
    db.reservation.findUnique.mockResolvedValue({ ...hold(), order: { ...order(), status } });
    expect((await checkout()).success).toBe(false); expect(payment.initiateOrderPayment).not.toHaveBeenCalled();
  });
  it.each([true, false])('reports gateway result for an existing pending order: %s', async success => {
    db.reservation.findUnique.mockResolvedValue({ ...hold(), order: order() });
    payment.initiateOrderPayment.mockResolvedValue({ success, authority: 'A', paymentUrl: '/pay' });
    expect((await checkout()).success).toBe(success); expect(db.order.create).not.toHaveBeenCalled();
  });
  it.each([undefined, 'provider down'])('reports a new order gateway failure: %s', async errorMessage => {
    payment.initiateOrderPayment.mockResolvedValue({ success: false, errorMessage });
    expect(await checkout()).toMatchObject({ success: false, message: expect.any(String) });
  });
  it.each([0, 10, null])('calculates authoritative totals with commission %s', async commissionPercent => {
    const record = hold(); record.listing.merchant.commissionPercent = commissionPercent as never; db.reservation.findUnique.mockResolvedValue(record);
    const result = await checkout(); expect(result.success).toBe(true);
    expect(result.order.totalAmountToman).toBe(200n); expect(result.order.commissionAmountToman).toBe(BigInt(2 * (commissionPercent ?? 10)));
    expect(result.order.merchantPayoutAmountToman + result.order.commissionAmountToman).toBe(200n);
  });
  it.each([{ success: false }, { success: true }, { success: true, payment: { amountToman: 100n } }])('rejects incomplete verification results: %o', async result => {
    payment.verifyPayment.mockResolvedValue(result); expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(false); expect(db.order.update).not.toHaveBeenCalled();
  });
  it('rejects missing orders and amount mismatches before mutating anything', async () => {
    db.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...order(), totalAmountToman: 101n });
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(false);
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(false); expect(db.reservation.updateMany).not.toHaveBeenCalled();
  });
  it.each(['PAID', 'READY_FOR_PICKUP', 'COMPLETED'])('returns %s orders without ledger or inventory side effects', async status => {
    db.order.findUnique.mockResolvedValue({ ...order(), status, acceptedPaymentId: 'payment' });
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(true);
    expect(inventory.atomicConfirmSold).not.toHaveBeenCalled(); expect(db.financialTransaction.create).not.toHaveBeenCalled();
  });
  it.each([{ status: 'REFUNDED' }, { reservationId: null }])('rejects non-completable state %o', async overrides => {
    db.order.findUnique.mockResolvedValue({ ...order(), ...overrides });
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(false);
  });
  it('rejects an expired claim and propagates inventory failure as a retryable completion failure', async () => {
    db.reservation.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(false); expect(inventory.atomicConfirmSold).not.toHaveBeenCalled();
    inventory.atomicConfirmSold.mockResolvedValue({ success: false });
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(false); expect(db.financialTransaction.create).not.toHaveBeenCalled();
  });
  it.each([null, { originalPriceToman: 100n }, { originalPriceToman: 200n }])('records savings only from positive original-price differences %o', async listing => {
    db.order.findUnique.mockResolvedValue({ ...order(), items: [{ ...order().items[0], originalPriceTomanSnapshot: listing?.originalPriceToman ?? null }] });
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(true);
    expect(db.financialTransaction.create).toHaveBeenCalledTimes(3);
    expect(db.customer.update).toHaveBeenCalledTimes(listing?.originalPriceToman === 200n ? 1 : 0);
  });
  it('keeps committed payment success if optional pickup initialization fails', async () => {
    pickup.getOrCreateVerification.mockRejectedValue(new Error('temporarily unavailable'));
    expect((await service.verifyAndCompleteOrder({ authority: 'A' })).success).toBe(true); expect(console.warn).toHaveBeenCalledOnce();
  });
  it('maps receipt optional details and refuses another customer receipt', async () => {
    const full = { ...order(), createdAt: now, merchant: { id: 'merchant', businessNameFa: 'کافه', locations: [{ addressFa: 'نشانی', city: { nameFa: 'ارومیه' }, neighborhood: { nameFa: 'محله' } }] },
      items: [{ id: 'item', listingId: 'listing', unitPriceToman: 100n, subtotalToman: 100n, quantity: 1, listing: { titleFa: 'بسته', pickupStart: now, pickupEnd: now, safety: { safetyStatus: 'APPROVED' } } }],
      payments: [{ gateway: 'MOCK', status: 'SUCCESS', authority: 'A' }] };
    db.order.findUnique.mockResolvedValueOnce(null).mockResolvedValue(full);
    expect(await service.getOrderById('missing')).toBeNull(); expect(await service.getOrderById('order', 'other')).toBeNull();
    expect(await service.getOrderById('order', 'customer')).toMatchObject({ totalAmountToman: 100, merchant: { cityNameFa: 'ارومیه' }, payment: { authority: 'A' }, items: [{ safetyStatus: 'APPROVED' }] });
    db.order.findUnique.mockResolvedValue({ ...full, merchant: { ...full.merchant, locations: [] }, payments: [], items: [{ ...full.items[0], listing: { ...full.items[0].listing, safety: null } }] });
    expect(await service.getOrderById('order')).toMatchObject({ payment: null, merchant: { addressFa: undefined }, items: [{ safetyStatus: undefined }] });
  });
  it('maps order lists without inventing optional merchant or listing records', async () => {
    db.order.findMany.mockResolvedValue([{ ...order(), createdAt: now, merchant: { businessNameFa: 'کافه', locations: [] }, items: [], review: null, complaints: [] },
      { ...order(), createdAt: now, merchant: { businessNameFa: 'کافه', locations: [{ addressFa: 'نشانی' }] }, items: [{ quantity: 2, listing: { titleFa: 'بسته', pickupStart: now, pickupEnd: now } }], review: { id: 'review' }, complaints: [{ id: 'complaint' }] }]);
    const result = await service.listCustomerOrders('customer');
    expect(result[0]).toMatchObject({ listingTitleFa: 'بسته لقمه', pickupWindowFa: '', pickupEndIso: '', quantity: 1, hasReview: false });
    expect(result[1]).toMatchObject({ quantity: 2, hasReview: true, complaintCount: 1, merchantAddressFa: 'نشانی' }); expect(result[1].pickupWindowFa).toContain(' تا ');
    expect(db.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: 'customer' } }));
  });
});
