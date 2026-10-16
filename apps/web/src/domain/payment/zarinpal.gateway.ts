import {
  IPaymentGateway,
  InitiatePaymentParams,
  InitiatePaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
} from './gateway.interface';
import { PaymentGatewayType } from '@prisma/client';

export class ZarinpalGatewayAdapter implements IPaymentGateway {
  readonly gatewayType = PaymentGatewayType.ZARINPAL;

  private merchantId: string;
  private isSandbox: boolean;

  constructor(merchantId?: string, isSandbox = false) {
    this.merchantId = merchantId || process.env.ZARINPAL_MERCHANT_ID || '00000000-0000-0000-0000-000000000000';
    this.isSandbox = isSandbox || process.env.NODE_ENV !== 'production';
  }

  private get baseUrl(): string {
    return this.isSandbox ? 'https://sandbox.zarinpal.com/pg' : 'https://api.zarinpal.com/pg';
  }

  private get paymentUrl(): string {
    return this.isSandbox ? 'https://sandbox.zarinpal.com/pg/StartPay' : 'https://www.zarinpal.com/pg/StartPay';
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v4/payment/request.json`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          merchant_id: this.merchantId,
          amount: params.amountToman,
          currency: 'IRT', // Iranian Toman
          callback_url: params.callbackUrl,
          description: params.description,
          metadata: {
            mobile: params.mobile,
            order_id: params.orderId,
            order_number: params.orderNumber,
          },
        }),
      });

      const json = await response.json();

      if (response.ok && json.data && json.data.code === 100) {
        const authority = json.data.authority;
        return {
          success: true,
          authority,
          paymentUrl: `${this.paymentUrl}/${authority}`,
          gateway: this.gatewayType,
        };
      }

      return {
        success: false,
        outcome: 'UNKNOWN', // Enable definitive retry codes only after provider reconciliation acceptance.
        authority: '',
        paymentUrl: '',
        gateway: this.gatewayType,
        errorMessage: json.errors?.message || 'خطا در ارتباط با درگاه زرین‌پال',
      };
    } catch (err: any) {
      console.error('Zarinpal initiation unavailable');
      return {
        success: false,
        outcome: 'UNKNOWN',
        authority: '',
        paymentUrl: '',
        gateway: this.gatewayType,
        errorMessage: 'خطای شبکه در اتصال به درگاه زرین‌پال',
      };
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v4/payment/verify.json`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          merchant_id: this.merchantId,
          amount: params.amountToman,
          authority: params.authority,
        }),
      });

      const json = await response.json();

      if (response.ok && json.data && (json.data.code === 100 || json.data.code === 101) && json.data.ref_id) {
        return {
          success: true,
          referenceId: json.data.ref_id ? json.data.ref_id.toString() : undefined,
          // Card-derived fields are deliberately not retained.
          feeToman: json.data.fee,
          rawPayload: { code: json.data.code },
        };
      }

      return {
        success: false,
        outcome: 'UNKNOWN',
        errorMessage: json.errors?.message || 'تراکنش توسط درگاه بانکی تایید نشد',
        rawPayload: { code: json.errors?.code ?? null },
      };
    } catch (err: any) {
      console.error('Zarinpal verification unavailable');
      return {
        success: false,
        outcome: 'UNKNOWN',
        errorMessage: 'خطای شبکه هنگام تایید تراکنش در درگاه زرین‌پال',
      };
    }
  }
}

export const zarinpalGateway = new ZarinpalGatewayAdapter();
