import { PaymentGatewayType } from '@prisma/client';

export interface InitiatePaymentParams {
  orderId: string;
  orderNumber: string;
  amountToman: number;
  callbackUrl: string;
  mobile?: string;
  description: string;
}

export interface InitiatePaymentResult {
  success: boolean;
  authority: string;
  paymentUrl: string;
  gateway: PaymentGatewayType;
  errorMessage?: string;
}

export interface VerifyPaymentParams {
  authority: string;
  amountToman: number;
}

export interface VerifyPaymentResult {
  success: boolean;
  referenceId?: string;
  trackingCode?: string;
  feeToman?: number;
  rawPayload?: Record<string, any>;
  errorMessage?: string;
}

export interface RefundPaymentParams {
  authority: string;
  amountToman: number;
  reason: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId?: string;
  errorMessage?: string;
  rawPayload?: Record<string, any>;
}

export interface IPaymentGateway {
  readonly gatewayType: PaymentGatewayType;
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  refundPayment?(params: RefundPaymentParams): Promise<RefundPaymentResult>;
}

