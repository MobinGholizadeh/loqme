import { prisma } from '@/lib/prisma';
import type { Order, PaymentGatewayType } from '@prisma/client';
import type { IPaymentGateway, InitiatePaymentResult } from './gateway.interface';

const uncertain = (gateway: PaymentGatewayType): InitiatePaymentResult => ({ success: false, authority: '', paymentUrl: '', gateway,
  errorMessage: 'نتیجه درخواست پرداخت در حال بررسی است؛ درخواست دوباره به بانک ارسال نشد' });

/** One active attempt per order, independent of HTTP retries or process restarts. */
export async function initiatePaymentOnce(order: Order, gateway: IPaymentGateway, callbackUrl: string, mobile?: string): Promise<InitiatePaymentResult> {
  const claim = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${order.id} FOR UPDATE`;
    const current = await tx.order.findUnique({ where: { id: order.id } });
    if (!current || current.status !== 'PENDING_PAYMENT' || current.totalAmountToman !== order.totalAmountToman) return null;
    const existing = await tx.paymentAttempt.findFirst({ where: { orderId: order.id, state: { not: 'DECLINED' } }, orderBy: { createdAt: 'desc' } });
    if (existing) return { attempt: existing, fresh: false };
    // Legacy authorities are not silently superseded by a new bank request.
    const legacy = await tx.payment.findFirst({ where: { orderId: order.id, status: { in: ['INITIATED', 'SUCCESS'] } } });
    if (legacy) return null;
    return { attempt: await tx.paymentAttempt.create({ data: { orderId: order.id, gateway: gateway.gatewayType, state: 'SUBMITTING' } }), fresh: true };
  });
  if (!claim) return uncertain(gateway.gatewayType);
  if (!claim.fresh) {
    const a = claim.attempt;
    return a.state === 'AWAITING_VERIFICATION' && a.authority && a.paymentUrl && a.gateway === gateway.gatewayType
      ? { success: true, authority: a.authority, paymentUrl: a.paymentUrl, gateway: a.gateway }
      : uncertain(a.gateway);
  }
  let result: InitiatePaymentResult;
  try {
    result = await gateway.initiatePayment({ orderId: order.id, orderNumber: order.orderNumber,
      amountToman: Number(order.totalAmountToman), callbackUrl, mobile, description: `خرید از لقمه - ${order.orderNumber}` });
  } catch {
    result = uncertain(gateway.gatewayType);
  }
  const valid = result.success && Boolean(result.authority) && Boolean(result.paymentUrl);
  await prisma.$transaction(async tx => {
    await tx.paymentAttempt.update({ where: { id: claim.attempt.id }, data: {
      state: valid ? 'AWAITING_VERIFICATION' : result.outcome === 'DECLINED' ? 'DECLINED' : 'UNKNOWN',
      authority: valid ? result.authority : null, paymentUrl: valid ? result.paymentUrl : null,
      safeCode: valid ? null : result.outcome === 'DECLINED' ? 'PROVIDER_DECLINED' : 'PROVIDER_UNKNOWN',
    } });
    if (valid) {
      await tx.payment.create({ data: { orderId: order.id, gateway: gateway.gatewayType, authority: result.authority,
        amountToman: order.totalAmountToman, status: 'INITIATED', events: { create: { eventType: 'INITIATED', payloadJson: { attemptId: claim.attempt.id } } } } });
    } else if (result.outcome !== 'DECLINED') {
      await tx.reconciliationCase.upsert({ where: { caseKey: `attempt:${claim.attempt.id}` }, update: {}, create: {
        caseKey: `attempt:${claim.attempt.id}`, merchantId: order.merchantId, orderId: order.id, reason: 'INITIATION_UNKNOWN',
      } });
    }
  });
  return valid ? result : result.outcome === 'DECLINED' ? result : uncertain(gateway.gatewayType);
}
