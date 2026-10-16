import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { reservationService } from '@/domain/reservation/reservation.service';
import { orderService } from '@/domain/order/order.service';
import { paymentService } from '@/domain/payment/payment.service';
import { mockPaymentGateway } from '@/domain/payment/mock.gateway';
import { requireMerchantContext } from '@/domain/merchant/merchant-access.service';
import { getMerchantDataReport, merchantReportWindow } from '@/domain/merchant/merchant-report.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { createSessionToken } from '@/lib/auth/session';
import { NextRequest } from 'next/server';
import { reconcilePayment } from '@/domain/payment/reconciliation.service';
import { setHistoryActor } from '@/domain/merchant/history-context';
import { GET as getAdminCases } from '@/app/api/admin/reconciliation/route';

describe('LQ-MDAI-001 real database acceptance', () => {
  const run = randomUUID();
  let owner: string; let cashier: string; let admin: string; let customer: string; let merchant: string; let foreign: string; let category: string; let location: string; let foreignLocation: string;
  const listings: string[] = [];
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !new URL(process.env.DATABASE_URL).pathname.startsWith('/loqme_onboarding_test_')) throw new Error('Disposable database required');
    const user = await prisma.user.create({ data: { mobile: `mdai-owner-${run}`, role: 'MERCHANT_OWNER', customer: { create: {} } }, include: { customer: true } });
    owner = user.id; customer = user.customer!.id;
    cashier = (await prisma.user.create({ data: { mobile: `mdai-cashier-${run}`, role: 'MERCHANT_STAFF' } })).id;
    admin = (await prisma.user.create({ data: { mobile: `mdai-admin-${run}`, role: 'ADMIN' } })).id;
    merchant = (await prisma.merchant.create({ data: { ownerUserId: owner, businessNameFa: 'فروشگاه داده', verificationStatus: 'APPROVED', commissionPercent: 0, staff: { create: { userId: cashier, role: 'CASHIER' } } } })).id;
    foreign = (await prisma.merchant.create({ data: { ownerUserId: cashier, businessNameFa: 'فروشگاه دیگر' } })).id;
    category = (await prisma.category.findFirstOrThrow()).id;
    const city = await prisma.city.findFirstOrThrow();
    location = (await prisma.merchantLocation.create({ data: { merchantId: merchant, cityId: city.id, addressFa: 'نشانی زمان خرید', latitude: 37.55, longitude: 45.07 } })).id;
    foreignLocation = (await prisma.merchantLocation.create({ data: { merchantId: foreign, cityId: city.id, addressFa: 'نشانی دیگر', latitude: 37.55, longitude: 45.07 } })).id;
  });
  afterAll(async () => {
    const scope = { merchantId: { in: [merchant, foreign].filter(Boolean) } };
    await prisma.refund.deleteMany({ where: { order: scope } });
    await prisma.financialTransaction.deleteMany({ where: { order: scope } });
    await prisma.order.deleteMany({ where: scope });
    await prisma.reservation.deleteMany({ where: { listingId: { in: listings } } });
    await prisma.listing.deleteMany({ where: { id: { in: listings } } });
    await prisma.merchant.deleteMany({ where: { id: { in: [merchant, foreign].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { id: { in: [owner, cashier, admin].filter(Boolean) } } });
  });
  async function listing() {
    const now = new Date();
    const l = await prisma.listing.create({ data: { merchantId: merchant, merchantLocationId: location, categoryId: category,
      titleFa: 'عنوان زمان خرید', status: 'PUBLISHED', originalPriceToman: 200, discountedPriceToman: 100,
      pickupDate: now, pickupStart: now, pickupEnd: new Date(Date.now()+3600_000), inventory: { create: { totalQuantity: 5 } }, safety: { create: { safetyStatus: 'APPROVED' } } } });
    listings.push(l.id); return l;
  }
  async function checkout() {
    const l = await listing(); const hold = await reservationService.createReservation({ customerId: customer, listingId: l.id });
    expect(hold.success).toBe(true);
    const order = await orderService.createOrderFromReservation({ customerId: customer, reservationId: hold.reservation!.id, gateway: 'MOCK', callbackUrl: 'http://localhost/callback' });
    expect(order.success).toBe(true); return { l, hold, order };
  }
  it('serializes concurrent same-customer holds and rolls back failed persistence with its history', async () => {
    const l = await listing();
    const results = await Promise.all(Array.from({ length: 5 }, () => reservationService.createReservation({ customerId: customer, listingId: l.id })));
    expect(results.every(r => r.success)).toBe(true);
    expect(new Set(results.map(r => r.reservation!.id)).size).toBe(1);
    expect(await prisma.listingInventory.findUnique({ where: { listingId: l.id } })).toMatchObject({ reservedQuantity: 1 });
    expect(await prisma.listingInventoryMovement.count({ where: { listingId: l.id, kind: 'RESERVE' } })).toBe(1);
    const other = await listing();
    expect((await reservationService.createReservation({ customerId: randomUUID(), listingId: other.id })).success).toBe(false);
    expect(await prisma.listingInventory.findUnique({ where: { listingId: other.id } })).toMatchObject({ reservedQuantity: 0 });
    expect(await prisma.listingInventoryMovement.count({ where: { listingId: other.id } })).toBe(1);
  });
  it('claims initiation once across concurrent checkout retries and reuses the durable URL', async () => {
    const l = await listing(); const hold = await reservationService.createReservation({ customerId: customer, listingId: l.id });
    const provider = vi.spyOn(mockPaymentGateway, 'initiatePayment');
    try {
      const input = { customerId: customer, reservationId: hold.reservation!.id, gateway: 'MOCK' as const, callbackUrl: 'http://localhost/callback' };
      await Promise.all(Array.from({ length: 5 }, () => orderService.createOrderFromReservation(input)));
      const retry = await orderService.createOrderFromReservation(input);
      expect(retry.success).toBe(true); expect(provider).toHaveBeenCalledOnce();
      expect(await prisma.paymentAttempt.count({ where: { orderId: retry.order.id } })).toBe(1);
    } finally { provider.mockRestore(); }
  });
  it('keeps unknown provider outcomes durable and blocks an automatic second request', async () => {
    const l = await listing(); const hold = await reservationService.createReservation({ customerId: customer, listingId: l.id });
    const provider = vi.spyOn(mockPaymentGateway, 'initiatePayment').mockRejectedValue(new Error('lost response after bank accepted request'));
    try {
      const input = { customerId: customer, reservationId: hold.reservation!.id, gateway: 'MOCK' as const, callbackUrl: 'http://localhost/callback' };
      expect((await orderService.createOrderFromReservation(input)).success).toBe(false);
      expect((await orderService.createOrderFromReservation(input)).success).toBe(false); expect(provider).toHaveBeenCalledOnce();
      const order = await prisma.order.findUniqueOrThrow({ where: { reservationId: hold.reservation!.id } });
      expect(await prisma.paymentAttempt.findFirst({ where: { orderId: order.id } })).toMatchObject({ state: 'UNKNOWN' });
      expect(await prisma.reconciliationCase.count({ where: { orderId: order.id, reason: 'INITIATION_UNKNOWN' } })).toBe(1);
    } finally { provider.mockRestore(); }
  });
  it('preserves purchase facts after later listing edits and rejects cross-tenant or historical mutations', async () => {
    const { l, order } = await checkout();
    await prisma.listing.update({ where: { id: l.id }, data: { titleFa: 'عنوان جدید', originalPriceToman: 999, pickupEnd: new Date(Date.now()+7200_000) } });
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.order.id } });
    expect(item).toMatchObject({ titleFaSnapshot: 'عنوان زمان خرید', originalPriceTomanSnapshot: 200n, listingRevisionSnapshot: 2, pickupEndSnapshot: l.pickupEnd, termsSnapshot: { safety: { safetyStatus: 'APPROVED' } } });
    await expect(prisma.orderItem.update({ where: { id: item.id }, data: { quantity: 9 } })).rejects.toThrow();
    await expect(prisma.order.update({ where: { id: order.order.id }, data: { merchantLocationId: foreignLocation } })).rejects.toThrow();
    await expect(prisma.listing.update({ where: { id: l.id }, data: { merchantLocationId: foreignLocation } })).rejects.toThrow();
    const revisions = await prisma.listingRevision.findMany({ where: { listingId: l.id }, orderBy: { revision: 'asc' } });
    expect(revisions.map(r => r.revision)).toEqual([1, 2, 3]);
    await expect(prisma.listingRevision.update({ where: { id: revisions[0].id }, data: { kind: 'FAKE' } })).rejects.toThrow();
    expect((await orderService.verifyAndCompleteOrder({ authority: order.authority! })).success).toBe(true);
    const receipt = await orderService.getOrderById(order.order.id, customer);
    expect(receipt?.items[0].titleFa).toBe('عنوان زمان خرید');
  });
  it('quarantines a second verified payment and refunds it without reversing the accepted sale', async () => {
    const { order } = await checkout();
    await orderService.verifyAndCompleteOrder({ authority: order.authority! });
    const duplicate = await prisma.payment.create({ data: { orderId: order.order.id, gateway: 'MOCK', authority: `MOCK-duplicate-${run}`, amountToman: 100, status: 'SUCCESS', referenceId: 'duplicate', verifiedAt: new Date() } });
    expect((await orderService.verifyAndCompleteOrder({ authority: duplicate.authority })).success).toBe(false);
    expect(await prisma.reconciliationCase.count({ where: { paymentId: duplicate.id, reason: 'DUPLICATE_PAYMENT' } })).toBe(1);
    const reconciliation = await prisma.reconciliationCase.findFirstOrThrow({ where: { paymentId: duplicate.id } });
    expect((await reconcilePayment(reconciliation.id, owner, 'RESOLVE')).success).toBe(false);
    expect((await paymentService.refundPayment({ paymentId: duplicate.id, reasonFa: 'پرداخت اضافه' })).success).toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.order.id } })).status).toBe('READY_FOR_PICKUP');
    expect(await prisma.financialTransaction.count({ where: { orderId: order.order.id, type: 'CUSTOMER_REFUND' } })).toBe(1);
    expect((await reconcilePayment(reconciliation.id, owner, 'RESOLVE')).success).toBe(true);
    expect((await reconcilePayment(reconciliation.id, owner, 'RESOLVE')).success).toBe(true);
    expect(await prisma.auditLog.count({ where: { entityId: reconciliation.id, action: 'PAYMENT_RECONCILED' } })).toBe(1);
  });
  it('journals actual upsert updates once and does not leak transaction-local actors', async () => {
    const l = await listing();
    await prisma.$transaction(async tx => {
      await setHistoryActor(tx, owner, 'MANUAL_STOCK_ADJUSTMENT');
      await tx.listingInventory.upsert({ where: { listingId: l.id }, create: { listingId: l.id, totalQuantity: 9 }, update: { totalQuantity: 9 } });
    });
    await prisma.listingInventory.update({ where: { listingId: l.id }, data: { totalQuantity: 10 } });
    const moves = await prisma.listingInventoryMovement.findMany({ where: { listingId: l.id }, orderBy: { inventoryVersion: 'asc' } });
    expect(moves.map(m => m.inventoryVersion)).toEqual([1,2,3]);
    expect(moves.map(m => m.deltaTotal)).toEqual([5,4,1]);
    expect(moves[1].actorId).toBe(owner); expect(moves[2].actorId).toBeNull();
    const before = await prisma.listingRevision.count({ where: { listingId: l.id } });
    await prisma.listing.upsert({ where: { id: l.id }, create: { ...l, titleFa: 'نباید ثبت شود' }, update: { titleFa: 'عنوان نهایی' } });
    expect(await prisma.listingRevision.count({ where: { listingId: l.id } })).toBe(before+1);
  });
  it('finds and recovers a verified payment after the process stopped before allocation', async () => {
    const { order } = await checkout();
    const payment = await prisma.payment.update({ where: { authority: order.authority! }, data: { status: 'SUCCESS', referenceId: `recovery-${run}`, verifiedAt: new Date(Date.now()-600_000) } });
    const token = await createSessionToken({ userId: admin, mobile: '09000000000', role: 'ADMIN' });
    const response = await getAdminCases(new NextRequest('http://localhost/api/admin/reconciliation', { headers: { cookie: `loqme_session=${token}` } }));
    const body = await response.json();
    expect(body.data.unallocated).toContainEqual(expect.objectContaining({ id: payment.id, orderId: order.order.id }));
    expect(JSON.stringify(body)).not.toContain(payment.authority);
    expect((await reconcilePayment(payment.id, admin, 'RECHECK')).success).toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.order.id } })).acceptedPaymentId).toBe(payment.id);
    await expect(prisma.payment.update({ where: { id: payment.id }, data: { amountToman: 200 } })).rejects.toThrow();
    await expect(prisma.payment.update({ where: { id: payment.id }, data: { verifiedAt: new Date() } })).rejects.toThrow();
  });
  it('denies cashiers private reports, foreign branches, ambiguous stores and revoked admin sessions', async () => {
    await expect(requireMerchantContext(cashier, merchant, 'REPORT_READ')).rejects.toThrow('عدم دسترسی');
    await expect(requireMerchantContext(cashier, merchant, 'LISTING_WRITE')).rejects.toThrow('عدم دسترسی');
    await expect(requireMerchantContext(owner, merchant, 'REPORT_READ', foreignLocation)).rejects.toThrow('عدم دسترسی');
    await expect(requireMerchantContext(cashier, undefined, 'PICKUP_READ')).rejects.toThrow('عدم دسترسی');
    const token = await createSessionToken({ userId: owner, mobile: '09000000000', role: 'ADMIN' });
    const denied = await requireAdminSession(new NextRequest('http://localhost/api/admin/reconciliation', { headers: { cookie: `loqme_session=${token}` } }));
    expect('errorResponse' in denied && denied.errorResponse.status).toBe(403);
  });
  it('reports exact integer money by event time and retains unknown historical time as unknown', async () => {
    const { start, end } = merchantReportWindow(new Date()); const eventTime = new Date(end.getTime()-1000);
    const amount = 9007199254740993n;
    const order = await prisma.order.create({ data: { orderNumber: `DATA-${run}`, merchantId: merchant, merchantLocationId: location, customerId: customer,
      totalAmountToman: amount, commissionAmountToman: 0, commissionPercent: 0, merchantPayoutAmountToman: amount } });
    const payment = await prisma.payment.create({ data: { orderId: order.id, gateway: 'MOCK', authority: `DATA-${run}`, amountToman: amount, status: 'REFUNDED', verifiedAt: eventTime } });
    await prisma.order.update({ where: { id: order.id }, data: { acceptedPaymentId: payment.id, paidAt: eventTime, status: 'REFUNDED' } });
    await prisma.refund.create({ data: { orderId: order.id, paymentId: payment.id, amountToman: amount, reasonFa: 'آزمون', status: 'SETTLED', settledAt: eventTime } });
    await prisma.payment.create({ data: { orderId: order.id, gateway: 'MOCK', authority: `LEGACY-${run}`, amountToman: 77, status: 'SUCCESS' } });
    const report = await getMerchantDataReport(owner, merchant, location);
    expect(report.collectionsToman).toBe(amount.toString()); expect(report.refundsToman).toBe(amount.toString()); expect(report.netCollectionsToman).toBe('0');
    expect(report.bookedCommissionToman).toBe('0'); expect(report.quality.unknownPaymentTimes).toBe(1);
    expect(report.startIso).toBe(start.toISOString()); expect(JSON.stringify(report)).not.toContain('mobile');
    await expect(getMerchantDataReport(owner, foreign)).rejects.toThrow('عدم دسترسی');
  });
});
