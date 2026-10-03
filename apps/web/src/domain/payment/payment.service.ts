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
    const description = `خرید بسته از سامانه لقمه - شماره سفارش ${order.orderNumber}`;

    const initResult = await gateway.initiatePayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountToman,
      callbackUrl,
      mobile,
      description,
    });

    if (!initResult.success) {
      return initResult;
    }

    // Persist Payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: gatewayType,
        authority: initResult.authority,
        amountToman: BigInt(amountToman),
        status: PaymentStatus.INITIATED,
        events: {
          create: {
            eventType: 'INITIATED',
            payloadJson: {
              gatewayType,
              callbackUrl,
              amountToman,
              authority: initResult.authority,
            },
          },
        },
      },
    });

    return initResult;
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
    const { authority, trackingCode, ipAddress } = params;

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
    const verifyResult = await gateway.verifyPayment({
      authority,
      amountToman: verifiedAmountToman,
    });

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
          payloadJson: verifyResult.rawPayload || { errorMessage: verifyResult.errorMessage },
          ipAddress,
        },
      });

      if (!verifyResult.success) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            errorMessage: verifyResult.errorMessage,
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
          trackingCode: trackingCode || verifyResult.trackingCode,
        },
        include: { order: true },
    });

    return {
      success: true,
      payment: updatedPayment,
      orderId: payment.orderId,
      referenceId: verifyResult.referenceId,
    };
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
    let refundResult;
    try {
      refundResult = await gateway.refundPayment({
        authority: payment.authority, amountToman: refundAmount, reason: reasonFa,
      });
    } catch {
      return { success: false, errorMessage: 'نتیجه استرداد نامشخص است و نیاز به بررسی دارد؛ درخواست مجدد ارسال نشد' };
    }

    if (!refundResult.success) {
      await prisma.refund.update({ where: { id: pendingRefund.id }, data: { status: RefundStatus.REJECTED } });
      return {
        success: false,
        errorMessage: refundResult.errorMessage || 'درخواست استرداد وجه توسط درگاه بانکی رد شد',
      };
    }

    const now = new Date();
    const refund = await prisma.$transaction(async (tx) => {
      const refundRecord = await tx.refund.update({ where: { id: pendingRefund.id }, data: { status: RefundStatus.SETTLED } });

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
      await tx.order.update({
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

      await tx.financialTransaction.create({
        data: {
          orderId: payment.orderId,
          type: FinancialTransactionType.CUSTOMER_REFUND,
          debitAccount: 'MERCHANT_PAYABLE',
          creditAccount: 'PLATFORM_CLEARING',
          amountToman: merchantPayoutRefund,
          referenceNumber: refundRecord.id,
        },
      });

      // B. Platform clearing refunded to customer
      await tx.financialTransaction.create({
        data: {
          orderId: payment.orderId,
          type: FinancialTransactionType.CUSTOMER_REFUND,
          debitAccount: 'PLATFORM_CLEARING',
          creditAccount: 'CUSTOMER_PAYMENT',
          amountToman: totalOrderAmount,
          referenceNumber: refundRecord.id,
        },
      });

      // C. Platform commission reversal
      if (platformCommissionRefund > BigInt(0)) {
        await tx.financialTransaction.create({
          data: {
            orderId: payment.orderId,
            type: FinancialTransactionType.CUSTOMER_REFUND,
            debitAccount: 'PLATFORM_COMMISSION',
            creditAccount: 'PLATFORM_CLEARING',
            amountToman: platformCommissionRefund,
            referenceNumber: refundRecord.id,
          },
        });
      }

      return refundRecord;
    });

    return {
      success: true,
      refund,
    };
  }
}

export const paymentService = new PaymentService();
