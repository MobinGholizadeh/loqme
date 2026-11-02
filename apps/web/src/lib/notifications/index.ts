import { INotificationService } from './types';
import { ConsoleMockNotificationService } from './console-mock';
import { SmsIrNotificationService } from './smsir';
import { env } from '@/core/config';

let notificationServiceInstance: INotificationService | null = null;

const unavailable: INotificationService = {
  sendOtp: async () => false,
  sendOrderConfirmation: async () => false,
  sendPickupReminder: async () => false,
  sendOrderDelayNotification: async () => false,
};

export function getNotificationService(): INotificationService {
  if (!notificationServiceInstance) {
    if (env.SMS_PROVIDER === 'smsir') {
      if (env.SMSIR_API_KEY) {
        notificationServiceInstance = new SmsIrNotificationService({
          apiKey: env.SMSIR_API_KEY,
          lineNumber: env.SMSIR_LINE_NUMBER,
          templateId: env.SMSIR_TEMPLATE_ID,
          codeParamName: env.SMSIR_CODE_PARAM_NAME,
        });
      } else {
        console.error('[SMS] SMS.ir API key is missing; delivery is unavailable');
        notificationServiceInstance = unavailable;
      }
    } else {
      // A production login must never claim that a console-only code was sent.
      notificationServiceInstance = env.NODE_ENV === 'production'
        ? unavailable : new ConsoleMockNotificationService();
    }
  }
  return notificationServiceInstance;
}

/**
 * Resets the cached singleton instance (primarily for tests)
 */
export function resetNotificationService(): void {
  notificationServiceInstance = null;
}
