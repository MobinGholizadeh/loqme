import { prisma } from '@/lib/prisma';
import { orderService } from '@/domain/order/order.service';

/** Rechecks may verify an existing authority; they never submit a new charge or refund. */
export async function reconcilePayment(caseId: string, actorId: string, action: 'RECHECK' | 'RESOLVE') {
  let record = await prisma.reconciliationCase.findUnique({ where: { id: caseId } });
  if (!record && action === 'RECHECK') {
    const payment = await prisma.payment.findUnique({ where: { id: caseId }, include: { order: true } });
    if (payment?.status === 'SUCCESS' && payment.order.acceptedPaymentId !== payment.id) {
      record = await prisma.reconciliationCase.upsert({ where: { caseKey: `${payment.id}:RECOVERY` }, update: {}, create: {
        caseKey: `${payment.id}:RECOVERY`, merchantId: payment.order.merchantId, orderId: payment.orderId,
        paymentId: payment.id, reason: 'UNALLOCATED_PAYMENT',
      } });
    }
  }
  if (!record) return { success: false, message: 'پرونده یافت نشد' };
  if (record.status === 'RESOLVED') return { success: true, message: 'پرونده قبلاً بسته شده است' };
  if (action === 'RECHECK' && record.paymentId) {
    const payment = await prisma.payment.findUnique({ where: { id: record.paymentId } });
    if (payment?.orderId === record.orderId) await orderService.verifyAndCompleteOrder({ authority: payment.authority });
  }
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${record.orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: record.orderId } });
    const payment = record.paymentId ? await tx.payment.findUnique({ where: { id: record.paymentId } }) : null;
    if (!order || order.merchantId !== record.merchantId || payment?.orderId !== order.id) return { success: false, message: 'نتیجه هنوز قطعی نیست؛ شواهد بانک باید توسط پشتیبانی بررسی شود' };
    const settled = payment.status === 'REFUNDED' && Boolean(await tx.refund.findFirst({ where: { paymentId: payment.id, status: 'SETTLED', settledAt: { not: null } } }));
    const allocated = order.acceptedPaymentId === payment.id && payment.status === 'SUCCESS';
    const pending = await tx.refund.findFirst({ where: { paymentId: payment.id, status: { in: ['REQUESTED', 'APPROVED'] } } });
    if ((!settled && !allocated) || pending) return { success: false, message: 'تا تخصیص قطعی پرداخت یا تسویه استرداد، پرونده باز می‌ماند' };
    const claimed = await tx.reconciliationCase.updateMany({ where: { id: record.id, status: 'OPEN' }, data: {
      status: 'RESOLVED', resolution: settled ? 'REFUND_SETTLED' : 'PAYMENT_ALLOCATED', resolvedBy: actorId, resolvedAt: new Date(),
    } });
    if (claimed.count) await tx.auditLog.create({ data: { merchantId: record.merchantId, sourceKind: 'MARKETPLACE',
      action: 'PAYMENT_RECONCILED', entityType: 'ReconciliationCase', entityId: record.id, actorId, actorRole: 'ADMIN',
      detailsJson: { resolution: settled ? 'REFUND_SETTLED' : 'PAYMENT_ALLOCATED' },
    } });
    return { success: true, message: 'پرونده بر اساس نتیجه ثبت‌شده بسته شد' };
  });
}
