import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Valid test Sheba generator
function makeValidShaba(bankCode: string = '012', accountNum: string = '12345678'): string {
  const bban = bankCode + accountNum.padStart(19, '0');
  const remainder = Number(BigInt(bban + '182700') % BigInt(97));
  const checkDigits = (98 - remainder).toString().padStart(2, '0');
  return `IR${checkDigits}${bban}`;
}

const { db } = vi.hoisted(() => {
  const mockDb: any = {
    merchant: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn() },
    merchantBankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    merchantPayoutRequest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    financialTransaction: { findMany: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockDb)),
  };
  return { db: mockDb };
});

vi.mock('@/lib/prisma', () => ({ prisma: db }));
vi.mock('@/domain/admin/merchant-account.service', () => ({
  assertActiveAdmin: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'ACTIVE' }),
}));

import { MerchantBankService } from '@/domain/merchant/merchant-bank.service';
import { AdminBankService } from '@/domain/admin/admin-bank.service';
import { merchantService } from '@/domain/merchant/merchant.service';
import { BankAccountStatus, PayoutRequestStatus, FinancialTransactionType } from '@prisma/client';

describe('Merchant Bank Accounts & Wallet Payouts Domain', () => {
  let merchantBankService: MerchantBankService;
  let adminBankService: AdminBankService;

  const mockMerchant = {
    id: 'merchant-uuid-1',
    businessNameFa: 'نانوایی سنگک سنتی',
    ownerUserId: 'user-owner-1',
  };

  const sampleValidShaba = makeValidShaba('012', '99887766'); // Bank Mellat

  beforeEach(() => {
    vi.resetAllMocks();
    merchantBankService = new MerchantBankService();
    adminBankService = new AdminBankService();

    // Stub merchantService.resolveMerchantAndAuthorize to allow owner
    vi.spyOn(merchantService, 'resolveMerchantAndAuthorize').mockResolvedValue({
      merchant: mockMerchant as any,
      role: 'OWNER' as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MerchantBankService: Bank Account Management', () => {
    it('lists active bank accounts for the merchant', async () => {
      const now = new Date();
      db.merchantBankAccount.findMany.mockResolvedValue([
        {
          id: 'acc-1',
          merchantId: mockMerchant.id,
          shabaNumber: sampleValidShaba,
          bankName: 'بانک ملت',
          bankCode: '012',
          accountHolder: 'علی احمدی',
          isDefault: true,
          status: BankAccountStatus.APPROVED,
          rejectionReason: null,
          reviewedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const list = await merchantBankService.listBankAccounts('user-owner-1');
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        id: 'acc-1',
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        isDefault: true,
        status: BankAccountStatus.APPROVED,
      });
      expect(db.merchantBankAccount.findMany).toHaveBeenCalledWith({
        where: { merchantId: mockMerchant.id, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('adds a new bank account with PENDING status and not default', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue(null); // No duplicate
      const now = new Date();
      db.merchantBankAccount.create.mockResolvedValue({
        id: 'acc-new',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        bankCode: '012',
        accountHolder: 'محمد کریمی',
        isDefault: false,
        status: BankAccountStatus.PENDING,
        rejectionReason: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await merchantBankService.addBankAccount('user-owner-1', mockMerchant.id, {
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        accountHolder: 'محمد کریمی',
      });

      expect(result.status).toBe(BankAccountStatus.PENDING);
      expect(result.isDefault).toBe(false);
      expect(db.merchantBankAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            merchantId: mockMerchant.id,
            status: BankAccountStatus.PENDING,
            isDefault: false,
            isActive: true,
          }),
        })
      );
    });

    it('rejects adding duplicate active bank account with the same Shaba', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({ id: 'acc-existing' });

      await expect(
        merchantBankService.addBankAccount('user-owner-1', mockMerchant.id, {
          shabaNumber: sampleValidShaba,
          bankName: 'بانک ملت',
          accountHolder: 'محمد کریمی',
        })
      ).rejects.toThrow('این شماره شبا قبلاً برای فروشگاه شما ثبت شده است');
    });

    it('updates bank account and resets status to PENDING if shaba or accountHolder changes', async () => {
      const now = new Date();
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        bankCode: '012',
        accountHolder: 'نام قبلی',
        isDefault: true,
        status: BankAccountStatus.APPROVED,
        isActive: true,
      });

      db.merchantBankAccount.update.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        bankCode: '012',
        accountHolder: 'نام جدید اصلاح شده',
        isDefault: false, // Reset default
        status: BankAccountStatus.PENDING, // Reset status
        rejectionReason: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const updated = await merchantBankService.updateBankAccount('user-owner-1', mockMerchant.id, 'acc-1', {
        accountHolder: 'نام جدید اصلاح شده',
      });

      expect(updated.status).toBe(BankAccountStatus.PENDING);
      expect(updated.isDefault).toBe(false);
      expect(db.merchantBankAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc-1' },
          data: expect.objectContaining({
            status: BankAccountStatus.PENDING,
            isDefault: false,
            accountHolder: 'نام جدید اصلاح شده',
          }),
        })
      );
    });

    it('prevents deleting a bank account if active payout requests exist', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        isActive: true,
      });
      // 1 active pending payout
      db.merchantPayoutRequest.count.mockResolvedValue(1);

      await expect(
        merchantBankService.deleteBankAccount('user-owner-1', mockMerchant.id, 'acc-1')
      ).rejects.toThrow('دارای درخواست تسویه در حال پردازش است');
    });

    it('soft-deletes bank account when no active payouts exist', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        isActive: true,
      });
      db.merchantPayoutRequest.count.mockResolvedValue(0);
      db.merchantBankAccount.update.mockResolvedValue({ id: 'acc-1', isActive: false });

      const res = await merchantBankService.deleteBankAccount('user-owner-1', mockMerchant.id, 'acc-1');
      expect(res.success).toBe(true);
      expect(db.merchantBankAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { isActive: false, isDefault: false },
      });
    });

    it('prevents setting an unapproved (PENDING/REJECTED) account as default', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        status: BankAccountStatus.PENDING,
        isActive: true,
      });

      await expect(
        merchantBankService.setDefaultBankAccount('user-owner-1', mockMerchant.id, 'acc-1')
      ).rejects.toThrow('فقط حساب‌های بانکی تایید شده');
    });

    it('sets approved bank account as default and unsets former defaults in transaction', async () => {
      const now = new Date();
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: 'acc-approved',
        merchantId: mockMerchant.id,
        status: BankAccountStatus.APPROVED,
        isActive: true,
      });

      db.merchantBankAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc-approved',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        bankCode: '012',
        accountHolder: 'علی احمدی',
        isDefault: true,
        status: BankAccountStatus.APPROVED,
        rejectionReason: null,
        reviewedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const res = await merchantBankService.setDefaultBankAccount('user-owner-1', mockMerchant.id, 'acc-approved');
      expect(res.isDefault).toBe(true);
      expect(db.merchantBankAccount.updateMany).toHaveBeenCalledWith({
        where: { merchantId: mockMerchant.id, isDefault: true },
        data: { isDefault: false },
      });
      expect(db.merchantBankAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-approved' },
        data: { isDefault: true },
      });
    });
  });

  describe('MerchantBankService: Wallet & Payout Withdrawals', () => {
    it('calculates available balance considering completed and pending payouts', async () => {
      // Net earnings = 1,000,000 Toman
      db.order.findMany.mockResolvedValue([
        { totalAmountToman: 1200000n, commissionAmountToman: 200000n, merchantPayoutAmountToman: 1000000n },
      ]);

      // Completed payout = 300,000 Toman, Pending payout = 200,000 Toman
      db.merchantPayoutRequest.findMany.mockResolvedValue([
        { amountToman: 300000n, status: PayoutRequestStatus.COMPLETED },
        { amountToman: 200000n, status: PayoutRequestStatus.PENDING },
      ]);

      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: 'acc-default',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        bankCode: '012',
        accountHolder: 'علی احمدی',
        isDefault: true,
        status: BankAccountStatus.APPROVED,
        rejectionReason: null,
        reviewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      db.merchantBankAccount.count.mockResolvedValue(1);

      const wallet = await merchantBankService.getWalletSummary('user-owner-1');

      expect(wallet.grossSalesToman).toBe(1200000);
      expect(wallet.platformCommissionToman).toBe(200000);
      expect(wallet.netEarningsToman).toBe(1000000);
      expect(wallet.completedPayoutsToman).toBe(300000);
      expect(wallet.pendingPayoutsToman).toBe(200000);
      // Available = 1,000,000 - 300,000 - 200,000 = 500,000 Toman
      expect(wallet.availableBalanceToman).toBe(500000);
      expect(wallet.defaultBankAccount).not.toBeNull();
      expect(wallet.defaultBankAccount?.isDefault).toBe(true);
      expect(wallet.approvedAccountsCount).toBe(1);
    });

    it('rejects payout request if destination account is unapproved', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        merchantId: mockMerchant.id,
        status: BankAccountStatus.PENDING,
        isActive: true,
      });

      await expect(
        merchantBankService.requestPayout('user-owner-1', mockMerchant.id, {
          bankAccountId: '00000000-0000-0000-0000-000000000001',
          amountToman: 50000,
        })
      ).rejects.toThrow('تسویه وجه فقط به حساب‌های بانکی تایید شده امکان‌پذیر است');
    });

    it('rejects payout request exceeding live available balance', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        merchantId: mockMerchant.id,
        status: BankAccountStatus.APPROVED,
        isActive: true,
      });

      // Net earnings = 100,000 Toman
      db.order.findMany.mockResolvedValue([{ merchantPayoutAmountToman: 100000n }]);
      db.merchantPayoutRequest.findMany.mockResolvedValue([]); // No previous payouts

      // Try to withdraw 150,000 Toman
      await expect(
        merchantBankService.requestPayout('user-owner-1', mockMerchant.id, {
          bankAccountId: '00000000-0000-0000-0000-000000000001',
          amountToman: 150000,
        })
      ).rejects.toThrow('موجودی قابل تسویه شما کافی نمی‌باشد');
    });

    it('rejects duplicate rapid payout submission within 30 seconds', async () => {
      db.merchantBankAccount.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        merchantId: mockMerchant.id,
        status: BankAccountStatus.APPROVED,
        isActive: true,
      });

      db.order.findMany.mockResolvedValue([{ merchantPayoutAmountToman: 1000000n }]);
      db.merchantPayoutRequest.findMany.mockResolvedValue([]);

      // Existing identical request within 30s
      db.merchantPayoutRequest.findFirst.mockResolvedValue({
        id: 'payout-dup',
        amountToman: 50000n,
        status: PayoutRequestStatus.PENDING,
      });

      await expect(
        merchantBankService.requestPayout('user-owner-1', mockMerchant.id, {
          bankAccountId: '00000000-0000-0000-0000-000000000001',
          amountToman: 50000,
        })
      ).rejects.toThrow('یک درخواست تسویه مشابه در حال بررسی است');
    });

    it('creates payout request with status PENDING when valid', async () => {
      const bankAcc = {
        id: '00000000-0000-0000-0000-000000000001',
        merchantId: mockMerchant.id,
        status: BankAccountStatus.APPROVED,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        accountHolder: 'علی احمدی',
        isActive: true,
      };
      db.merchantBankAccount.findFirst.mockResolvedValue(bankAcc);

      db.order.findMany.mockResolvedValue([{ merchantPayoutAmountToman: 500000n }]);
      db.merchantPayoutRequest.findMany.mockResolvedValue([]);
      db.merchantPayoutRequest.findFirst.mockResolvedValue(null); // No duplicate

      const now = new Date();
      db.merchantPayoutRequest.create.mockResolvedValue({
        id: 'payout-1',
        merchantId: mockMerchant.id,
        bankAccountId: bankAcc.id,
        bankAccount: bankAcc,
        amountToman: 100000n,
        status: PayoutRequestStatus.PENDING,
        trackingReference: null,
        rejectionReason: null,
        notesFa: 'تسویه نانوایی',
        requestedByUserId: 'user-owner-1',
        reviewedById: null,
        reviewedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const payout = await merchantBankService.requestPayout('user-owner-1', mockMerchant.id, {
        bankAccountId: bankAcc.id,
        amountToman: 100000,
        notesFa: 'تسویه نانوایی',
      });

      expect(payout.status).toBe(PayoutRequestStatus.PENDING);
      expect(payout.amountToman).toBe(100000);
      expect(payout.bankAccount.shabaNumber).toBe(sampleValidShaba);
      expect(db.merchantPayoutRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            merchantId: mockMerchant.id,
            bankAccountId: bankAcc.id,
            amountToman: 100000n,
            status: PayoutRequestStatus.PENDING,
          }),
        })
      );
    });
  });

  describe('AdminBankService: Bank Account Approvals & Payout Execution', () => {
    it('approves a bank account and sets as default if merchant has no other approved default', async () => {
      db.merchantBankAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        bankName: 'بانک ملت',
        accountHolder: 'علی احمدی',
        isActive: true,
        isDefault: false,
      });
      // No other approved default exists
      db.merchantBankAccount.findFirst.mockResolvedValue(null);

      db.merchantBankAccount.update.mockResolvedValue({
        id: 'acc-1',
        status: BankAccountStatus.APPROVED,
        isDefault: true,
      });

      await adminBankService.reviewBankAccount('admin-user-1', 'acc-1', {
        action: 'APPROVE',
      });

      expect(db.merchantBankAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc-1' },
          data: expect.objectContaining({
            status: BankAccountStatus.APPROVED,
            isDefault: true,
            reviewedById: 'admin-user-1',
          }),
        })
      );
      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'BANK_ACCOUNT_APPROVED',
            entityId: 'acc-1',
            actorId: 'admin-user-1',
          }),
        })
      );
    });

    it('rejects a bank account with provided rejection reason', async () => {
      db.merchantBankAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        merchantId: mockMerchant.id,
        shabaNumber: sampleValidShaba,
        isActive: true,
      });

      db.merchantBankAccount.update.mockResolvedValue({
        id: 'acc-1',
        status: BankAccountStatus.REJECTED,
        rejectionReason: 'مغایرت نام صاحب حساب با پروانه',
      });

      await adminBankService.reviewBankAccount('admin-user-1', 'acc-1', {
        action: 'REJECT',
        rejectionReason: 'مغایرت نام صاحب حساب با پروانه',
      });

      expect(db.merchantBankAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc-1' },
          data: expect.objectContaining({
            status: BankAccountStatus.REJECTED,
            rejectionReason: 'مغایرت نام صاحب حساب با پروانه',
            isDefault: false,
          }),
        })
      );
      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'BANK_ACCOUNT_REJECTED',
          }),
        })
      );
    });

    it('approves a pending payout request', async () => {
      db.merchantPayoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        merchantId: mockMerchant.id,
        status: PayoutRequestStatus.PENDING,
        amountToman: 150000n,
        bankAccount: { shabaNumber: sampleValidShaba },
      });

      db.merchantPayoutRequest.update.mockResolvedValue({
        id: 'payout-1',
        status: PayoutRequestStatus.APPROVED,
      });

      await adminBankService.reviewPayoutRequest('admin-user-1', 'payout-1', {
        action: 'APPROVE',
      });

      expect(db.merchantPayoutRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payout-1' },
          data: expect.objectContaining({
            status: PayoutRequestStatus.APPROVED,
            reviewedById: 'admin-user-1',
          }),
        })
      );
    });

    it('completes payout request, writes tracking reference and posts financial ledger transaction', async () => {
      db.merchantPayoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        merchantId: mockMerchant.id,
        status: PayoutRequestStatus.APPROVED,
        amountToman: 150000n,
        bankAccount: { shabaNumber: sampleValidShaba },
      });

      db.merchantPayoutRequest.update.mockResolvedValue({
        id: 'payout-1',
        status: PayoutRequestStatus.COMPLETED,
        trackingReference: 'PAYA-14030730-888',
      });

      await adminBankService.reviewPayoutRequest('admin-user-1', 'payout-1', {
        action: 'COMPLETE',
        trackingReference: 'PAYA-14030730-888',
      });

      expect(db.merchantPayoutRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payout-1' },
          data: expect.objectContaining({
            status: PayoutRequestStatus.COMPLETED,
            trackingReference: 'PAYA-14030730-888',
          }),
        })
      );

      // Financial ledger entry
      expect(db.financialTransaction.create).toHaveBeenCalledWith({
        data: {
          type: FinancialTransactionType.MERCHANT_PAYOUT,
          debitAccount: 'MERCHANT_PAYABLE',
          creditAccount: 'PLATFORM_BANK_ACCOUNT',
          amountToman: 150000n,
          referenceNumber: 'PAYA-14030730-888',
          postingKey: 'payout:payout-1',
        },
      });

      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PAYOUT_REQUEST_COMPLETED',
          }),
        })
      );
    });

    it('rejects payout request and requires reason', async () => {
      db.merchantPayoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        merchantId: mockMerchant.id,
        status: PayoutRequestStatus.PENDING,
        amountToman: 150000n,
        bankAccount: { shabaNumber: sampleValidShaba },
      });

      db.merchantPayoutRequest.update.mockResolvedValue({
        id: 'payout-1',
        status: PayoutRequestStatus.REJECTED,
      });

      await adminBankService.reviewPayoutRequest('admin-user-1', 'payout-1', {
        action: 'REJECT',
        rejectionReason: 'شماره شبا مسدود است',
      });

      expect(db.merchantPayoutRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payout-1' },
          data: expect.objectContaining({
            status: PayoutRequestStatus.REJECTED,
            rejectionReason: 'شماره شبا مسدود است',
          }),
        })
      );
    });

    it('prohibits reviewing an already completed payout', async () => {
      db.merchantPayoutRequest.findUnique.mockResolvedValue({
        id: 'payout-1',
        status: PayoutRequestStatus.COMPLETED,
      });

      await expect(
        adminBankService.reviewPayoutRequest('admin-user-1', 'payout-1', {
          action: 'REJECT',
          rejectionReason: 'تغییر نظر',
        })
      ).rejects.toThrow('این درخواست تسویه قبلاً با موفقیت پرداخت و نهایی شده است');
    });
  });
});
