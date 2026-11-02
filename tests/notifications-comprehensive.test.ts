import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, notifications } = vi.hoisted(() => {
  const mockDb: any = {
    order: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), updateManyAndReturn: vi.fn() },
    complaint: { create: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    review: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    customer: { findUnique: vi.fn() },
    listingSafety: { updateMany: vi.fn(), upsert: vi.fn() },
    listing: { updateMany: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    merchant: { findFirst: vi.fn(), findUnique: vi.fn() },
    merchantBankAccount: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    merchantStaff: { findUnique: vi.fn() },
    merchantPayoutRequest: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    pickupVerification: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    payment: { update: vi.fn() },
    financialTransaction: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockDb)),
  };
  const mockNotifications = {
    notifyAdmins: vi.fn().mockResolvedValue(undefined),
    notifyMerchant: vi.fn().mockResolvedValue(undefined),
    createNotification: vi.fn().mockResolvedValue(undefined),
  };
  return { db: mockDb, notifications: mockNotifications };
});

vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/notification/notification.service', () => ({ notificationService: notifications }));

import { ModerationService } from '@/domain/moderation/moderation.service';
import { MerchantBankService } from '@/domain/merchant/merchant-bank.service';
import { AdminBankService } from '@/domain/admin/admin-bank.service';
import { PickupService } from '@/domain/pickup/pickup.service';
import { BankAccountStatus, PayoutRequestStatus, Role } from '@prisma/client';

function makeValidShaba(bankCode: string = '012', accountNum: string = '12345678'): string {
  const bban = bankCode + accountNum.padStart(19, '0');
  const remainder = Number(BigInt(bban + '182700') % BigInt(97));
  const checkDigits = (98 - remainder).toString().padStart(2, '0');
  return `IR${checkDigits}${bban}`;
}

describe('Comprehensive Notification System Coverage across Admin, Merchant, Customer', () => {
  let moderationService: ModerationService;
  let merchantBankService: MerchantBankService;
  let adminBankService: AdminBankService;
  let pickupService: PickupService;

  beforeEach(() => {
    vi.clearAllMocks();
    moderationService = new ModerationService();
    merchantBankService = new MerchantBankService();
    adminBankService = new AdminBankService();
    pickupService = new PickupService();
  });

  it('notifies admins when a merchant registers a new bank account', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'user-owner-1', role: 'MERCHANT_OWNER', isActive: true });
    db.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      businessNameFa: 'کافه نان ارومیه',
      ownerUserId: 'user-owner-1',
      staff: [],
      locations: [],
    });
    db.merchantBankAccount.findFirst.mockResolvedValue(null);
    const validShaba = makeValidShaba();
    db.merchantBankAccount.create.mockResolvedValue({
      id: 'bank-1',
      merchantId: 'merchant-1',
      shabaNumber: validShaba,
      bankName: 'بانک ملت',
      bankCode: '012',
      accountHolder: 'علی همت‌نیا',
      isDefault: false,
      status: BankAccountStatus.PENDING,
      rejectionReason: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await merchantBankService.addBankAccount('user-owner-1', 'merchant-1', {
      shabaNumber: validShaba,
      accountHolder: 'علی همت‌نیا',
      bankName: 'بانک ملت',
    });

    expect(notifications.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(notifications.notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BANK_ACCOUNT_SUBMITTED',
        category: 'system',
        title: 'ثبت شماره شبا جدید برای فروشگاه',
        body: expect.stringContaining('کافه نان ارومیه'),
      })
    );
  });

  it('notifies merchant when admin approves or completes payout request', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', isActive: true });
    db.merchantPayoutRequest.findUnique.mockResolvedValue({
      id: 'payout-1',
      merchantId: 'merchant-1',
      amountToman: 500000n,
      status: PayoutRequestStatus.PENDING,
      bankAccount: { shabaNumber: 'IR120120000000001234567890' },
      merchant: { businessNameFa: 'قنادی الف' },
    });
    db.merchantPayoutRequest.update.mockResolvedValue({
      id: 'payout-1',
      merchantId: 'merchant-1',
      status: PayoutRequestStatus.COMPLETED,
    });
    db.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    db.financialTransaction.create.mockResolvedValue({ id: 'tx-1' });

    await adminBankService.reviewPayoutRequest('admin-1', 'payout-1', {
      action: 'COMPLETE',
      trackingReference: 'PAYA-987654321',
    });

    expect(notifications.notifyMerchant).toHaveBeenCalledTimes(1);
    expect(notifications.notifyMerchant).toHaveBeenCalledWith(
      'merchant-1',
      expect.objectContaining({
        type: 'PAYOUT_COMPLETED',
        category: 'system',
        title: 'واریز وجه تسویه حساب',
        body: expect.stringContaining('PAYA-987654321'),
      })
    );
  });

  it('notifies merchant when customer files a complaint', async () => {
    db.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'LQ-88888888',
      customerId: 'customer-1',
      merchantId: 'merchant-1',
      customer: { fullName: 'رضا کمالی' },
      merchant: { businessNameFa: 'رستوران صوفی' },
    });
    db.complaint.create.mockResolvedValue({
      id: 'complaint-1',
      orderId: 'order-1',
      customerId: 'customer-1',
      merchantId: 'merchant-1',
      category: 'WRONG_ITEM',
      descriptionFa: 'سفارش اشتباه تحویل شد',
      status: 'PENDING',
    });
    db.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    await moderationService.submitComplaint('customer-1', 'order-1', {
      category: 'WRONG_ITEM' as any,
      descriptionFa: 'سفارش اشتباه تحویل شد',
    });

    expect(notifications.notifyMerchant).toHaveBeenCalledWith(
      'merchant-1',
      expect.objectContaining({
        type: 'COMPLAINT_RECEIVED',
        category: 'order',
        title: expect.stringContaining('LQ-88888888'),
      })
    );
  });

  it('notifies customer when merchant replies to their review', async () => {
    db.review.findUnique
      .mockResolvedValueOnce({
        id: 'rev-1',
        merchantId: 'merchant-1',
        merchant: { ownerUserId: 'owner-1', businessNameFa: 'شیرینی سرای هما' },
      })
      .mockResolvedValueOnce({
        id: 'rev-1',
        merchantId: 'merchant-1',
        merchant: { businessNameFa: 'شیرینی سرای هما' },
        order: {
          customer: {
            user: { id: 'cust-user-1', role: Role.CUSTOMER },
          },
        },
      });

    db.review.update.mockResolvedValue({ id: 'rev-1', merchantReplyFa: 'با تشکر از نظر شما' });
    db.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    await moderationService.replyToReview('owner-1', 'rev-1', 'با تشکر از نظر شما');

    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'cust-user-1',
        role: Role.CUSTOMER,
        type: 'REVIEW_REPLIED',
        category: 'order',
        title: 'پاسخ فروشگاه به دیدگاه شما',
        body: expect.stringContaining('با تشکر از نظر شما'),
      })
    );
  });

  it('notifies customer and merchant on sweepNoShows expiration', async () => {
    db.order.findMany
      .mockResolvedValueOnce([{ id: 'order-expired-1' }])
      .mockResolvedValueOnce([
        {
          id: 'order-expired-1',
          orderNumber: 'LQ-EXP12345',
          merchantId: 'merchant-1',
          customer: { user: { id: 'user-cust-1', role: Role.CUSTOMER } },
          merchant: { id: 'merchant-1', businessNameFa: 'کافه ویونا' },
        },
      ]);

    db.order.updateManyAndReturn.mockResolvedValue([{ id: 'order-expired-1' }]);

    await pickupService.sweepNoShows('merchant-1');

    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-cust-1',
        type: 'ORDER_NO_SHOW',
        category: 'order',
        title: 'پایان مهلت تحویل سفارش',
      })
    );

    expect(notifications.notifyMerchant).toHaveBeenCalledWith(
      'merchant-1',
      expect.objectContaining({
        type: 'ORDER_NO_SHOW',
        category: 'order',
        title: expect.stringContaining('LQ-EXP12345'),
      })
    );
  });

  it('sends pickup reminder notification to customer when within 45 minutes of window closure', async () => {
    db.order.findMany.mockResolvedValue([
      {
        id: 'order-remind-1',
        orderNumber: 'LQ-REM45',
        customer: { user: { id: 'user-cust-2', role: Role.CUSTOMER, mobile: '09121111111' } },
        pickupVerification: { id: 'pv-1', isVerified: false, reminderSentAt: null },
      },
    ]);
    db.pickupVerification.update.mockResolvedValue({ id: 'pv-1' });

    const count = await pickupService.checkPickupReminders();

    expect(count).toBe(1);
    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-cust-2',
        role: Role.CUSTOMER,
        type: 'PICKUP_REMINDER',
        category: 'order',
        title: 'یادآوری تحویل سفارش',
        smsRecipientMobile: '09121111111',
        smsType: 'PICKUP_REMINDER',
      })
    );
  });
});
