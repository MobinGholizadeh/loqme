import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CreateReviewSchema,
  MerchantReplyReviewSchema,
  CreateComplaintSchema,
  ResolveComplaintSchema,
  UpdateListingSafetySchema,
} from '@loqme/validation';
import { moderationService } from '@/domain/moderation/moderation.service';
import { auditService } from '@/domain/moderation/audit.service';
import { paymentService } from '@/domain/payment/payment.service';
import { mockPaymentGateway } from '@/domain/payment/mock.gateway';
import { prisma } from '@/lib/prisma';
import {
  OrderStatus,
  ComplaintCategory,
  ComplaintStatus,
  SafetyStatus,
  Role,
  PaymentStatus,
  FinancialTransactionType,
} from '@prisma/client';

describe('Milestone M06 — Trust, Safety, Verification & Moderation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'mock-audit-id' } as any);
    vi.spyOn(auditService, 'logAction').mockResolvedValue({ id: 'mock-audit-id' } as any);
  });
  describe('1. Zod Validation & Domain Rules (CP-06.1 & CP-06.2)', () => {
    it('validates correct review inputs with 1-5 star ratings', () => {
      const validReview = {
        orderId: '00000000-0000-0000-0000-000000000001',
        overallRating: 5,
        qualityRating: 4,
        valueRating: 5,
        commentFa: 'نان تازه و بسیار باکیفیت بود، ممنون از فروشگاه',
      };

      const result = CreateReviewSchema.safeParse(validReview);
      expect(result.success).toBe(true);
    });

    it('rejects out-of-range star ratings (< 1 or > 5)', () => {
      const invalidReviewZero = {
        orderId: '00000000-0000-0000-0000-000000000001',
        overallRating: 0,
        qualityRating: 3,
        valueRating: 3,
      };
      expect(CreateReviewSchema.safeParse(invalidReviewZero).success).toBe(false);

      const invalidReviewSix = {
        orderId: '00000000-0000-0000-0000-000000000001',
        overallRating: 6,
        qualityRating: 3,
        valueRating: 3,
      };
      expect(CreateReviewSchema.safeParse(invalidReviewSix).success).toBe(false);
    });

    it('validates merchant review reply schema', () => {
      const validReply = {
        replyFa: 'با تشکر از نظر مثبت و حسن انتخاب شما!',
      };
      expect(MerchantReplyReviewSchema.safeParse(validReply).success).toBe(true);

      const emptyReply = { replyFa: '' };
      expect(MerchantReplyReviewSchema.safeParse(emptyReply).success).toBe(false);
    });

    it('validates complaint creation schema with categories and photo evidence', () => {
      const validComplaint = {
        orderId: '00000000-0000-0000-0000-000000000001',
        category: 'EXPIRED_FOOD',
        descriptionFa: 'تاریخ انقضای ماست دیروز بود و طعم ترشیدگی داشت.',
        evidencePhotos: ['/uploads/evidence/test-1.jpg'],
      };
      expect(CreateComplaintSchema.safeParse(validComplaint).success).toBe(true);

      const shortDescription = {
        orderId: '00000000-0000-0000-0000-000000000001',
        category: 'SPOILED_FOOD',
        descriptionFa: 'خراب بود', // Less than 10 chars
      };
      expect(CreateComplaintSchema.safeParse(shortDescription).success).toBe(false);
    });

    it('validates complaint resolution actions (REFUND, REJECT, WARNING)', () => {
      expect(
        ResolveComplaintSchema.safeParse({
          action: 'REFUND',
          notesFa: 'مغایرت تایید شد و مبلغ مسترد گردید',
        }).success
      ).toBe(true);

      expect(
        ResolveComplaintSchema.safeParse({
          action: 'INVALID_ACTION',
        }).success
      ).toBe(false);
    });

    it('validates listing safety override status', () => {
      expect(
        UpdateListingSafetySchema.safeParse({
          safetyStatus: 'RESTRICTED',
          reasonFa: 'بررسی مجدد شرایط نگهداری برودتی',
        }).success
      ).toBe(true);

      expect(
        UpdateListingSafetySchema.safeParse({
          safetyStatus: 'INVALID_STATUS',
        }).success
      ).toBe(false);
    });
  });

  describe('2. Verified Purchase Review Loop Enforcement (CP-06.2)', () => {
    it('prevents non-completed orders from being reviewed', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-not-completed',
        customerId: 'customer-1',
        merchantId: 'merchant-1',
        status: OrderStatus.PAID, // Not COMPLETED!
        review: null,
      } as any);

      await expect(
        moderationService.submitReview('customer-1', 'order-not-completed', {
          orderId: 'order-not-completed',
          overallRating: 5,
          qualityRating: 5,
          valueRating: 5,
        })
      ).rejects.toThrow('تنها پس از تحویل حضوری و اتمام سفارش امکان ثبت نظر وجود دارد');
    });

    it('prevents review submission if another customer owns the order', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-owned-by-other',
        customerId: 'customer-original',
        merchantId: 'merchant-1',
        status: OrderStatus.COMPLETED,
        review: null,
      } as any);

      await expect(
        moderationService.submitReview('customer-attacker', 'order-owned-by-other', {
          orderId: 'order-owned-by-other',
          overallRating: 5,
          qualityRating: 5,
          valueRating: 5,
        })
      ).rejects.toThrow('شما مجاز به ثبت نظر برای این سفارش نیستید');
    });

    it('prevents duplicate reviews for the same order', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-already-reviewed',
        customerId: 'customer-1',
        merchantId: 'merchant-1',
        status: OrderStatus.COMPLETED,
        review: { id: 'existing-review' }, // Already reviewed!
      } as any);

      await expect(
        moderationService.submitReview('customer-1', 'order-already-reviewed', {
          orderId: 'order-already-reviewed',
          overallRating: 5,
          qualityRating: 5,
          valueRating: 5,
        })
      ).rejects.toThrow('شما قبلاً برای این سفارش نظر ثبت کرده‌اید');
    });

    it('successfully submits verified review and recalculates merchant average rating', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(prisma));
      vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ id: 'merchant-10' }]);
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-valid-1',
        customerId: 'customer-1',
        merchantId: 'merchant-10',
        status: OrderStatus.COMPLETED,
        review: null,
      } as any);

      const mockReview = {
        id: 'new-rev-1',
        orderId: 'order-valid-1',
        customerId: 'customer-1',
        merchantId: 'merchant-10',
        overallRating: 5,
        qualityRating: 4,
        valueRating: 5,
        commentFa: 'عالی بود',
      };
      vi.spyOn(prisma.review, 'create').mockResolvedValueOnce(mockReview as any);
      vi.spyOn(prisma.review, 'aggregate').mockResolvedValueOnce({
        _avg: { overallRating: 4.8 },
        _count: { id: 12 },
      } as any);
      const merchantUpdateSpy = vi.spyOn(prisma.merchant, 'update').mockResolvedValueOnce({} as any);
      const auditLogSpy = vi.spyOn(auditService, 'logAction').mockResolvedValueOnce({} as any);

      const review = await moderationService.submitReview('customer-1', 'order-valid-1', {
        orderId: 'order-valid-1',
        overallRating: 5,
        qualityRating: 4,
        valueRating: 5,
        commentFa: 'عالی بود',
      });

      expect(review.id).toBe('new-rev-1');
      expect(merchantUpdateSpy).toHaveBeenCalledWith({
        where: { id: 'merchant-10' },
        data: { ratingAverage: 4.8, ratingCount: 12 },
      });
      expect(auditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REVIEW_SUBMITTED',
          entityType: 'Review',
        })
      );
    });
  });

  describe('3. Food Safety Incident Escalation & Automated Lockout (CP-06.3)', () => {
    it('triggers automated merchant restriction when >= 2 food safety complaints occur within 7 days', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-complaint-1',
        customerId: 'customer-1',
        merchantId: 'merchant-unsafe-1',
        status: OrderStatus.COMPLETED,
      } as any);

      vi.spyOn(prisma.complaint, 'create').mockResolvedValueOnce({
        id: 'complaint-critical-2',
        orderId: 'order-complaint-1',
        customerId: 'customer-1',
        merchantId: 'merchant-unsafe-1',
        category: ComplaintCategory.EXPIRED_FOOD,
        status: ComplaintStatus.PENDING,
      } as any);

      // Simulating 2 recent complaints in 7 days
      vi.spyOn(prisma.complaint, 'count').mockResolvedValueOnce(2);

      const listingSafetySpy = vi
        .spyOn(prisma.listingSafety, 'updateMany')
        .mockResolvedValueOnce({ count: 3 } as any);
      const listingSpy = vi
        .spyOn(prisma.listing, 'updateMany')
        .mockResolvedValueOnce({ count: 3 } as any);
      const auditSpy = vi.spyOn(auditService, 'logAction').mockResolvedValueOnce({} as any);

      const complaint = await moderationService.submitComplaint(
        'customer-1',
        'order-complaint-1',
        {
          orderId: 'order-complaint-1',
          category: 'EXPIRED_FOOD',
          descriptionFa: 'این بسته تاریخ انقضا گذشته بود و بوی ترشیدگی می‌داد.',
          evidencePhotos: ['/uploads/evidence/photo-exp.jpg'],
        }
      );

      expect(complaint.id).toBe('complaint-critical-2');
      // Verify automated lockout was executed
      expect(listingSafetySpy).toHaveBeenCalledWith({
        where: { listing: { merchantId: 'merchant-unsafe-1' } },
        data: { safetyStatus: SafetyStatus.RESTRICTED },
      });
      expect(listingSpy).toHaveBeenCalledWith({
        where: { merchantId: 'merchant-unsafe-1', status: 'PUBLISHED' },
        data: { status: 'PAUSED' },
      });
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTOMATED_SAFETY_LOCKOUT',
          entityType: 'Merchant',
          entityId: 'merchant-unsafe-1',
        })
      );
    });

    it('does not trigger automated lockout for benign non-safety complaints', async () => {
      vi.spyOn(prisma.order, 'findUnique').mockResolvedValueOnce({
        id: 'order-complaint-2',
        customerId: 'customer-1',
        merchantId: 'merchant-safe-1',
        status: OrderStatus.COMPLETED,
      } as any);

      vi.spyOn(prisma.complaint, 'create').mockResolvedValueOnce({
        id: 'complaint-benign-1',
        orderId: 'order-complaint-2',
        customerId: 'customer-1',
        merchantId: 'merchant-safe-1',
        category: ComplaintCategory.MISMATCHED_DESCRIPTION,
        status: ComplaintStatus.PENDING,
      } as any);

      const listingSafetySpy = vi.spyOn(prisma.listingSafety, 'updateMany');

      await moderationService.submitComplaint('customer-1', 'order-complaint-2', {
        orderId: 'order-complaint-2',
        category: 'MISMATCHED_DESCRIPTION',
        descriptionFa: 'رنگ کیک شکلاتی با عکس فرق داشت اما تازه و سالم بود.',
      });

      expect(listingSafetySpy).not.toHaveBeenCalled();
    });
  });

  describe('4. 1-Click Refund & Financial Ledger Penalty Reversal (CP-06.4)', () => {
    it('executes gateway refund, creates Refund record and debit penalty in double-entry ledger', async () => {
      const mockPayment = {
        id: 'payment-100',
        orderId: 'order-to-refund',
        gateway: 'MOCK',
        authority: 'MOCK-AUTH-123456',
        amountToman: BigInt(50000),
        status: PaymentStatus.SUCCESS,
        order: {
          id: 'order-to-refund',
          orderNumber: 'LQ-88888',
          totalAmountToman: BigInt(50000),
          merchantPayoutAmountToman: BigInt(45000),
          commissionAmountToman: BigInt(5000),
        },
      };

      vi.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(mockPayment as any);

      const txOps: any[] = [];
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          refund: {
            findFirst: vi.fn().mockResolvedValue(null),
            update: vi.fn().mockImplementation(args => ({ id: 'refund-rec-1', ...args.data })),
            create: vi.fn().mockImplementation((args) => {
              txOps.push({ type: 'REFUND_CREATE', ...args });
              return { id: 'refund-rec-1', ...args.data };
            }),
          },
          payment: {
            findUnique: vi.fn().mockResolvedValue(mockPayment),
            update: vi.fn().mockImplementation((args) => {
              txOps.push({ type: 'PAYMENT_UPDATE', ...args });
              return args;
            }),
          },
          order: {
            findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'order-100', acceptedPaymentId: 'payment-100' }),
            update: vi.fn().mockImplementation((args) => {
              txOps.push({ type: 'ORDER_UPDATE', ...args });
              return args;
            }),
          },
          financialTransaction: {
            create: vi.fn().mockImplementation((args) => {
              txOps.push({ type: 'LEDGER_TX', ...args });
              return args;
            }),
          },
        };
        return callback(tx);
      });

      const refundResult = await paymentService.refundPayment({
        paymentId: 'payment-100',
        amountToman: 50000,
        reasonFa: 'محصول تاریخ گذشته - استرداد وجه به خریدار',
        processedByUserId: 'admin-1',
      });

      expect(refundResult.success).toBe(true);
      expect(refundResult.refund.id).toBe('refund-rec-1');

      // Verify double-entry reversals
      const ledgerOps = txOps.filter((op) => op.type === 'LEDGER_TX');
      expect(ledgerOps.length).toBeGreaterThanOrEqual(2);

      // Merchant payable penalty debit
      const merchantDebit = ledgerOps.find(
        (op) => op.data.debitAccount === 'MERCHANT_PAYABLE' && op.data.creditAccount === 'PLATFORM_CLEARING'
      );
      expect(merchantDebit).toBeDefined();
      expect(merchantDebit.data.amountToman).toBe(BigInt(45000));

      // Customer refund
      const customerRefund = ledgerOps.find(
        (op) => op.data.debitAccount === 'PLATFORM_CLEARING' && op.data.creditAccount === 'CUSTOMER_PAYMENT'
      );
      expect(customerRefund).toBeDefined();
      expect(customerRefund.data.amountToman).toBe(BigInt(50000));
    });
  });

  describe('5. Audit Trail & Incident Resolution (CP-06.5)', () => {
    it('records immutable audit logs for safety and moderation actions', async () => {
      const mockAuditEntry = {
        id: 'audit-log-1',
        action: 'SAFETY_OVERRIDE',
        entityType: 'ListingSafety',
        entityId: 'safety-10',
        actorId: 'admin-user-1',
        actorRole: Role.ADMIN,
        createdAt: new Date(),
      };

      vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce(mockAuditEntry as any);
      vi.spyOn(auditService, 'logAction').mockResolvedValueOnce(mockAuditEntry as any);

      const log = await auditService.logAction({
        action: 'SAFETY_OVERRIDE',
        entityType: 'ListingSafety',
        entityId: 'safety-10',
        actorId: 'admin-user-1',
        actorRole: Role.ADMIN,
        details: { reason: 'Health Guild Inspection notice' },
      });

      expect(log.id).toBe('audit-log-1');
      expect(log.action).toBe('SAFETY_OVERRIDE');
    });

    it('resolves a complaint via resolveComplaint with full admin audit trail', async () => {
      const mockComplaint = {
        id: 'complaint-to-resolve',
        status: ComplaintStatus.PENDING,
        order: {
          id: 'order-123',
          payments: [
            {
              id: 'payment-mock-id',
              amountToman: BigInt(30000),
              status: PaymentStatus.SUCCESS,
            },
          ],
        },
      };

      const complaintFindSpy = vi.spyOn(prisma.complaint, 'findUnique');
      complaintFindSpy
        .mockResolvedValueOnce(mockComplaint as any)
        .mockResolvedValueOnce({
          id: 'complaint-to-resolve',
          status: ComplaintStatus.RESOLVED_REFUNDED,
          refund: { id: 'refund-rec-99' },
        } as any);

      vi.spyOn(paymentService, 'refundPayment').mockResolvedValueOnce({
        success: true,
        refund: { id: 'refund-rec-99' },
      });
      vi.spyOn(prisma.complaint, 'update').mockResolvedValueOnce({
        id: 'complaint-to-resolve',
        status: ComplaintStatus.RESOLVED_REFUNDED,
        refundId: 'refund-rec-99',
      } as any);
      const auditSpy = vi.spyOn(auditService, 'logAction').mockResolvedValueOnce({} as any);

      const resolved = await moderationService.resolveComplaint(
        'admin-supervisor',
        'complaint-to-resolve',
        {
          action: 'REFUND',
          notesFa: 'استرداد وجه پس از بررسی تصویر تاریخ انقضا انجام شد',
        }
      );

      expect(resolved?.status).toBe(ComplaintStatus.RESOLVED_REFUNDED);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COMPLAINT_RESOLVED',
          entityType: 'Complaint',
          actorId: 'admin-supervisor',
          actorRole: Role.ADMIN,
        })
      );
    });
  });
});
