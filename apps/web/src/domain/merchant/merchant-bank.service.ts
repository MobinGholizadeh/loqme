import { prisma } from '@/lib/prisma';
import { StaffRole, BankAccountStatus, PayoutRequestStatus, FinancialTransactionType } from '@prisma/client';
import {
  CreateBankAccountSchema,
  UpdateBankAccountSchema,
  CreatePayoutRequestSchema,
  getBankFromShaba,
  normalizeShaba,
  formatToman,
  type CreateBankAccountInput,
  type UpdateBankAccountInput,
  type CreatePayoutRequestInput,
} from '@loqme/validation';
import type {
  MerchantBankAccountDto,
  MerchantPayoutRequestDto,
  MerchantWalletSummaryDto,
} from '@loqme/types';
import { merchantService } from './merchant.service';

export class MerchantBankService {
  /**
   * Helper to verify merchant and authorize owner-level access
   */
  private async authorizeOwner(merchantUserId: string, merchantId?: string) {
    const { merchant } = await merchantService.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.OWNER
    );
    return merchant;
  }

  /**
   * List all active bank accounts for a merchant
   */
  async listBankAccounts(
    merchantUserId: string,
    merchantId?: string
  ): Promise<MerchantBankAccountDto[]> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);

    const accounts = await prisma.merchantBankAccount.findMany({
      where: {
        merchantId: merchant.id,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return accounts.map((acc) => ({
      id: acc.id,
      merchantId: acc.merchantId,
      shabaNumber: acc.shabaNumber,
      bankName: acc.bankName,
      bankCode: acc.bankCode,
      accountHolder: acc.accountHolder,
      isDefault: acc.isDefault,
      status: acc.status as any,
      rejectionReason: acc.rejectionReason,
      reviewedAt: acc.reviewedAt?.toISOString() || null,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    }));
  }

  /**
   * Add a new bank account for a merchant (initial status is always PENDING)
   */
  async addBankAccount(
    merchantUserId: string,
    merchantId: string | undefined,
    rawInput: CreateBankAccountInput
  ): Promise<MerchantBankAccountDto> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);
    const data = CreateBankAccountSchema.parse(rawInput);

    const normalized = normalizeShaba(data.shabaNumber);
    const bankInfo = getBankFromShaba(normalized);
    const bankName = data.bankName || bankInfo?.nameFa || 'بانک نامشخص';
    const bankCode = bankInfo?.code || normalized.substring(4, 7);

    // Check if an active account with this Shaba already exists for this merchant
    const existing = await prisma.merchantBankAccount.findFirst({
      where: {
        merchantId: merchant.id,
        shabaNumber: normalized,
        isActive: true,
      },
    });

    if (existing) {
      throw new Error('این شماره شبا قبلاً برای فروشگاه شما ثبت شده است');
    }

    const created = await prisma.merchantBankAccount.create({
      data: {
        merchantId: merchant.id,
        shabaNumber: normalized,
        bankName,
        bankCode,
        accountHolder: data.accountHolder.trim(),
        isDefault: false, // Must be approved before becoming default
        status: BankAccountStatus.PENDING,
        isActive: true,
      },
    });

    return {
      id: created.id,
      merchantId: created.merchantId,
      shabaNumber: created.shabaNumber,
      bankName: created.bankName,
      bankCode: created.bankCode,
      accountHolder: created.accountHolder,
      isDefault: created.isDefault,
      status: created.status as any,
      rejectionReason: created.rejectionReason,
      reviewedAt: created.reviewedAt?.toISOString() || null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update an existing bank account.
   * If Shaba or Account Holder changes, status resets to PENDING for re-verification.
   */
  async updateBankAccount(
    merchantUserId: string,
    merchantId: string | undefined,
    accountId: string,
    rawInput: UpdateBankAccountInput
  ): Promise<MerchantBankAccountDto> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);
    const data = UpdateBankAccountSchema.parse(rawInput);

    const account = await prisma.merchantBankAccount.findFirst({
      where: {
        id: accountId,
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!account) {
      throw new Error('حساب بانکی مورد نظر یافت نشد');
    }

    const updates: Record<string, any> = {};
    let requiresReapproval = false;

    if (data.shabaNumber) {
      const normalized = normalizeShaba(data.shabaNumber);
      if (normalized !== account.shabaNumber) {
        updates.shabaNumber = normalized;
        const bankInfo = getBankFromShaba(normalized);
        if (bankInfo) {
          updates.bankName = bankInfo.nameFa;
          updates.bankCode = bankInfo.code;
        }
        requiresReapproval = true;
      }
    }

    if (data.bankName && data.bankName !== account.bankName) {
      updates.bankName = data.bankName.trim();
    }

    if (data.accountHolder && data.accountHolder !== account.accountHolder) {
      updates.accountHolder = data.accountHolder.trim();
      requiresReapproval = true;
    }

    if (requiresReapproval) {
      updates.status = BankAccountStatus.PENDING;
      updates.isDefault = false; // Reset default until approved
      updates.rejectionReason = null;
      updates.reviewedById = null;
      updates.reviewedAt = null;
    }

    const updated = await prisma.merchantBankAccount.update({
      where: { id: account.id },
      data: updates,
    });

    return {
      id: updated.id,
      merchantId: updated.merchantId,
      shabaNumber: updated.shabaNumber,
      bankName: updated.bankName,
      bankCode: updated.bankCode,
      accountHolder: updated.accountHolder,
      isDefault: updated.isDefault,
      status: updated.status as any,
      rejectionReason: updated.rejectionReason,
      reviewedAt: updated.reviewedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete (soft-delete) a bank account.
   * Prohibited if active withdrawal requests are associated with this account.
   */
  async deleteBankAccount(
    merchantUserId: string,
    merchantId: string | undefined,
    accountId: string
  ): Promise<{ success: boolean; message: string }> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);

    const account = await prisma.merchantBankAccount.findFirst({
      where: {
        id: accountId,
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!account) {
      throw new Error('حساب بانکی مورد نظر یافت نشد');
    }

    // Check if there are active payouts in PENDING or APPROVED status
    const activePayouts = await prisma.merchantPayoutRequest.count({
      where: {
        bankAccountId: account.id,
        status: { in: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED] },
      },
    });

    if (activePayouts > 0) {
      throw new Error('این حساب بانکی دارای درخواست تسویه در حال پردازش است و امکان حذف آن وجود ندارد');
    }

    await prisma.merchantBankAccount.update({
      where: { id: account.id },
      data: {
        isActive: false,
        isDefault: false,
      },
    });

    return { success: true, message: 'حساب بانکی با موفقیت حذف شد' };
  }

  /**
   * Set an approved bank account as the default account for payouts.
   */
  async setDefaultBankAccount(
    merchantUserId: string,
    merchantId: string | undefined,
    accountId: string
  ): Promise<MerchantBankAccountDto> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);

    const account = await prisma.merchantBankAccount.findFirst({
      where: {
        id: accountId,
        merchantId: merchant.id,
        isActive: true,
      },
    });

    if (!account) {
      throw new Error('حساب بانکی مورد نظر یافت نشد');
    }

    if (account.status !== BankAccountStatus.APPROVED) {
      throw new Error('فقط حساب‌های بانکی تایید شده توسط مدیریت می‌توانند به عنوان حساب پیش‌فرض انتخاب شوند');
    }

    await prisma.$transaction(async (tx) => {
      // Unset previous defaults
      await tx.merchantBankAccount.updateMany({
        where: { merchantId: merchant.id, isDefault: true },
        data: { isDefault: false },
      });

      // Set this account as default
      await tx.merchantBankAccount.update({
        where: { id: account.id },
        data: { isDefault: true },
      });
    });

    const updated = await prisma.merchantBankAccount.findUniqueOrThrow({
      where: { id: account.id },
    });

    return {
      id: updated.id,
      merchantId: updated.merchantId,
      shabaNumber: updated.shabaNumber,
      bankName: updated.bankName,
      bankCode: updated.bankCode,
      accountHolder: updated.accountHolder,
      isDefault: updated.isDefault,
      status: updated.status as any,
      rejectionReason: updated.rejectionReason,
      reviewedAt: updated.reviewedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Calculate merchant wallet balances and summary.
   */
  async getWalletSummary(
    merchantUserId: string,
    merchantId?: string
  ): Promise<MerchantWalletSummaryDto> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);

    // 1. Calculate net earnings from completed / eligible orders
    const orders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
        status: { in: ['COMPLETED', 'PAID', 'READY_FOR_PICKUP', 'NO_SHOW'] },
      },
      select: {
        totalAmountToman: true,
        commissionAmountToman: true,
        merchantPayoutAmountToman: true,
      },
    });

    const grossSalesToman = orders.reduce((sum, o) => sum + Number(o.totalAmountToman), 0);
    const platformCommissionToman = orders.reduce((sum, o) => sum + Number(o.commissionAmountToman), 0);
    const netEarningsToman = orders.reduce((sum, o) => sum + Number(o.merchantPayoutAmountToman), 0);

    // 2. Calculate payouts
    const payouts = await prisma.merchantPayoutRequest.findMany({
      where: { merchantId: merchant.id },
      select: {
        amountToman: true,
        status: true,
      },
    });

    const completedPayoutsToman = payouts
      .filter((p) => p.status === PayoutRequestStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amountToman), 0);

    const pendingPayoutsToman = payouts
      .filter((p) => p.status === PayoutRequestStatus.PENDING || p.status === PayoutRequestStatus.APPROVED)
      .reduce((sum, p) => sum + Number(p.amountToman), 0);

    const availableBalanceToman = Math.max(
      0,
      netEarningsToman - completedPayoutsToman - pendingPayoutsToman
    );

    // 3. Find default approved bank account
    const defaultAcc = await prisma.merchantBankAccount.findFirst({
      where: {
        merchantId: merchant.id,
        isActive: true,
        isDefault: true,
        status: BankAccountStatus.APPROVED,
      },
    });

    const approvedAccountsCount = await prisma.merchantBankAccount.count({
      where: {
        merchantId: merchant.id,
        isActive: true,
        status: BankAccountStatus.APPROVED,
      },
    });

    const defaultDto: MerchantBankAccountDto | null = defaultAcc
      ? {
          id: defaultAcc.id,
          merchantId: defaultAcc.merchantId,
          shabaNumber: defaultAcc.shabaNumber,
          bankName: defaultAcc.bankName,
          bankCode: defaultAcc.bankCode,
          accountHolder: defaultAcc.accountHolder,
          isDefault: defaultAcc.isDefault,
          status: defaultAcc.status as any,
          rejectionReason: defaultAcc.rejectionReason,
          reviewedAt: defaultAcc.reviewedAt?.toISOString() || null,
          createdAt: defaultAcc.createdAt.toISOString(),
          updatedAt: defaultAcc.updatedAt.toISOString(),
        }
      : null;

    return {
      merchantId: merchant.id,
      businessNameFa: merchant.businessNameFa,
      grossSalesToman,
      platformCommissionToman,
      netEarningsToman,
      completedPayoutsToman,
      pendingPayoutsToman,
      availableBalanceToman,
      defaultBankAccount: defaultDto,
      approvedAccountsCount,
    };
  }

  /**
   * Request a payout / withdrawal from wallet to an approved bank account.
   */
  async requestPayout(
    merchantUserId: string,
    merchantId: string | undefined,
    rawInput: CreatePayoutRequestInput
  ): Promise<MerchantPayoutRequestDto> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);
    const data = CreatePayoutRequestSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      // 1. Verify target bank account
      const bankAccount = await tx.merchantBankAccount.findFirst({
        where: {
          id: data.bankAccountId,
          merchantId: merchant.id,
          isActive: true,
        },
      });

      if (!bankAccount) {
        throw new Error('حساب بانکی مقصد یافت نشد');
      }

      if (bankAccount.status !== BankAccountStatus.APPROVED) {
        throw new Error('تسویه وجه فقط به حساب‌های بانکی تایید شده امکان‌پذیر است');
      }

      // 2. Calculate live available balance inside the transaction
      const orders = await tx.order.findMany({
        where: {
          merchantId: merchant.id,
          status: { in: ['COMPLETED', 'PAID', 'READY_FOR_PICKUP', 'NO_SHOW'] },
        },
        select: { merchantPayoutAmountToman: true },
      });

      const netEarnings = orders.reduce((sum, o) => sum + Number(o.merchantPayoutAmountToman), 0);

      const existingPayouts = await tx.merchantPayoutRequest.findMany({
        where: { merchantId: merchant.id },
        select: { amountToman: true, status: true },
      });

      const completed = existingPayouts
        .filter((p) => p.status === PayoutRequestStatus.COMPLETED)
        .reduce((sum, p) => sum + Number(p.amountToman), 0);

      const pending = existingPayouts
        .filter((p) => p.status === PayoutRequestStatus.PENDING || p.status === PayoutRequestStatus.APPROVED)
        .reduce((sum, p) => sum + Number(p.amountToman), 0);

      const liveAvailable = netEarnings - completed - pending;

      if (data.amountToman > liveAvailable) {
        throw new Error(
          `موجودی قابل تسویه شما کافی نمی‌باشد (موجود در کیف پول: ${formatToman(Math.max(0, liveAvailable))})`
        );
      }

      // 3. Prevent duplicate rapid submissions (within 30 seconds for same amount and account)
      const recentDuplicate = await tx.merchantPayoutRequest.findFirst({
        where: {
          merchantId: merchant.id,
          bankAccountId: bankAccount.id,
          amountToman: BigInt(data.amountToman),
          status: PayoutRequestStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 30000) },
        },
      });

      if (recentDuplicate) {
        throw new Error('یک درخواست تسویه مشابه در حال بررسی است؛ لطفاً چند لحظه شکیبا باشید');
      }

      // 4. Create payout request
      const payout = await tx.merchantPayoutRequest.create({
        data: {
          merchantId: merchant.id,
          bankAccountId: bankAccount.id,
          amountToman: BigInt(data.amountToman),
          status: PayoutRequestStatus.PENDING,
          notesFa: data.notesFa?.trim() || null,
          requestedByUserId: merchantUserId,
        },
        include: {
          bankAccount: true,
        },
      });

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          action: 'MERCHANT_PAYOUT_REQUESTED',
          entityType: 'MerchantPayoutRequest',
          entityId: payout.id,
          actorId: merchantUserId,
          actorRole: 'MERCHANT_OWNER',
          merchantId: merchant.id,
          detailsJson: {
            amountToman: data.amountToman,
            bankAccountId: bankAccount.id,
            shabaNumber: bankAccount.shabaNumber,
          },
        },
      });

      return {
        id: payout.id,
        merchantId: payout.merchantId,
        bankAccountId: payout.bankAccountId,
        bankAccount: {
          id: payout.bankAccount.id,
          shabaNumber: payout.bankAccount.shabaNumber,
          bankName: payout.bankAccount.bankName,
          accountHolder: payout.bankAccount.accountHolder,
        },
        amountToman: Number(payout.amountToman),
        status: payout.status as any,
        trackingReference: payout.trackingReference,
        rejectionReason: payout.rejectionReason,
        notesFa: payout.notesFa,
        requestedByUserId: payout.requestedByUserId,
        reviewedAt: payout.reviewedAt?.toISOString() || null,
        completedAt: payout.completedAt?.toISOString() || null,
        createdAt: payout.createdAt.toISOString(),
        updatedAt: payout.updatedAt.toISOString(),
      };
    });
  }

  /**
   * List payout requests for the merchant.
   */
  async listPayoutRequests(
    merchantUserId: string,
    merchantId?: string
  ): Promise<MerchantPayoutRequestDto[]> {
    const merchant = await this.authorizeOwner(merchantUserId, merchantId);

    const payouts = await prisma.merchantPayoutRequest.findMany({
      where: { merchantId: merchant.id },
      include: { bankAccount: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return payouts.map((p) => ({
      id: p.id,
      merchantId: p.merchantId,
      bankAccountId: p.bankAccountId,
      bankAccount: {
        id: p.bankAccount.id,
        shabaNumber: p.bankAccount.shabaNumber,
        bankName: p.bankAccount.bankName,
        accountHolder: p.bankAccount.accountHolder,
      },
      amountToman: Number(p.amountToman),
      status: p.status as any,
      trackingReference: p.trackingReference,
      rejectionReason: p.rejectionReason,
      notesFa: p.notesFa,
      requestedByUserId: p.requestedByUserId,
      reviewedAt: p.reviewedAt?.toISOString() || null,
      completedAt: p.completedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }
}

export const merchantBankService = new MerchantBankService();
