import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { orderService } from '@/domain/order/order.service';
import { reservationService } from '@/domain/reservation/reservation.service';
import { inventoryService } from '@/domain/inventory/inventory.service';
import { pickupService } from '@/domain/pickup/pickup.service';
import { paymentService } from '@/domain/payment/payment.service';
import { mockPaymentGateway } from '@/domain/payment/mock.gateway';

describe('Payment completion atomicity and replay', () => {
  const run = randomUUID(); let userId: string; let customerId: string; let merchantId: string; let categoryId: string;
  const listingIds: string[] = []; const orderIds: string[] = [];
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.startsWith('/loqme_onboarding_test_')) throw new Error('Disposable database required');
    const user = await prisma.user.create({ data: { mobile: `payment-${run}`, customer: { create: {} } }, include: { customer: true } });
    userId = user.id; customerId = user.customer!.id;
    merchantId = (await prisma.merchant.create({ data: { ownerUserId: userId, businessNameFa: 'آزمون پرداخت', verificationStatus: 'APPROVED', commissionPercent: 0 } })).id;
    categoryId = (await prisma.category.findFirstOrThrow()).id;
  });
  afterAll(async () => {
    await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.financialTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.reservation.deleteMany({ where: { listingId: { in: listingIds } } });
    await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
    if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
    if (userId) await prisma.user.delete({ where: { id: userId } });
  });
  async function checkout() {
    const now = new Date();
    const listing = await prisma.listing.create({ data: { merchantId, categoryId, titleFa: 'بسته پرداخت', status: 'PUBLISHED', originalPriceToman: 200, discountedPriceToman: 100,
      pickupDate: now, pickupStart: now, pickupEnd: new Date(Date.now() + 3600000), inventory: { create: { totalQuantity: 5 } }, safety: { create: { safetyStatus: 'APPROVED' } } } });
    listingIds.push(listing.id);
    const hold = await reservationService.createReservation({ listingId: listing.id, customerId }); expect(hold.success).toBe(true);
    const order = await orderService.createOrderFromReservation({ customerId, reservationId: hold.reservation!.id, gateway: 'MOCK', callbackUrl: 'http://localhost/callback' });
    expect(order.success).toBe(true); orderIds.push(order.order.id); return { listing, hold: hold.reservation!, order };
  }
  it('claims concurrent refunds once before making the external transfer', async () => {
    const { order } = await checkout(); await orderService.verifyAndCompleteOrder({ authority: order.authority! });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { authority: order.authority! } });
    const provider = vi.spyOn(mockPaymentGateway, 'refundPayment').mockResolvedValue({ success: true, refundId: 'refund-once' });
    try {
      const results = await Promise.all(Array.from({ length: 4 }, () => paymentService.refundPayment({ paymentId: payment.id, reasonFa: 'آزمون همزمانی' })));
      expect(results.filter(result => result.success)).toHaveLength(1); expect(provider).toHaveBeenCalledOnce();
      expect(await prisma.refund.count({ where: { paymentId: payment.id, status: 'SETTLED' } })).toBe(1);
      expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id, type: 'CUSTOMER_REFUND' } })).toBe(2);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
    } finally { provider.mockRestore(); }
  });
  it('retains an uncertain refund claim and refuses to send a duplicate transfer', async () => {
    const { order } = await checkout(); await orderService.verifyAndCompleteOrder({ authority: order.authority! });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { authority: order.authority! } });
    const provider = vi.spyOn(mockPaymentGateway, 'refundPayment').mockRejectedValue(new Error('connection lost after transfer'));
    try {
      expect((await paymentService.refundPayment({ paymentId: payment.id, reasonFa: 'آزمون قطع ارتباط' })).success).toBe(false);
      expect((await paymentService.refundPayment({ paymentId: payment.id, reasonFa: 'تلاش مجدد' })).success).toBe(false);
      expect(provider).toHaveBeenCalledOnce(); expect(await prisma.refund.count({ where: { paymentId: payment.id, status: 'REQUESTED' } })).toBe(1);
      expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id, type: 'CUSTOMER_REFUND' } })).toBe(0);
    } finally { provider.mockRestore(); }
  });
  it('allows a new refund only after an explicit provider rejection', async () => {
    const { order } = await checkout(); await orderService.verifyAndCompleteOrder({ authority: order.authority! });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { authority: order.authority! } });
    const provider = vi.spyOn(mockPaymentGateway, 'refundPayment').mockResolvedValueOnce({ success: false, outcome: 'DECLINED' } as never).mockResolvedValueOnce({ success: true });
    try {
      expect((await paymentService.refundPayment({ paymentId: payment.id, reasonFa: 'رد درگاه' })).success).toBe(false);
      expect((await paymentService.refundPayment({ paymentId: payment.id, reasonFa: 'تلاش مجدد' })).success).toBe(true);
      expect(await prisma.refund.count({ where: { paymentId: payment.id, status: 'REJECTED' } })).toBe(1);
      expect(await prisma.refund.count({ where: { paymentId: payment.id, status: 'SETTLED' } })).toBe(1);
    } finally { provider.mockRestore(); }
  });
  it('preserves a legitimate zero-percent merchant commission', async () => {
    const { order } = await checkout(); expect(order.order.commissionAmountToman).toBe(0n); expect(order.order.merchantPayoutAmountToman).toBe(100n);
  });
  it('completes concurrent callbacks exactly once and never reopens a collected order', async () => {
    const { listing, order } = await checkout();
    const before = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    const results = await Promise.all(Array.from({ length: 4 }, () => orderService.verifyAndCompleteOrder({ authority: order.authority! })));
    expect(results.every(result => result.success)).toBe(true);
    expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id } })).toBe(3);
    expect(await inventoryService.getInventory(listing.id)).toMatchObject({ soldQuantity: 1, reservedQuantity: 0 });
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).cumulativeSavingsToman - before.cumulativeSavingsToman).toBe(100n);
    await prisma.order.update({ where: { id: order.order.id }, data: { status: 'COMPLETED' } });
    expect((await orderService.verifyAndCompleteOrder({ authority: order.authority! })).success).toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.order.id } })).status).toBe('COMPLETED');
    expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id } })).toBe(3);
  });
  it('does not mark an order ready when its reservation has already been released', async () => {
    const { order, hold, listing } = await checkout();
    await reservationService.cancelReservation(hold.id, customerId);
    expect((await orderService.verifyAndCompleteOrder({ authority: order.authority! })).success).toBe(false);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.order.id } })).status).toBe('PENDING_PAYMENT');
    expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id } })).toBe(0);
    expect(await inventoryService.getInventory(listing.id)).toMatchObject({ soldQuantity: 0, reservedQuantity: 0 });
  });
  it('rolls back the reservation claim if reserved stock is inconsistent', async () => {
    const { order, hold, listing } = await checkout();
    await prisma.listingInventory.update({ where: { listingId: listing.id }, data: { reservedQuantity: 0 } });
    expect((await orderService.verifyAndCompleteOrder({ authority: order.authority! })).success).toBe(false);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: hold.id } })).status).toBe('PENDING');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.order.id } })).status).toBe('PENDING_PAYMENT');
    expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id } })).toBe(0);
  });
  it('rolls back order completion when consuming pickup proof fails, then permits a retry', async () => {
    const { order } = await checkout();
    await orderService.verifyAndCompleteOrder({ authority: order.authority! });
    const proof = await pickupService.getOrCreateVerification(order.order.id);
    const transaction = prisma.$transaction.bind(prisma);
    const spy = vi.spyOn(prisma, '$transaction').mockImplementation(((callback: any) => transaction(async tx => callback({ ...tx,
      pickupVerification: { ...tx.pickupVerification, updateMany: async () => { throw new Error('Simulated pickup storage failure'); } },
    }))) as any);
    try {
      await expect(pickupService.verifyPickup({ merchantUserId: userId, orderId: order.order.id, otpCode: proof.otpCode })).rejects.toThrow('Simulated pickup storage failure');
    } finally { spy.mockRestore(); }
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.order.id } })).status).toBe('READY_FOR_PICKUP');
    expect((await prisma.pickupVerification.findUniqueOrThrow({ where: { orderId: order.order.id } })).isVerified).toBe(false);
    expect((await pickupService.verifyPickup({ merchantUserId: userId, orderId: order.order.id, otpCode: proof.otpCode })).response.success).toBe(true);
  });
  it('never lets a delayed failed verification overwrite a successful payment', async () => {
    const { order } = await checkout();
    let release!: () => void; let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; }); const entered = new Promise<void>(resolve => { started = resolve; });
    const spy = vi.spyOn(mockPaymentGateway, 'verifyPayment')
      .mockImplementationOnce(async () => { started(); await gate; return { success: false, errorMessage: 'delayed transport failure' }; })
      .mockResolvedValueOnce({ success: true, referenceId: 'verified-reference' });
    try {
      const delayed = paymentService.verifyPayment({ authority: order.authority! });
      await entered; expect((await paymentService.verifyPayment({ authority: order.authority! })).success).toBe(true);
      release(); expect((await delayed).success).toBe(true);
      expect(await prisma.payment.findUniqueOrThrow({ where: { authority: order.authority! } })).toMatchObject({ status: 'SUCCESS', referenceId: 'verified-reference' });
    } finally { release(); spy.mockRestore(); }
  });
});
