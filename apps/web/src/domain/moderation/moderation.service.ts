import { withDatabaseService } from '@/lib/db/context';
import { notificationService } from '@/domain/notification/notification.service';
import { CreateReviewSchema } from '@loqme/validation';
import { MerchantRatingSummaryDto } from '@loqme/types';
import { prisma } from '@/lib/prisma';
import { auditService } from './audit.service';
import { paymentService } from '@/domain/payment/payment.service';
import {
  OrderStatus,
  ComplaintCategory,
  ComplaintStatus,
  SafetyStatus,
  ListingStatus,
  Role,
} from '@prisma/client';
import {
  CreateReviewInputDto,
  CreateComplaintInputDto,
  ResolveComplaintInputDto,
} from '@loqme/types';

export class ModerationService {
  /**
   * Submits a verified post-pickup review by the customer who completed the order.
   * Enforces verified purchase loop and recalculates merchant ratings atomically.
   */
  async submitReview(customerId: string, orderId: string, input: CreateReviewInputDto) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        review: true,
        merchant: true,
        customer: { select: { fullName: true } },
      },
    });

    if (!order) {
      throw new Error('سفارش مورد نظر یافت نشد');
    }

    if (order.customerId !== customerId) {
      throw new Error('شما مجاز به ثبت نظر برای این سفارش نیستید');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new Error('تنها پس از تحویل حضوری و اتمام سفارش امکان ثبت نظر وجود دارد');
    }

    if (order.review) {
      throw new Error('شما قبلاً برای این سفارش نظر ثبت کرده‌اید');
    }

    const validated = CreateReviewSchema.parse({ ...input, orderId });
    const review = await withDatabaseService('review', order.merchantId, () => prisma.$transaction(async (tx) => {
      // Serialize review writers per merchant before inserting or aggregating.
      await tx.$queryRaw`SELECT id FROM "Merchant" WHERE id = ${order.merchantId} FOR UPDATE`;
      const created = await tx.review.create({
        data: {
          orderId, customerId, merchantId: order.merchantId,
          overallRating: validated.overallRating,
          qualityRating: validated.qualityRating ?? null,
          valueRating: validated.valueRating ?? null,
          collectionRating: validated.collectionRating ?? null,
          varietyRating: validated.varietyRating ?? null,
          quantityRating: validated.quantityRating ?? null,
          commentFa: validated.commentFa?.trim() || null,
        },
      });
      const stats = await tx.review.aggregate({
        where: { merchantId: order.merchantId },
        _avg: { overallRating: true }, _count: { id: true },
      });
      await tx.merchant.update({
        where: { id: order.merchantId },
        data: {
          ratingAverage: Number((stats._avg.overallRating ?? 0).toFixed(1)),
          ratingCount: stats._count.id,
        },
      });
      return created;
    }));

    await auditService.logAction({
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: review.id,
      actorRole: Role.CUSTOMER,
      details: {
        orderId,
        merchantId: order.merchantId,
        overallRating: input.overallRating,
      },
    });

    try {
      const orderNumber = order.orderNumber || order.id;
      notificationService.notifyMerchant(order.merchantId, {
        type: 'NEW_REVIEW',
        category: 'order',
        title: 'دیدگاه و امتیاز جدید',
        body: 'دیدگاه جدیدی با امتیاز ' + input.overallRating + ' از ۵ برای سفارش #' + orderNumber + ' ثبت شد.',
        link: '/merchant/reviews',
      }).catch(() => {});
    } catch {
      // Non-blocking
    }

    return review;
  }

  async getMerchantRatings(merchantId: string): Promise<MerchantRatingSummaryDto> {
    const fields = {
      overallRating: true, collectionRating: true, qualityRating: true,
      varietyRating: true, quantityRating: true,
    } as const;
    const stats = await prisma.review.aggregate({
      where: { merchantId }, _avg: fields, _count: fields,
    });
    const score = (key: keyof typeof fields) => ({
      average: stats._avg[key] == null ? null : Number(stats._avg[key]!.toFixed(1)),
      count: stats._count[key],
    });
    return {
      overallRating: score('overallRating'), collectionRating: score('collectionRating'),
      qualityRating: score('qualityRating'), varietyRating: score('varietyRating'),
      quantityRating: score('quantityRating'),
    };
  }

  /**
   * Allows merchant owner or staff to post an official public reply to a customer review.
   */
  async replyToReview(merchantUserId: string, reviewId: string, replyFa: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { merchant: true },
    });

    if (!review) {
      throw new Error('نظر مورد نظر یافت نشد');
    }

    // Verify merchant authority
    const isOwner = review.merchant.ownerUserId === merchantUserId;
    const staffRecord = await prisma.merchantStaff.findUnique({
      where: {
        merchantId_userId: {
          merchantId: review.merchantId,
          userId: merchantUserId,
        },
      },
    });

    if (!isOwner && !staffRecord) {
      throw new Error('تنها صاحب فروشگاه یا پرسنل مجاز به پاسخگویی به این نظر هستند');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        merchantReplyFa: replyFa.trim(),
        merchantReplyAt: new Date(),
      },
    });

    await auditService.logAction({
      action: 'REVIEW_REPLIED',
      entityType: 'Review',
      entityId: review.id,
      actorId: merchantUserId,
      actorRole: isOwner ? Role.MERCHANT_OWNER : Role.MERCHANT_STAFF,
      details: {
        merchantId: review.merchantId,
      },
    });

    try {
      const rev = await prisma.review.findUnique({
        where: { id: reviewId },
        include: { order: { include: { customer: { include: { user: true } } } }, merchant: true },
      });
      if (rev?.order?.customer?.user) {
        notificationService.createNotification({
          userId: rev.order.customer.user.id,
          role: rev.order.customer.user.role,
          type: 'REVIEW_REPLIED',
          category: 'order',
          title: 'پاسخ فروشگاه به دیدگاه شما',
          body: 'فروشگاه «' + rev.merchant.businessNameFa + '» به نظر شما پاسخ داد: ' + replyFa.slice(0, 80),
          link: '/merchants/' + rev.merchantId,
        }).catch(() => {});
      }
    } catch {
      // Non-blocking
    }

    return updated;
  }

  /**
   * Retrieves verified reviews for a merchant.
   */
  async listMerchantReviews(merchantId: string, limit = 20, offset = 0) {
    const [items, total, ratings] = await Promise.all([
      prisma.review.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true, merchantId: true, overallRating: true, qualityRating: true,
          valueRating: true, collectionRating: true, varietyRating: true, quantityRating: true,
          commentFa: true, merchantReplyFa: true, merchantReplyAt: true, createdAt: true,

        },
      }),
      prisma.review.count({ where: { merchantId } }),
      this.getMerchantRatings(merchantId),
    ]);

    const details = await prisma.$queryRaw<{ id: string; fullName: string | null; titles: { listing: { titleFa: string } }[] }[]>`SELECT * FROM loqme_rls.review_details(${merchantId})`;
    const byId = new Map(details.map(row => [row.id, row]));
    return {
      items: items.map(item => ({ ...item, customer: { fullName: byId.get(item.id)?.fullName ?? null }, order: { items: byId.get(item.id)?.titles ?? [] } })),
      total,
      ratings,
      limit,
      offset,
    };
  }

  /**
   * Submits a customer complaint/dispute.
   * Automatically monitors food safety threshold (>= 2 expired/spoiled complaints in 7 days -> auto restrict).
   */
  async submitComplaint(customerId: string, orderId: string, input: CreateComplaintInputDto) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: true,
        customer: { select: { fullName: true } },
      },
    });

    if (!order) {
      throw new Error('سفارش مورد نظر یافت نشد');
    }

    if (order.customerId !== customerId) {
      throw new Error('شما مجاز به ثبت شکایت برای این سفارش نیستید');
    }

    const complaint = await prisma.complaint.create({
      data: {
        orderId,
        customerId,
        merchantId: order.merchantId,
        category: input.category as ComplaintCategory,
        descriptionFa: input.descriptionFa.trim(),
        evidencePhotos: input.evidencePhotos || [],
        status: ComplaintStatus.PENDING,
      },
    });

    // Check critical Food Safety escalation threshold
    const isCriticalSafety =
      input.category === ComplaintCategory.EXPIRED_FOOD ||
      input.category === ComplaintCategory.SPOILED_FOOD;

    if (isCriticalSafety) {
      await withDatabaseService('safety', order.merchantId, async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const safetyComplaintsCount = await prisma.complaint.count({
        where: {
          merchantId: order.merchantId,
          category: { in: [ComplaintCategory.EXPIRED_FOOD, ComplaintCategory.SPOILED_FOOD] },
          createdAt: { gte: sevenDaysAgo },
        },
      });

      // Automated merchant restriction if threshold met (>= 2 in 7 days)
      if (safetyComplaintsCount >= 2) {
        await prisma.listingSafety.updateMany({
          where: {
            listing: {
              merchantId: order.merchantId,
            },
          },
          data: {
            safetyStatus: SafetyStatus.RESTRICTED,
          },
        });

        // Also pause any active published listings
        await prisma.listing.updateMany({
          where: {
            merchantId: order.merchantId,
            status: ListingStatus.PUBLISHED,
          },
          data: {
            status: ListingStatus.PAUSED,
          },
        });

        await auditService.logAction({
          action: 'AUTOMATED_SAFETY_LOCKOUT',
          entityType: 'Merchant',
          entityId: order.merchantId,
          details: {
            reason: 'تخطی از حد آستانه گزارش‌های ایمنی غذا (۲ گزارش تاریخ گذشته یا فاسد در ۷ روز اخیر)',
            safetyComplaintsCount,
            triggeredByComplaintId: complaint.id,
          },
        });
      }
      });
    }

    await auditService.logAction({
      action: 'COMPLAINT_FILED',
      entityType: 'Complaint',
      entityId: complaint.id,
      actorRole: Role.CUSTOMER,
      details: {
        orderId,
        merchantId: order.merchantId,
        category: input.category,
        evidencePhotosCount: input.evidencePhotos?.length || 0,
      },
    });

    try {
      const orderNumber = order.orderNumber || order.id;
      const merchantName = order.merchant?.businessNameFa || 'فروشگاه';
      const customerName = (order as any).customer?.fullName || 'مشتری';
      notificationService.notifyAdmins({
        type: 'COMPLAINT_FILED',
        category: 'system',
        title: `ثبت شکایت جدید برای سفارش #${orderNumber}`,
        body: `شکایت جدیدی از طرف ${customerName} برای فروشگاه «${merchantName}» ثبت گردید.`,
        link: '/admin/moderation',
        tag: `complaint-${complaint.id}`,
      }).catch((err) => {
        console.error('[ModerationService] Error sending admin notification for complaint:', err);
      });

      notificationService.notifyMerchant(order.merchantId, {
        type: 'COMPLAINT_RECEIVED',
        category: 'order',
        title: 'ثبت گزارش/شکایت برای سفارش #' + orderNumber,
        body: 'شکایتی در رابطه با سفارش #' + orderNumber + ' ثبت شده و توسط تیم پشتیبانی در حال بررسی است.',
        link: '/merchant/orders',
        tag: 'complaint-' + complaint.id,
      }).catch(() => {});
    } catch {
      // Non-blocking notification dispatch
    }

    return complaint;
  }

  /**
   * Retrieves complaints for admin moderation with food safety priority escalation.
   */
  async listComplaints(filters: {
    status?: ComplaintStatus;
    category?: ComplaintCategory;
    merchantId?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const { status, category, merchantId, limit = 50, offset = 0 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (merchantId) where.merchantId = merchantId;

    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          // Food safety issues first
          { category: 'asc' },
          { createdAt: 'desc' },
        ],
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              user: {
                select: {
                  mobile: true,
                },
              },
            },
          },
          merchant: {
            select: {
              id: true,
              businessNameFa: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmountToman: true,
              status: true,
              payments: {
                where: { status: 'SUCCESS' },
                take: 1,
              },
            },
          },
          refund: true,
          resolvedByUser: {
            select: {
              id: true,
              mobile: true,
            },
          },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    return {
      items: items.map((c: any) => ({
        ...c,
        order: c.order
          ? {
              ...c.order,
              totalAmountToman: c.order.totalAmountToman != null ? Number(c.order.totalAmountToman) : c.order.totalAmountToman,
              payments: c.order.payments?.map((p: any) => ({
                ...p,
                amountToman: p.amountToman != null ? Number(p.amountToman) : p.amountToman,
              })),
            }
          : c.order,
        refund: c.refund
          ? {
              ...c.refund,
              amountToman: c.refund.amountToman != null ? Number(c.refund.amountToman) : c.refund.amountToman,
            }
          : c.refund,
      })),
      total,
      limit,
      offset,
    };
  }

  /**
   * Resolves a customer complaint (Refund / Reject / Warning) by an admin.
   * If REFUND, invokes paymentService.refundPayment, updates ledger, settles refund record,
   * and links refundId to complaint.
   */
  async resolveComplaint(adminUserId: string, complaintId: string, resolution: ResolveComplaintInputDto) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        order: {
          include: {
            payments: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!complaint) {
      throw new Error('شکایت مورد نظر یافت نشد');
    }

    if (complaint.status !== ComplaintStatus.PENDING && complaint.status !== ComplaintStatus.INVESTIGATING) {
      throw new Error('این شکایت قبلاً تعیین تکلیف و بسته شده است');
    }

    let refundId: string | undefined = undefined;

    if (resolution.action === 'REFUND') {
      const payment = complaint.order.payments[0];
      if (!payment) {
        throw new Error('هیچ تراکنش پرداخت موفقی برای این سفارش جهت استرداد وجه یافت نشد');
      }

      const refundAmount = resolution.refundAmountToman ?? Number(payment.amountToman);
      const refundResult = await paymentService.refundPayment({
        paymentId: payment.id,
        amountToman: refundAmount,
        reasonFa: resolution.notesFa || 'استرداد وجه پس از بررسی گزارش و شکایت مشتری',
        processedByUserId: adminUserId,
      });

      if (!refundResult.success) {
        throw new Error(refundResult.errorMessage || 'عملیات استرداد وجه در درگاه بانکی با خطا مواجه شد');
      }

      refundId = refundResult.refund?.id;

      await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: ComplaintStatus.RESOLVED_REFUNDED,
          adminNotesFa: resolution.notesFa,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
          refundId,
        },
      });
    } else if (resolution.action === 'REJECT') {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: ComplaintStatus.RESOLVED_REJECTED,
          adminNotesFa: resolution.notesFa,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
        },
      });
    } else if (resolution.action === 'WARNING') {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: ComplaintStatus.RESOLVED_WARNING,
          adminNotesFa: resolution.notesFa,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
        },
      });
    }

    await auditService.logAction({
      action: 'COMPLAINT_RESOLVED',
      entityType: 'Complaint',
      entityId: complaintId,
      actorId: adminUserId,
      actorRole: Role.ADMIN,
      details: {
        action: resolution.action,
        notesFa: resolution.notesFa,
        refundId,
      },
    });

    try {
      if (complaint.order?.customerId) {
        const customerUser = await prisma.customer.findUnique({
          where: { id: complaint.order.customerId },
          include: { user: true },
        });
        if (customerUser?.user) {
          let resolveTitle = 'نتیجه بررسی شکایت';
          let resolveBody = 'شکایت شما بابت سفارش #' + complaint.order.orderNumber + ' بررسی شد: ' + (resolution.notesFa || 'اقدام مقتضی انجام گردید');
          if (resolution.action === 'REFUND') {
            resolveTitle = 'تأیید شکایت و استرداد وجه';
            resolveBody = 'شکایت شما بابت سفارش #' + complaint.order.orderNumber + ' تایید و مبلغ به حساب شما مسترد شد.';
          } else if (resolution.action === 'REJECT') {
            resolveTitle = 'عدم تأیید شکایت';
            resolveBody = 'شکایت شما بابت سفارش #' + complaint.order.orderNumber + ' مورد تایید قرار نگرفت: ' + (resolution.notesFa || 'عدم تطابق با شرایط');
          } else if (resolution.action === 'WARNING') {
            resolveTitle = 'بررسی شکایت و تذکر به فروشگاه';
            resolveBody = 'شکایت شما بابت سفارش #' + complaint.order.orderNumber + ' بررسی و تذکر لازم به فروشگاه ابلاغ گردید.';
          }

          notificationService.createNotification({
            userId: customerUser.user.id,
            role: customerUser.user.role,
            type: 'COMPLAINT_RESOLVED',
            category: 'support',
            title: resolveTitle,
            body: resolveBody,
            link: '/orders',
          }).catch(() => {});
        }
      }

      notificationService.notifyMerchant(complaint.merchantId, {
        type: 'COMPLAINT_RESOLVED',
        category: 'system',
        title: 'نتیجه بررسی شکایت سفارش #' + (complaint.order?.orderNumber || ''),
        body: resolution.action === 'REFUND'
          ? 'شکایت سفارش #' + complaint.order?.orderNumber + ' تایید و وجه آن به مشتری مسترد شد.'
          : resolution.action === 'WARNING'
          ? 'پیرو شکایت سفارش #' + complaint.order?.orderNumber + '، اخطار سیستمی ثبت شد: ' + (resolution.notesFa || '')
          : 'شکایت سفارش #' + complaint.order?.orderNumber + ' توسط پشتیبانی بررسی و مختومه شد.',
        link: '/merchant/orders',
      }).catch(() => {});
    } catch {
      // Non-blocking
    }

    const resolved = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { refund: true, resolvedByUser: true },
    });
    if (!resolved) return null;
    return {
      ...resolved,
      refund: resolved.refund
        ? {
            ...resolved.refund,
            amountToman: resolved.refund.amountToman != null ? Number(resolved.refund.amountToman) : resolved.refund.amountToman,
          }
        : resolved.refund,
    };
  }

  /**
   * Overrides listing safety status by an admin.
   * If RESTRICTED or UNSAFE, automatically pauses the listing to prevent reservations.
   */
  async updateListingSafetyStatus(
    adminUserId: string,
    listingId: string,
    safetyStatus: SafetyStatus,
    reasonFa?: string
  ) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { safety: true },
    });

    if (!listing) {
      throw new Error('بسته مورد نظر یافت نشد');
    }

    const updatedSafety = await prisma.listingSafety.upsert({
      where: { listingId },
      create: {
        listingId,
        safetyStatus,
      },
      update: {
        safetyStatus,
      },
    });

    // If restricted, rejected, unsafe, or expired, pause listing immediately
    if (safetyStatus !== SafetyStatus.APPROVED) {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: ListingStatus.PAUSED },
      });
    }

    await auditService.logAction({
      action: 'SAFETY_OVERRIDE',
      entityType: 'ListingSafety',
      entityId: updatedSafety.id,
      actorId: adminUserId,
      actorRole: Role.ADMIN,
      details: {
        listingId,
        previousStatus: listing.safety?.safetyStatus,
        newStatus: safetyStatus,
        reasonFa,
      },
    });

    try {
      if (safetyStatus !== SafetyStatus.APPROVED) {
        notificationService.notifyMerchant(listing.merchantId, {
          type: 'LISTING_SAFETY_PAUSED',
          category: 'system',
          title: 'توقف عرضه بسته به دلیل بررسی سلامت و ایمنی',
          body: 'عرضه بسته «' + listing.titleFa + '» به دلیل الزامات سلامت و ایمنی متوقف شد' + (reasonFa ? ' (' + reasonFa + ')' : '') + '.',
          link: '/merchant/inventory',
        }).catch(() => {});
      }
    } catch {
      // Non-blocking
    }

    return updatedSafety;
  }
}

export const moderationService = new ModerationService();
