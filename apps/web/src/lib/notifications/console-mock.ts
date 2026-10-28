import { INotificationService } from './types';
import { toPersianDigits } from '../utils/persian';

export interface SentOtpRecord {
  mobile: string;
  code: string;
  sentAt: Date;
}

const globalForOtps = globalThis as unknown as {
  __loqme_recent_otps: Map<string, SentOtpRecord> | undefined;
};

const otpsMap =
  globalForOtps.__loqme_recent_otps ?? new Map<string, SentOtpRecord>();

if (process.env.NODE_ENV !== 'production') {
  globalForOtps.__loqme_recent_otps = otpsMap;
}

export class ConsoleMockNotificationService implements INotificationService {
  async sendOtp(mobile: string, code: string): Promise<boolean> {
    const record: SentOtpRecord = {
      mobile,
      code,
      sentAt: new Date(),
    };
    otpsMap.set(mobile, record);

    console.log('\n=========================================');
    console.log('📱 [MOCK SMS DISPATCH - LOQME / لقمه]');
    console.log(`👤 Mobile: ${mobile}`);
    console.log(`🔑 Verification Code (OTP): [ ${code} ] (${toPersianDigits(code)})`);
    console.log(`⏱️  Validity Window: 2 minutes`);
    console.log('=========================================\n');

    return true;
  }

  async sendOrderConfirmation(mobile: string, orderNumber: string, pickupWindow: string): Promise<boolean> {
    console.log(`📱 [SMS] Order ${orderNumber} confirmed for ${mobile}. Pickup window: ${pickupWindow}`);
    return true;
  }

  async sendPickupReminder(mobile: string, orderNumber: string, remainingMinutes: number): Promise<boolean> {
    console.log(`📱 [SMS] Reminder for ${mobile}: Order pickup closes in ${remainingMinutes} mins.`);
    return true;
  }

  async sendOrderDelayNotification(mobile: string, orderNumber: string, newPickupWindow: string, delayReason?: string): Promise<boolean> {
    console.log(`📱 [SMS] Delay notice for order ${orderNumber} (${mobile}). New window: ${newPickupWindow}. Reason: ${delayReason || 'تغییر بازه تحویل'}`);
    return true;
  }

  static getRecentOtp(mobile: string): SentOtpRecord | undefined {
    return otpsMap.get(mobile);
  }

  static getAllRecentOtps(): SentOtpRecord[] {
    return Array.from(otpsMap.values());
  }
}
