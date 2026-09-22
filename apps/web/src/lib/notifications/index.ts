import { INotificationService } from './types';
import { ConsoleMockNotificationService } from './console-mock';
import { SmsIrNotificationService } from './smsir';
import { env } from '@/core/config';

let notificationServiceInstance: INotificationService | null = null;

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
        console.warn('⚠️ SMS provider "smsir" requested, but SMSIR_API_KEY is missing. Falling back to ConsoleMock.');
        notificationServiceInstance = new ConsoleMockNotificationService();
      }
    } else {
      // Default to console mock for development, testing, and zero-credit local usage
      notificationServiceInstance = new ConsoleMockNotificationService();
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
