/**
 * Notification & SMS provider abstraction
 * Implements architectural directive from ARCHITECTURE.md Section 3.2
 * Supported providers: ConsoleMockNotificationService (dev/test), SmsIrNotificationService (production)
 */
export interface INotificationService {
  /**
   * Dispatches one-time verification password (OTP)
   */
  sendOtp(mobile: string, code: string): Promise<boolean>;

  /**
   * Dispatches order confirmation message upon successful payment
   */
  sendOrderConfirmation(mobile: string, orderNumber: string, pickupWindow: string): Promise<boolean>;

  /**
   * Dispatches reminder notification before pickup window closes
   */
  sendPickupReminder(mobile: string, orderNumber: string, remainingMinutes: number): Promise<boolean>;
}
