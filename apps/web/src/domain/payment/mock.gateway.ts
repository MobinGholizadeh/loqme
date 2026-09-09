import {
  IPaymentGateway,
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
} from './gateway.interface';
import { PaymentGatewayType } from '@prisma/client';

export class MockPaymentGateway implements IPaymentGateway {
  readonly gatewayType = PaymentGatewayType.MOCK;

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const authority = `MOCK-AUTH-${Date.now()}-${randomSuffix}`;

    // Callback redirect URL for simulated browser gateway redirect
    const separator = params.callbackUrl.includes('?') ? '&' : '?';
    const paymentUrl = `${params.callbackUrl}${separator}authority=${authority}&status=OK`;

    return {
      success: true,
      authority,
      paymentUrl,
      gateway: this.gatewayType,
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const { authority, amountToman } = params;

    // Simulate validation
    if (!authority || !authority.startsWith('MOCK-')) {
      return {
        success: false,
        errorMessage: 'شناسه مرجع پرداخت شبیه‌ساز نامعتبر است',
      };
    }

    if (amountToman <= 0) {
      return {
        success: false,
        errorMessage: 'مبلغ تراکنش نامعتبر است',
      };
    }

    const referenceId = `REF-SHAPARAK-${Date.now()}`;
    const trackingCode = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      referenceId,
      trackingCode,
      rawPayload: {
        gateway: 'MOCK',
        verifiedAt: new Date().toISOString(),
        authority,
        amountToman,
        cardNumber: '۶۰۳۷۹۹******۱۴۰۳',
      },
    };
  }

  async refundPayment(params: {
    authority: string;
    amountToman: number;
    reason: string;
  }) {
    const refundId = `REFUND-MOCK-${Date.now()}`;
    return {
      success: true,
      refundId,
      rawPayload: {
        gateway: 'MOCK',
        refundedAt: new Date().toISOString(),
        authority: params.authority,
        amountToman: params.amountToman,
        reason: params.reason,
      },
    };
  }
}

export const mockPaymentGateway = new MockPaymentGateway();

