import { notificationService } from '@/domain/notification/notification.service';
import { withDatabaseService } from '@/lib/db/context';
import { initiatePaymentOnce } from './payment-attempt.service';
import { prisma } from '@/lib/prisma';
import { IPaymentGateway, InitiatePaymentResult, VerifyPaymentResult } from './gateway.interface';
import { mockPaymentGateway } from './mock.gateway';
import { zarinpalGateway } from './zarinpal.gateway';
import {
  PaymentGatewayType,
  PaymentStatus,
  RefundStatus,
  OrderStatus,
  FinancialTransactionType,
  Order,
} from '@prisma/client';

export class PaymentService {
  /**
   * Resolves the configured payment gateway adapter based on gateway type
   */
  getGateway(gatewayType: PaymentGatewayType): IPaymentGateway {
    switch (gatewayType) {
      case PaymentGatewayType.ZARINPAL:
        return zarinpalGateway;
      case PaymentGatewayType.MOCK:
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Mock payments are disabled in production');
        }
        return mockPaymentGateway;
      default:
        throw new Error('Unsupported payment gateway');
    }
  }

  /**
   * Probes payment gateway readiness/connectivity
   */
  async checkGatewayHealth(gatewayType: PaymentGatewayType): Promise<{
    healthy: boolean;
    gateway: PaymentGatewayType;
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const gateway = this.getGateway(gatewayType);
      if (!gateway) {
        return {
          healthy: false,
          gateway: gatewayType,
          latencyMs: Date.now() - startTime,
          error: 'درگاه پرداخت پیکربندی نشده است',
        };
      }
      return {
        healthy: true,
        gateway: gatewayType,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        healthy: false,
        gateway: gatewayType,
        latencyMs: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  /**
   * Initiates payment with the selected gateway, creates the Payment record and initial PaymentEvent audit log
   */
  async initiateOrderPayment(params: {
    order: Order;
    gatewayType: PaymentGatewayType;
    callbackUrl: string;
    mobile?: string;
  }): Promise<InitiatePaymentResult> {
    const { order, gatewayType, callbackUrl, mobile } = params;
    const gateway = this.getGateway(gatewayType);

    const amountToman = Number(order.totalAmountToman);
    if (!Number.isSafeInteger(amountToman) || amountToman <= 0) {
      return { success: false, authority: '', paymentUrl: '', gateway: gatewayType, errorMessage: 'مبلغ پرداخت معتبر نیست' };
    }
    return initiatePaymentOnce(order, gateway, callbackUrl, mobile);
  }

  /**
   * Verifies payment status with the gateway and records audit events
   */
  async verifyPayment(params: {
    authority: string;
    trackingCode?: string;
    ipAddress?: string;
  }): Promise<{
    success: boolean;
    payment?: any;
    orderId?: string;
    referenceId?: string;
    errorMessage?: string;
  }> {
    return withDatabaseService('payment', params.authority, async () => {
    const { authority, ipAddress } = params;

    const payment = await prisma.payment.findUnique({
      where: { authority },
      include: { order: true },
    });

    if (!payment) {
      return { success: false, errorMessage: 'تراکنش پرداخت مربوط به این کد رهگیری یافت نشد' };
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return { success: false, errorMessage: 'این پرداخت قبلاً مسترد شده است' };
    }

    // Idempotent return if already succeeded
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        success: true,
        payment,
        orderId: payment.orderId,
        referenceId: payment.referenceId || undefined,
      };
    }

    const verifiedAmountToman = Number(payment.amountToman);
    if (!Number.isSafeInteger(verifiedAmountToman) || verifiedAmountToman <= 0) {
      return { success: false, errorMessage: 'مبلغ پرداخت معتبر نیست' };
    }
    const gateway = this.getGateway(payment.gateway);
    let verifyResult: VerifyPaymentResult;
    try { verifyResult = await gateway.verifyPayment({ authority, amountToman: verifiedAmountToman }); }
    catch { verifyResult = { success: false, outcome: 'UNKNOWN' }; }
    if (verifyResult.success && !verifyResult.referenceId) verifyResult = { success: false, outcome: 'UNKNOWN' };

    // Provider calls happen outside the lock. Persist their result only after
    // rechecking state, so a delayed failure cannot overwrite success or a refund.
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${payment.id} FOR UPDATE`;
      const current = await tx.payment.findUnique({ where: { id: payment.id }, include: { order: true } });
      if (!current || current.status === PaymentStatus.REFUNDED) {
        return { success: false, errorMessage: 'پرداخت یافت نشد یا قبلاً مسترد شده است' };
      }
      if (current.status === PaymentStatus.SUCCESS) {
        return { success: true, payment: current, orderId: current.orderId, referenceId: current.referenceId || undefined };
      }
      // Record verification event
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: verifyResult.success ? 'VERIFY_SUCCESS' : 'VERIFY_FAILED',
          payloadJson: { outcome: verifyResult.success ? 'VERIFIED' : verifyResult.outcome ?? 'UNKNOWN', referenceId: verifyResult.referenceId ?? null },
          ipAddress,
        },
      });

      if (!verifyResult.success) {
        if (verifyResult.outcome === 'DECLINED') await tx.paymentAttempt.updateMany({ where: { authority }, data: { state: 'DECLINED' } });
        if (verifyResult.outcome !== 'DECLINED') await tx.reconciliationCase.upsert({
          where: { caseKey: `${payment.id}:VERIFICATION_UNKNOWN` }, update: {}, create: {
            caseKey: `${payment.id}:VERIFICATION_UNKNOWN`, merchantId: current.order.merchantId, orderId: payment.orderId,
            paymentId: payment.id, reason: 'VERIFICATION_UNKNOWN',
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: verifyResult.outcome === 'DECLINED' ? PaymentStatus.FAILED : current.status,
            errorMessage: verifyResult.outcome === 'DECLINED' ? 'PROVIDER_DECLINED' : 'PROVIDER_UNKNOWN',
          },
        });

        return {
          success: false,
          payment,
          orderId: payment.orderId,
          errorMessage: verifyResult.errorMessage || 'پرداخت توسط درگاه بانکی تایید نشد',
        };
      }

      // Update payment record to SUCCESS
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          referenceId: verifyResult.referenceId,
          verifiedAt: new Date(),
          trackingCode: verifyResult.trackingCode,
        },
        include: { order: true },
    });

    await tx.paymentAttempt.updateMany({ where: { authority }, data: { state: 'VERIFIED' } });
    return {
      success: true,
      payment: updatedPayment,
      orderId: payment.orderId,
      referenceId: verifyResult.referenceId,
    };
    });
  
    });
  }

  /**
   * Processes a refund via the payment gateway, settles refund record,
   * updates financial ledger, and updates payment/order status.
   */
  async refundPayment(params: {
    paymentId: string;
    amountToman?: number;
    reasonFa: string;
    processedByUserId?: string;
  }): Promise<{
    success: boolean;
    refund?: any;
    errorMessage?: string;
  }> {
    const { paymentId, amountToman, reasonFa, processedByUserId } = params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return { success: false, errorMessage: 'اطلاعات پرداخت جهت استرداد وجه یافت نشد' };
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      return { success: false, errorMessage: 'تنها تراکنش‌های پرداخت موفق قابل استرداد وجه می‌باشند' };
    }

    const refundAmount = amountToman ?? Number(payment.amountToman);
    // The current order lifecycle and ledger reversal support full refunds only.
    // Reject other amounts before calling the provider or changing financial state.
    if (!Number.isSafeInteger(refundAmount) || refundAmount <= 0 ||
      BigInt(refundAmount) !== payment.amountToman) {
      return { success: false, errorMessage: 'فقط استرداد کامل مبلغ پرداخت‌شده پشتیبانی می‌شود' };
    }
    const gateway = this.getGateway(payment.gateway);
    if (!gateway.refundPayment) {
      return { success: false, errorMessage: 'استرداد خودکار وجه برای این درگاه پشتیبانی نمی‌شود' };
    }
    // Persist the claim before contacting the provider. A crash or uncertain
    // provider response must not permit a second transfer on an automatic retry.
    const pendingRefund = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${payment.orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${payment.id} FOR UPDATE`;
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (current?.status !== PaymentStatus.SUCCESS) return null;
      const existing = await tx.refund.findFirst({
        where: { paymentId: payment.id, status: { not: RefundStatus.REJECTED } },
      });
      if (existing) return null;
      return tx.refund.create({
        data: { paymentId: payment.id, orderId: payment.orderId, amountToman: BigInt(refundAmount), reasonFa, status: RefundStatus.REQUESTED, processedByUserId },
      });
    });
    if (!pendingRefund) {
      return { success: false, errorMessage: 'استرداد این پرداخت قبلاً ثبت شده یا در حال بررسی است' };
    }
    const recordUnknownRefund = () => prisma.reconciliationCase.upsert({ where: { caseKey: `${pendingRefund.id}:REFUND_UNKNOWN` }, update: {}, create: {
      caseKey: `${pendingRefund.id}:REFUND_UNKNOWN`, merchantId: payment.order.merchantId, orderId: payment.orderId,
      paymentId: payment.id, reason: 'REFUND_UNKNOWN',
    } });
    let refundResult;
    try {
      refundResult = await gateway.refundPayment({
        authority: payment.authority, amountToman: refundAmount, reason: reasonFa,
      });
    } catch {
      await recordUnknownRefund();
      return { success: false, errorMessage: 'نتیجه استرداد نامشخص است و نیاز به بررسی دارد؛ درخواست مجدد ارسال نشد' };
    }

    if (!refundResult.success) {
      if (refundResult.outcome === 'DECLINED') await prisma.refund.update({ where: { id: pendingRefund.id }, data: { status: RefundStatus.REJECTED } });
      else await recordUnknownRefund();
      return {
        success: false,
        errorMessage: refundResult.errorMessage || 'درخواست استرداد وجه توسط درگاه بانکی رد شد',
      };
    }

    const now = new Date();
    const refund = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${payment.orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id=${payment.id} FOR UPDATE`;
      const liveOrder = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      const allocated = liveOrder.acceptedPaymentId === payment.id || (!liveOrder.acceptedPaymentId && Boolean(await tx.financialTransaction.findFirst({
        where: { orderId: liveOrder.id, type: 'CUSTOMER_PAYMENT', referenceNumber: payment.referenceId },
      })));
      const refundRecord = await tx.refund.update({ where: { id: pendingRefund.id }, data: { status: RefundStatus.SETTLED, settledAt: now } });

      // Update Payment status to REFUNDED
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          events: {
            create: {
              eventType: 'REFUNDED',
              payloadJson: {
                refundId: refundRecord.id,
                amountToman: refundAmount,
                reasonFa,
                gatewayRefundId: refundResult.refundId || null,
              },
            },
          },
        },
      });

      // Update Order status to REFUNDED
      if (allocated) await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.REFUNDED,
          updatedAt: now,
        },
      });

      // Double-entry ledger reversal:
      // A. Merchant payable debit penalty (reversing payable allocated to merchant)
      const merchantPayoutRefund = BigInt(payment.order.merchantPayoutAmountToman);
      const totalOrderAmount = BigInt(payment.order.totalAmountToman);
      const platformCommissionRefund = BigInt(payment.order.commissionAmountToman);

      if (allocated) await tx.financialTransaction.create({
        data: {
          orderId: payment.orderId,
          type: FinancialTransactionType.CUSTOMER_REFUND,
          debitAccount: 'MERCHANT_PAYABLE',
          creditAccount: 'PLATFORM_CLEARING',
          amountToman: merchantPayoutRefund,
          referenceNumber: refundRecord.id,
          postingKey: `refund:${refundRecord.id}:merchant`,
        },
      });

      // B. Platform clearing refunded to customer
      await tx.financialTransaction.create({
        data: {
          orderId: payment.orderId,
          type: FinancialTransactionType.CUSTOMER_REFUND,
          debitAccount: 'PLATFORM_CLEARING',
          creditAccount: 'CUSTOMER_PAYMENT',
          amountToman: payment.amountToman,
          referenceNumber: refundRecord.id,
          postingKey: `refund:${refundRecord.id}:customer`,
        },
      });

      // C. Platform commission reversal
      if (allocated && platformCommissionRefund > BigInt(0)) {
        await tx.financialTransaction.create({
          data: {
            orderId: payment.orderId,
            type: FinancialTransactionType.CUSTOMER_REFUND,
            debitAccount: 'PLATFORM_COMMISSION',
            creditAccount: 'PLATFORM_CLEARING',
            amountToman: platformCommissionRefund,
            referenceNumber: refundRecord.id,
          postingKey: `refund:${refundRecord.id}:commission`,
          },
        });
      }

      return refundRecord;
    });

    try {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: {
          customer: { include: { user: true } },
          merchant: { select: { id: true, businessNameFa: true } },
        },
      });

      if (order?.customer?.user) {
        notificationService.createNotification({
          userId: order.customer.user.id,
          role: order.customer.user.role,
          type: 'ORDER_REFUNDED',
          category: 'order',
          title: 'استرداد وجه سفارش',
          body: 'مبلغ ' + Number(refundAmount).toLocaleString('fa-IR') + ' تومان بابت سفارش #' + order.orderNumber + ' به حساب شما مسترد شد.',
          link: '/orders',
          channels: ['IN_APP', 'WEB_PUSH'],
        }).catch(() => {});
      }

      if (order?.merchant) {
        notificationService.notifyMerchant(order.merchant.id, {
          type: 'ORDER_REFUNDED',
          category: 'order',
          title: 'لغو و استرداد وجه سفارش #' + order.orderNumber,
          body: 'سفارش #' + order.orderNumber + ' لغو و مبلغ آن به مشتری بازگردانده شد (علت: ' + reasonFa + ').',
          link: '/merchant/orders',
        }).catch(() => {});
      }
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      refund,
    };
  }
}

export const paymentService = new PaymentService();
