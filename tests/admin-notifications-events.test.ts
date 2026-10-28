import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, notifications } = vi.hoisted(() => {
  const mockDb: any = {
    order: { findUnique: vi.fn(), findMany: vi.fn() },
    complaint: { create: vi.fn(), count: vi.fn() },
    listingSafety: { updateMany: vi.fn() },
    listing: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    merchant: { findFirst: vi.fn(), findUnique: vi.fn() },
    merchantBankAccount: { findFirst: vi.fn() },
    merchantPayoutRequest: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockDb)),
  };
  const mockNotifications = {
    notifyAdmins: vi.fn().mockResolvedValue(undefined),
    notifyMerchant: vi.fn().mockResolvedValue(undefined),
  };
  return { db: mockDb, notifications: mockNotifications };
});

vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/notification/notification.service', () => ({ notificationService: notifications }));

import { ModerationService } from '@/domain/moderation/moderation.service';
import { MerchantBankService } from '@/domain/merchant/merchant-bank.service';
import { BankAccountStatus, PayoutRequestStatus } from '@prisma/client';

describe('Admin Notifications for Complaint and Payout Submissions', () => {
  let moderationService: ModerationService;
  let merchantBankService: MerchantBankService;

  beforeEach(() => {
    vi.clearAllMocks();
    moderationService = new ModerationService();
    merchantBankService = new MerchantBankService();
  });

  it('notifies system administrators when a customer submits a complaint', async () => {
    db.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'LQ-12345678',
      customerId: 'customer-1',
      merchantId: 'merchant-1',
      customer: { fullName: 'سارا محمدی' },
      merchant: { businessNameFa: 'نانوایی سنتی برکت' },
    });

    db.complaint.create.mockResolvedValue({
      id: 'complaint-1',
      orderId: 'order-1',
      customerId: 'customer-1',
      merchantId: 'merchant-1',
      category: 'WRONG_ITEM',
      descriptionFa: 'محصول ارسال‌شده اشتباه بود',
      status: 'PENDING',
    });

    db.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    await moderationService.submitComplaint('customer-1', 'order-1', {
      category: 'WRONG_ITEM' as any,
      descriptionFa: 'محصول ارسال‌شده اشتباه بود',
    });

    expect(notifications.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(notifications.notifyAdmins).toHaveBeenCalledWith({
      type: 'COMPLAINT_FILED',
      category: 'system',
      title: 'ثبت شکایت جدید برای سفارش #LQ-12345678',
      body: 'شکایت جدیدی از طرف سارا محمدی برای فروشگاه «نانوایی سنتی برکت» ثبت گردید.',
      link: '/admin/moderation',
      tag: 'complaint-complaint-1',
    });
  });

  it('notifies system administrators when a merchant submits a payout withdrawal request', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-owner-1',
      role: 'MERCHANT_OWNER',
      isActive: true,
    });
    // 1. Authorize owner check
    db.merchant.findUnique.mockResolvedValue({
      id: 'merchant-1',
      businessNameFa: 'قنادی الف',
      ownerUserId: 'user-owner-1',
      staff: [],
      locations: [],
    });

    // 2. Bank account check
    const validBankAccountId = '00000000-0000-0000-0000-000000000001';
    db.merchantBankAccount.findFirst.mockResolvedValue({
      id: validBankAccountId,
      merchantId: 'merchant-1',
      shabaNumber: 'IR120120000000001234567890',
      bankName: 'بانک ملت',
      accountHolder: 'علی رضایی',
      status: BankAccountStatus.APPROVED,
      isActive: true,
    });

    // 3. Balance checks
    db.order.findMany.mockResolvedValue([
      { merchantPayoutAmountToman: 500000n },
    ]);
    db.merchantPayoutRequest.findMany.mockResolvedValue([]);
    db.merchantPayoutRequest.findFirst.mockResolvedValue(null); // No recent duplicate

    const now = new Date();
    db.merchantPayoutRequest.create.mockResolvedValue({
      id: 'payout-1',
      merchantId: 'merchant-1',
      bankAccountId: validBankAccountId,
      bankAccount: {
        id: validBankAccountId,
        shabaNumber: 'IR120120000000001234567890',
        bankName: 'بانک ملت',
        accountHolder: 'علی رضایی',
      },
      amountToman: 200000n,
      status: PayoutRequestStatus.PENDING,
      trackingReference: null,
      rejectionReason: null,
      notesFa: 'تسویه هفتگی',
      requestedByUserId: 'user-owner-1',
      reviewedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    db.auditLog.create.mockResolvedValue({ id: 'audit-2' });

    const result = await merchantBankService.requestPayout('user-owner-1', 'merchant-1', {
      bankAccountId: validBankAccountId,
      amountToman: 200000,
      notesFa: 'تسویه هفتگی',
    });

    expect(result.id).toBe('payout-1');
    expect(notifications.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(notifications.notifyAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAYOUT_REQUESTED',
        category: 'system',
        title: 'درخواست تسویه حساب جدید',
        body: expect.stringContaining('قنادی الف'),
        link: '/admin/finance',
        tag: 'payout-payout-1',
      })
    );
  });
});
