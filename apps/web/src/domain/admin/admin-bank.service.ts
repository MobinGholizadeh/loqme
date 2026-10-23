import { prisma } from '@/lib/prisma';
import { assertActiveAdmin } from './merchant-account.service';
import {
  BankAccountStatus,
  PayoutRequestStatus,
  FinancialTransactionType,
} from '@prisma/client';
import {
  AdminReviewBankAccountSchema,
  AdminReviewPayoutRequestSchema,
  type AdminReviewBankAccountInput,
  type AdminReviewPayoutRequestInput,
} from '@loqme/validation';

export class AdminBankService {
  /**
   * List merchant bank accounts for administrative review.
   */
  async listBankAccountsForAdmin(
    adminUserId: string,
    statusFilter?: BankAccountStatus
  ) {
    await assertActiveAdmin(adminUserId);

    const where: any = { isActive: true };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const accounts = await prisma.merchantBankAccount.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            owner: { select: { id: true, mobile: true } },
          },
        },
        reviewer: {
          select: { id: true, mobile: true },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return accounts.map((acc) => ({
      id: acc.id,
      merchantId: acc.merchantId,
      merchantNameFa: acc.merchant.businessNameFa,
      merchantOwnerMobile: acc.merchant.owner.mobile,
      shabaNumber: acc.shabaNumber,
      bankName: acc.bankName,
      bankCode: acc.bankCode,
      accountHolder: acc.accountHolder,
      isDefault: acc.isDefault,
      status: acc.status as any,
      rejectionReason: acc.rejectionReason,
      reviewedById: acc.reviewedById,
      reviewedByMobile: acc.reviewer?.mobile || null,
      reviewedAt: acc.reviewedAt?.toISOString() || null,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    }));
  }

  /**
   * Review a merchant bank account: Approve or Reject.
   */
  async reviewBankAccount(
    adminUserId: string,
    accountId: string,
    rawInput: AdminReviewBankAccountInput
  ) {
    await assertActiveAdmin(adminUserId);
    const data = AdminReviewBankAccountSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      const account = await tx.merchantBankAccount.findUnique({
        where: { id: accountId },
        include: { merchant: true },
      });

      if (!account || !account.isActive) {
        throw new Error('حساب بانکی مورد نظر یافت نشد');
      }

      if (data.action === 'APPROVE') {
        // If this is the merchant's first or only approved account, set it as default
        const existingDefault = await tx.merchantBankAccount.findFirst({
          where: {
            merchantId: account.merchantId,
            isActive: true,
            isDefault: true,
            status: BankAccountStatus.APPROVED,
          },
        });

        const shouldBeDefault = !existingDefault;

        const updated = await tx.merchantBankAccount.update({
          where: { id: account.id },
          data: {
            status: BankAccountStatus.APPROVED,
            rejectionReason: null,
            reviewedById: adminUserId,
            reviewedAt: new Date(),
            isDefault: shouldBeDefault ? true : account.isDefault,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'BANK_ACCOUNT_APPROVED',
            entityType: 'MerchantBankAccount',
            entityId: account.id,
            actorId: adminUserId,
            actorRole: 'ADMIN',
            merchantId: account.merchantId,
            detailsJson: {
              shabaNumber: account.shabaNumber,
              bankName: account.bankName,
              accountHolder: account.accountHolder,
              isDefault: updated.isDefault,
            },
          },
        });

        return updated;
      } else {
        // Reject
        const updated = await tx.merchantBankAccount.update({
          where: { id: account.id },
          data: {
            status: BankAccountStatus.REJECTED,
            rejectionReason: data.rejectionReason?.trim() || 'اطلاعات حساب بانکی مورد تایید قرار نگرفت',
            reviewedById: adminUserId,
            reviewedAt: new Date(),
            isDefault: false,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'BANK_ACCOUNT_REJECTED',
            entityType: 'MerchantBankAccount',
            entityId: account.id,
            actorId: adminUserId,
            actorRole: 'ADMIN',
            merchantId: account.merchantId,
            detailsJson: {
              shabaNumber: account.shabaNumber,
              reason: updated.rejectionReason,
            },
          },
        });

        return updated;
      }
    });
  }

  /**
   * List withdrawal payout requests for administrative review.
   */
  async listPayoutRequestsForAdmin(
    adminUserId: string,
    statusFilter?: PayoutRequestStatus
  ) {
    await assertActiveAdmin(adminUserId);

    const where: any = {};
    if (statusFilter) {
      where.status = statusFilter;
    }

    const payouts = await prisma.merchantPayoutRequest.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            owner: { select: { id: true, mobile: true } },
          },
        },
        bankAccount: true,
        requestedBy: {
          select: { id: true, mobile: true },
        },
        reviewer: {
          select: { id: true, mobile: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return payouts.map((p) => ({
      id: p.id,
      merchantId: p.merchantId,
      merchantNameFa: p.merchant.businessNameFa,
      merchantOwnerMobile: p.merchant.owner.mobile,
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
      requestedByMobile: p.requestedBy.mobile,
      reviewedById: p.reviewedById,
      reviewedByMobile: p.reviewer?.mobile || null,
      reviewedAt: p.reviewedAt?.toISOString() || null,
      completedAt: p.completedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Review payout request: APPROVE, REJECT, or COMPLETE.
   */
  async reviewPayoutRequest(
    adminUserId: string,
    payoutId: string,
    rawInput: AdminReviewPayoutRequestInput
  ) {
    await assertActiveAdmin(adminUserId);
    const data = AdminReviewPayoutRequestSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      const payout = await tx.merchantPayoutRequest.findUnique({
        where: { id: payoutId },
        include: { merchant: true, bankAccount: true },
      });

      if (!payout) {
        throw new Error('درخواست تسویه مورد نظر یافت نشد');
      }

      if (payout.status === PayoutRequestStatus.COMPLETED) {
        throw new Error('این درخواست تسویه قبلاً با موفقیت پرداخت و نهایی شده است');
      }

      if (data.action === 'APPROVE') {
        if (payout.status !== PayoutRequestStatus.PENDING) {
          throw new Error('فقط درخواست‌های در انتظار بررسی امکان تایید برای پرداخت دارند');
        }

        const updated = await tx.merchantPayoutRequest.update({
          where: { id: payout.id },
          data: {
            status: PayoutRequestStatus.APPROVED,
            reviewedById: adminUserId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PAYOUT_REQUEST_APPROVED',
            entityType: 'MerchantPayoutRequest',
            entityId: payout.id,
            actorId: adminUserId,
            actorRole: 'ADMIN',
            merchantId: payout.merchantId,
            detailsJson: {
              amountToman: Number(payout.amountToman),
              shabaNumber: payout.bankAccount.shabaNumber,
            },
          },
        });

        return updated;
      } else if (data.action === 'REJECT') {
        const updated = await tx.merchantPayoutRequest.update({
          where: { id: payout.id },
          data: {
            status: PayoutRequestStatus.REJECTED,
            rejectionReason: data.rejectionReason?.trim() || 'درخواست تسویه رد شد',
            reviewedById: adminUserId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PAYOUT_REQUEST_REJECTED',
            entityType: 'MerchantPayoutRequest',
            entityId: payout.id,
            actorId: adminUserId,
            actorRole: 'ADMIN',
            merchantId: payout.merchantId,
            detailsJson: {
              amountToman: Number(payout.amountToman),
              rejectionReason: updated.rejectionReason,
            },
          },
        });

        return updated;
      } else if (data.action === 'COMPLETE') {
        if (!data.trackingReference) {
          throw new Error('ثبت شماره پیگیری واریز پایا/ساتنا برای تکمیل تسویه الزامی است');
        }

        const updated = await tx.merchantPayoutRequest.update({
          where: { id: payout.id },
          data: {
            status: PayoutRequestStatus.COMPLETED,
            trackingReference: data.trackingReference.trim(),
            reviewedById: adminUserId,
            reviewedAt: new Date(),
            completedAt: new Date(),
          },
        });

        // Record double-entry financial transaction
        await tx.financialTransaction.create({
          data: {
            type: FinancialTransactionType.MERCHANT_PAYOUT,
            debitAccount: 'MERCHANT_PAYABLE',
            creditAccount: 'PLATFORM_BANK_ACCOUNT',
            amountToman: payout.amountToman,
            referenceNumber: data.trackingReference.trim(),
            postingKey: `payout:${payout.id}`,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'PAYOUT_REQUEST_COMPLETED',
            entityType: 'MerchantPayoutRequest',
            entityId: payout.id,
            actorId: adminUserId,
            actorRole: 'ADMIN',
            merchantId: payout.merchantId,
            detailsJson: {
              amountToman: Number(payout.amountToman),
              trackingReference: data.trackingReference.trim(),
              shabaNumber: payout.bankAccount.shabaNumber,
            },
          },
        });

        return updated;
      }
    });
  }
}

export const adminBankService = new AdminBankService();
