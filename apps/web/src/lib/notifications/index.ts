import { INotificationService } from './types';
import { ConsoleMockNotificationService } from './console-mock';
import { env } from '@/core/config';

let notificationServiceInstance: INotificationService | null = null;

export function getNotificationService(): INotificationService {
  if (!notificationServiceInstance) {
    if (env.SMS_PROVIDER === 'console') {
      notificationServiceInstance = new ConsoleMockNotificationService();
    } else {
      // Fallback to console mock if production keys are not yet configured
      console.warn(`⚠️ SMS provider "${env.SMS_PROVIDER}" requested, falling back to ConsoleMock.`);
      notificationServiceInstance = new ConsoleMockNotificationService();
    }
  }
  return notificationServiceInstance;
}
