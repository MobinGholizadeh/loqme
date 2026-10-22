import { INotificationService } from './types';

export interface SmsIrConfig {
  apiKey: string;
  lineNumber?: string | number;
  templateId?: string | number;
  codeParamName?: string;
}

export interface SmsIrApiResponse<T = any> {
  status: number;
  message: string;
  data?: T;
}

/**
 * Normalizes any Persian/Arabic digits to ASCII digits
 */
function normalizeDigits(input: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let output = input;
  for (let i = 0; i < 10; i++) {
    output = output.replace(new RegExp(persianDigits[i], 'g'), String(i));
    output = output.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return output;
}

/**
 * Normalizes phone numbers to standard 11-digit Iranian format (09xxxxxxxxx)
 */
export function normalizeIranianMobile(phone: string): string {
  let cleaned = normalizeDigits(phone.trim()).replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+98')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('98') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  } else if (!cleaned.startsWith('0') && cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * SMS.ir Provider Adapter
 * Implements SMS.ir REST API v1 (https://app.sms.ir/developer/help)
 * - sendOtp: Uses /v1/send/verify if templateId is available; falls back to /v1/send/bulk
 * - sendOrderConfirmation: Uses /v1/send/bulk
 * - sendPickupReminder: Uses /v1/send/bulk
 */
export class SmsIrNotificationService implements INotificationService {
  private readonly baseUrl = 'https://api.sms.ir/v1';
  private readonly apiKey: string;
  private readonly lineNumber: number;
  private readonly templateId: number | null;
  private readonly codeParamName: string;

  constructor(config: SmsIrConfig) {
    if (!config.apiKey) {
      throw new Error('SmsIrNotificationService: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.lineNumber = config.lineNumber ? Number(config.lineNumber) : 30002108039036;
    this.templateId = config.templateId ? Number(config.templateId) : null;
    this.codeParamName = config.codeParamName || 'Code';
  }

  /**
   * Dispatches OTP verification code using template verification or bulk fallback
   */
  async sendOtp(mobile: string, code: string): Promise<boolean> {
    const normalizedMobile = normalizeIranianMobile(mobile);
    const normalizedCode = normalizeDigits(code.trim());

    if (this.templateId) {
      // 1. Send via /v1/send/verify (Fast verification pattern)
      return this.sendWithTemplate(normalizedMobile, this.templateId, [
        { name: this.codeParamName, value: normalizedCode },
      ]);
    }

    // 2. Fallback to /v1/send/bulk if no template ID is defined yet
    const messageText = `کد تایید ورود به لقمه:\n${normalizedCode}\nاعتبار: ۲ دقیقه`;
    return this.sendBulk(normalizedMobile, messageText);
  }

  /**
   * Dispatches order confirmation notification
   */
  async sendOrderConfirmation(
    mobile: string,
    orderNumber: string,
    pickupWindow: string
  ): Promise<boolean> {
    const normalizedMobile = normalizeIranianMobile(mobile);
    const messageText = `سفارش ${orderNumber} شما در لقمه با موفقیت ثبت شد؛\nبازه تحویل حضوری: ${pickupWindow}\nبا تشکر از شما - لقمه`;
    return this.sendBulk(normalizedMobile, messageText);
  }

  /**
   * Dispatches pickup reminder before collection deadline
   */
  async sendPickupReminder(
    mobile: string,
    orderNumber: string,
    remainingMinutes: number
  ): Promise<boolean> {
    const normalizedMobile = normalizeIranianMobile(mobile);
    const messageText = `یادآوری لقمه: تنها ${remainingMinutes} دقیقه تا پایان زمان تحویل سفارش ${orderNumber} باقی مانده است`;
    return this.sendBulk(normalizedMobile, messageText);
  }

  /**
   * Internal helper to send message via /v1/send/verify
   */
  private async sendWithTemplate(
    mobile: string,
    templateId: number,
    parameters: Array<{ name: string; value: string }>
  ): Promise<boolean> {
    const url = `${this.baseUrl}/send/verify`;
    const payload = {
      mobile,
      templateId,
      parameters,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        console.error(`[SmsIr] HTTP ${response.status} ${response.statusText} from /send/verify`);
        return false;
      }

      const result = (await response.json()) as SmsIrApiResponse;
      if (result.status === 1) {
        return true;
      }

      console.error(`[SmsIr] Verify API error (status ${result.status}): ${result.message}`);
      return false;
    } catch (err: any) {
      if (err.name === 'TimeoutError') {
        console.error('[SmsIr] Request timed out while sending verification template');
      } else {
        console.error('[SmsIr] Network error calling /send/verify:', err.message || err);
      }
      return false;
    }
  }

  /**
   * Internal helper to send message via /v1/send/bulk
   */
  private async sendBulk(mobile: string, messageText: string): Promise<boolean> {
    const url = `${this.baseUrl}/send/bulk`;
    const payload = {
      lineNumber: this.lineNumber,
      messageText,
      mobiles: [mobile],
      sendDateTime: null,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        console.error(`[SmsIr] HTTP ${response.status} ${response.statusText} from /send/bulk`);
        return false;
      }

      const result = (await response.json()) as SmsIrApiResponse;
      if (result.status === 1) {
        return true;
      }

      console.error(`[SmsIr] Bulk API error (status ${result.status}): ${result.message}`);
      return false;
    } catch (err: any) {
      if (err.name === 'TimeoutError') {
        console.error('[SmsIr] Request timed out while sending bulk SMS');
      } else {
        console.error('[SmsIr] Network error calling /send/bulk:', err.message || err);
      }
      return false;
    }
  }
}
