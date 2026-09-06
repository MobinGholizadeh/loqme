import { prisma } from '@/lib/prisma';
import { IPaymentGateway, InitiatePaymentResult, VerifyPaymentResult } from './gateway.interface';
import { mockPaymentGateway } from './mock.gateway';
import { zarinpalGateway } from './zarinpal.gateway';
import { PaymentGatewayType, PaymentStatus, Order } from '@prisma/client';

export class PaymentService {
  /**
   * Resolves the configured payment gateway adapter based on gateway type
   */
  getGateway(gatewayType: PaymentGatewayType): IPaymentGateway {
    switch (gatewayType) {
      case PaymentGatewayType.ZARINPAL:
        return zarinpalGateway;
      case PaymentGatewayType.MOCK:
      default:
        return mockPaymentGateway;
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

    // Idempotent return if already succeeded
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        success: true,
        payment,
        orderId: payment.orderId,
        referenceId: payment.referenceId || undefined,
      };
    }

    const gateway = this.getGateway(payment.gateway);
    const verifyResult = await gateway.verifyPayment({
      authority,
      amountToman: Number(payment.amountToman),
    });

    // Record verification event
    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType: verifyResult.success ? 'VERIFY_SUCCESS' : 'VERIFY_FAILED',
        payloadJson: verifyResult.rawPayload || { errorMessage: verifyResult.errorMessage },
        ipAddress,
      },
    });

    if (!verifyResult.success) {
      await prisma.payment.update({
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
    const updatedPayment = await prisma.payment.update({
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
  }
}

export const paymentService = new PaymentService();
