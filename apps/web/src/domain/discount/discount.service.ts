import { withDatabaseService } from '@/lib/db/context';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
import type {
  CreateDiscountInput,
  DiscountDto,
  DiscountRedemptionDto,
  DiscountStatsDto,
  UpdateDiscountInput,
  ValidateCouponInput,
  ValidateDiscountResult,
  BulkGenerateDiscountsInput,
} from '@loqme/types';
import { DiscountEngine } from './discount-engine';

export class DiscountService {
  /**
   * Helper to serialize a Prisma Discount entity into a DiscountDto
   */
  private toDiscountDto(entity: any): DiscountDto {
    const status = DiscountEngine.getOperationalStatus(entity);
    return {
      id: entity.id,
      code: entity.code,
      titleFa: entity.titleFa,
      descriptionFa: entity.descriptionFa,
      ownerType: entity.ownerType,
      creatorUserId: entity.creatorUserId,
      creatorNameFa: entity.creator?.customer?.fullName || entity.creator?.mobile || null,
      merchantId: entity.merchantId,
      merchantNameFa: entity.merchant?.businessNameFa || null,
      discountType: entity.discountType,
      discountPercent: entity.discountPercent ? Number(entity.discountPercent) : null,
      discountAmountToman: entity.discountAmountToman !== null ? Number(entity.discountAmountToman) : null,
      maxDiscountAmountToman: entity.maxDiscountAmountToman !== null ? Number(entity.maxDiscountAmountToman) : null,
      minOrderAmountToman: entity.minOrderAmountToman !== null ? Number(entity.minOrderAmountToman) : 0,
      applicationMethod: entity.applicationMethod,
      scope: entity.scope,
      categoryId: entity.categoryId,
      categoryNameFa: entity.category?.nameFa || null,
      listingId: entity.listingId,
      listingTitleFa: entity.listing?.titleFa || null,
      startsAt: entity.startsAt instanceof Date ? entity.startsAt.toISOString() : entity.startsAt,
      expiresAt: entity.expiresAt ? (entity.expiresAt instanceof Date ? entity.expiresAt.toISOString() : entity.expiresAt) : null,
      maxUses: entity.maxUses,
      maxUsesPerCustomer: entity.maxUsesPerCustomer,
      currentUses: entity.currentUses,
      isCombinable: entity.isCombinable,
      isActive: entity.isActive,
      fundingSource: entity.fundingSource,
      metadata: entity.metadata,
      status,
      createdAt: entity.createdAt instanceof Date ? entity.createdAt.toISOString() : entity.createdAt,
      updatedAt: entity.updatedAt instanceof Date ? entity.updatedAt.toISOString() : entity.updatedAt,
    };
  }

  /**
   * Validates a coupon code entered during checkout against the current reservation context
   */
  async validateCoupon(input: ValidateCouponInput): Promise<ValidateDiscountResult> {
    const normalizedCode = DiscountEngine.normalizeCouponCode(input.code);
    if (!normalizedCode) {
      return {
        valid: false,
        discountAmountToman: 0,
        finalAmountToman: input.subtotalToman,
        errorCode: 'NOT_FOUND',
        errorMessageFa: 'کد تخفیف معتبر نیست',
      };
    }

    return withDatabaseService('discount', normalizedCode, async () => {
      const discount = await prisma.discount.findUnique({
        where: { code: normalizedCode },
        include: {
          merchant: { select: { businessNameFa: true } },
          category: { select: { nameFa: true } },
          listing: { select: { titleFa: true, categoryId: true } },
        },
      });

      if (!discount) {
        return {
          valid: false,
          discountAmountToman: 0,
          finalAmountToman: input.subtotalToman,
          errorCode: 'NOT_FOUND',
          errorMessageFa: 'کد تخفیف وارد شده وجود ندارد یا اشتباه است',
        };
      }

      // Check per-customer usage count if customerId is provided
      let customerUsageCount = 0;
      if (input.customerId) {
        customerUsageCount = await prisma.discountRedemption.count({
          where: {
            discountId: discount.id,
            customerId: input.customerId,
          },
        });
      }

      // Resolve categoryId if not directly supplied
      const categoryId = discount.listing?.categoryId || undefined;

      const subtotalBigInt = BigInt(Math.max(0, Math.floor(input.subtotalToman)));

      const eligibility = DiscountEngine.checkEligibility(discount, {
        customerId: input.customerId,
        merchantId: input.merchantId,
        listingId: input.listingId,
        categoryId,
        subtotalToman: subtotalBigInt,
        customerUsageCount,
      });

      if (!eligibility.eligible) {
        return {
          valid: false,
          discount: this.toDiscountDto(discount),
          discountAmountToman: 0,
          finalAmountToman: input.subtotalToman,
          errorCode: eligibility.errorCode,
          errorMessageFa: eligibility.errorMessageFa,
        };
      }

      const discountAmountBigInt = DiscountEngine.calculateDiscountAmount(discount, subtotalBigInt);
      const discountAmountToman = Number(discountAmountBigInt);
      const finalAmountToman = Math.max(0, input.subtotalToman - discountAmountToman);

      return {
        valid: true,
        discount: this.toDiscountDto(discount),
        discountAmountToman,
        finalAmountToman,
      };
    });
  }

  /**
   * Finds the best automatic discount eligible for a listing / merchant without coupon code
   */
  async findAutomaticDiscount(params: {
    merchantId: string;
    listingId: string;
    categoryId?: string | null;
    subtotalToman: number;
    customerId?: string;
  }): Promise<{ discount?: DiscountDto; discountAmountToman: number } | null> {
    return withDatabaseService('discount', params.listingId, async () => {
      const now = new Date();
      const subtotalBigInt = BigInt(Math.max(0, Math.floor(params.subtotalToman)));

      const candidates = await prisma.discount.findMany({
        where: {
          applicationMethod: 'AUTOMATIC',
          isActive: true,
          startsAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          AND: [
            {
              OR: [
                { scope: 'PLATFORM' },
                { scope: 'MERCHANT', merchantId: params.merchantId },
                { scope: 'CATEGORY', categoryId: params.categoryId || undefined },
                { scope: 'LISTING', listingId: params.listingId },
              ],
            },
          ],
        },
      });

      let bestDiscount: any = null;
      let highestDiscountAmount = BigInt(0);

      for (const candidate of candidates) {
        let customerUsageCount = 0;
        if (params.customerId) {
          customerUsageCount = await prisma.discountRedemption.count({
            where: {
              discountId: candidate.id,
              customerId: params.customerId,
            },
          });
        }

        const eligibility = DiscountEngine.checkEligibility(candidate, {
          customerId: params.customerId,
          merchantId: params.merchantId,
          listingId: params.listingId,
          categoryId: params.categoryId,
          subtotalToman: subtotalBigInt,
          customerUsageCount,
          now,
        });

        if (eligibility.eligible) {
          const amount = DiscountEngine.calculateDiscountAmount(candidate, subtotalBigInt);
          if (amount > highestDiscountAmount) {
            highestDiscountAmount = amount;
            bestDiscount = candidate;
          }
        }
      }

      if (bestDiscount && highestDiscountAmount > BigInt(0)) {
        return {
          discount: this.toDiscountDto(bestDiscount),
          discountAmountToman: Number(highestDiscountAmount),
        };
      }

      return null;
    });
  }

  /**
   * Creates a new discount (admin or merchant)
   */
  async createDiscount(
    creatorUserId: string,
    role: string,
    input: CreateDiscountInput
  ): Promise<{ success: boolean; discount?: DiscountDto; message?: string }> {
    return withDatabaseService('discount', creatorUserId, async () => {
      // 1. RBAC and Scope Bounds
      const isAdmin = role === 'ADMIN';
      const isMerchant = role === 'MERCHANT_OWNER' || role === 'MERCHANT_STAFF';

      if (!isAdmin && !isMerchant) {
        return { success: false, message: 'دسترسی غیرمجاز برای ایجاد تخفیف' };
      }

      let ownerType = input.ownerType || (isAdmin ? 'ADMIN' : 'MERCHANT');
      let merchantId = input.merchantId || null;
      let fundingSource = input.fundingSource || 'PLATFORM';

      if (isMerchant) {
        ownerType = 'MERCHANT';
        fundingSource = 'MERCHANT'; // Merchants cannot create platform-subsidized discounts

        // Verify merchant ownership
        if (!merchantId) {
          const staffRecord = await prisma.merchantStaff.findFirst({
            where: { userId: creatorUserId },
          });
          const merchantRecord = await prisma.merchant.findFirst({
            where: { ownerUserId: creatorUserId },
          });
          merchantId = staffRecord?.merchantId || merchantRecord?.id || null;
        }

        if (!merchantId) {
          return { success: false, message: 'فروشگاه مرتبط با حساب شما یافت نشد' };
        }

        // Verify that this merchant user actually belongs to merchantId
        const hasAccess = await prisma.merchant.findFirst({
          where: {
            id: merchantId,
            OR: [
              { ownerUserId: creatorUserId },
              { staff: { some: { userId: creatorUserId } } },
            ],
          },
        });

        if (!hasAccess) {
          return { success: false, message: 'شما دسترسی مدیریت تخفیف‌های این فروشگاه را ندارید' };
        }

        // Merchant discounts can only target their own merchant or listing
        if (input.scope === 'PLATFORM') {
          return { success: false, message: 'فروشگاه نمی‌تواند تخفیف سراسری ایجاد کند' };
        }
        if (input.scope === 'CATEGORY') {
          return { success: false, message: 'فروشگاه نمی‌تواند تخفیف دسته‌بندی سراسری ایجاد کند' };
        }
      }

      // 2. Normalize and check unique code if coupon code
      let normalizedCode: string | null = null;
      if (input.applicationMethod !== 'AUTOMATIC') {
        if (!input.code || !input.code.trim()) {
          return { success: false, message: 'کد تخفیف الزامی است' };
        }
        normalizedCode = DiscountEngine.normalizeCouponCode(input.code);
        const existing = await prisma.discount.findUnique({
          where: { code: normalizedCode },
        });
        if (existing) {
          return { success: false, message: 'این کد تخفیف قبلاً تعریف شده است' };
        }
      }

      // 3. Create Discount
      const created = await prisma.discount.create({
        data: {
          code: normalizedCode,
          titleFa: input.titleFa.trim(),
          descriptionFa: input.descriptionFa?.trim() || null,
          ownerType,
          creatorUserId,
          merchantId,
          discountType: input.discountType,
          discountPercent: input.discountType === 'PERCENTAGE' && input.discountPercent ? input.discountPercent : null,
          discountAmountToman:
            input.discountType === 'FIXED_AMOUNT' && input.discountAmountToman
              ? BigInt(Math.floor(input.discountAmountToman))
              : null,
          maxDiscountAmountToman:
            input.maxDiscountAmountToman ? BigInt(Math.floor(input.maxDiscountAmountToman)) : null,
          minOrderAmountToman:
            input.minOrderAmountToman ? BigInt(Math.floor(input.minOrderAmountToman)) : BigInt(0),
          applicationMethod: input.applicationMethod || 'COUPON_CODE',
          scope: input.scope || (ownerType === 'MERCHANT' ? 'MERCHANT' : 'PLATFORM'),
          categoryId: input.categoryId || null,
          listingId: input.listingId || null,
          startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          maxUses: input.maxUses || null,
          maxUsesPerCustomer: input.maxUsesPerCustomer || 1,
          isCombinable: input.isCombinable ?? false,
          isActive: input.isActive ?? true,
          fundingSource,
        },
        include: {
          merchant: { select: { businessNameFa: true } },
          category: { select: { nameFa: true } },
          listing: { select: { titleFa: true } },
        },
      });

      return {
        success: true,
        discount: this.toDiscountDto(created),
        message: 'تخفیف با موفقیت ایجاد شد',
      };
    });
  }

  /**
   * Updates an existing discount
   */
  async updateDiscount(
    userId: string,
    role: string,
    discountId: string,
    input: UpdateDiscountInput
  ): Promise<{ success: boolean; discount?: DiscountDto; message?: string }> {
    return withDatabaseService('discount', discountId, async () => {
      const discount = await prisma.discount.findUnique({
        where: { id: discountId },
      });

      if (!discount) {
        return { success: false, message: 'تخفیف مورد نظر یافت نشد' };
      }

      // Check permissions
      const isAdmin = role === 'ADMIN';
      if (!isAdmin) {
        if (discount.ownerType !== 'MERCHANT' || !discount.merchantId) {
          return { success: false, message: 'شما اجازه ویرایش این تخفیف را ندارید' };
        }
        const hasAccess = await prisma.merchant.findFirst({
          where: {
            id: discount.merchantId,
            OR: [
              { ownerUserId: userId },
              { staff: { some: { userId } } },
            ],
          },
        });
        if (!hasAccess) {
          return { success: false, message: 'شما دسترسی ویرایش تخفیف‌های این فروشگاه را ندارید' };
        }
      }

      // If updating code, ensure uniqueness
      let normalizedCode = discount.code;
      if (input.code !== undefined && input.code !== null) {
        normalizedCode = DiscountEngine.normalizeCouponCode(input.code);
        if (normalizedCode !== discount.code) {
          const existing = await prisma.discount.findUnique({
            where: { code: normalizedCode },
          });
          if (existing && existing.id !== discountId) {
            return { success: false, message: 'این کد تخفیف تکراری است' };
          }
        }
      }

      const updated = await prisma.discount.update({
        where: { id: discountId },
        data: {
          code: normalizedCode,
          titleFa: input.titleFa !== undefined ? input.titleFa.trim() : undefined,
          descriptionFa: input.descriptionFa !== undefined ? input.descriptionFa?.trim() || null : undefined,
          discountType: input.discountType !== undefined ? input.discountType : undefined,
          discountPercent:
            input.discountPercent !== undefined
              ? input.discountPercent
                ? input.discountPercent
                : null
              : undefined,
          discountAmountToman:
            input.discountAmountToman !== undefined
              ? input.discountAmountToman
                ? BigInt(Math.floor(input.discountAmountToman))
                : null
              : undefined,
          maxDiscountAmountToman:
            input.maxDiscountAmountToman !== undefined
              ? input.maxDiscountAmountToman
                ? BigInt(Math.floor(input.maxDiscountAmountToman))
                : null
              : undefined,
          minOrderAmountToman:
            input.minOrderAmountToman !== undefined
              ? input.minOrderAmountToman !== null
                ? BigInt(Math.floor(input.minOrderAmountToman))
                : BigInt(0)
              : undefined,
          applicationMethod: input.applicationMethod !== undefined ? input.applicationMethod : undefined,
          scope: input.scope !== undefined ? input.scope : undefined,
          categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
          listingId: input.listingId !== undefined ? input.listingId : undefined,
          startsAt: input.startsAt !== undefined ? (input.startsAt ? new Date(input.startsAt) : undefined) : undefined,
          expiresAt:
            input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : undefined,
          maxUses: input.maxUses !== undefined ? input.maxUses : undefined,
          maxUsesPerCustomer: input.maxUsesPerCustomer !== undefined ? input.maxUsesPerCustomer : undefined,
          isCombinable: input.isCombinable !== undefined ? input.isCombinable : undefined,
          isActive: input.isActive !== undefined ? input.isActive : undefined,
          fundingSource: isAdmin && input.fundingSource !== undefined ? input.fundingSource : undefined,
        },
        include: {
          merchant: { select: { businessNameFa: true } },
          category: { select: { nameFa: true } },
          listing: { select: { titleFa: true } },
        },
      });

      return {
        success: true,
        discount: this.toDiscountDto(updated),
        message: 'تخفیف با موفقیت ویرایش شد',
      };
    });
  }

  /**
   * Deletes a discount. If it has usage history (redemptions), soft-deactivates it to protect financial auditability.
   */
  async deleteDiscount(
    userId: string,
    role: string,
    discountId: string
  ): Promise<{ success: boolean; message: string }> {
    return withDatabaseService('discount', discountId, async () => {
      const discount = await prisma.discount.findUnique({
        where: { id: discountId },
        include: { redemptions: { select: { id: true }, take: 1 } },
      });

      if (!discount) {
        return { success: false, message: 'تخفیف یافت نشد' };
      }

      const isAdmin = role === 'ADMIN';
      if (!isAdmin) {
        if (discount.ownerType !== 'MERCHANT' || !discount.merchantId) {
          return { success: false, message: 'شما دسترسی حذف این تخفیف را ندارید' };
        }
        const hasAccess = await prisma.merchant.findFirst({
          where: {
            id: discount.merchantId,
            OR: [
              { ownerUserId: userId },
              { staff: { some: { userId } } },
            ],
          },
        });
        if (!hasAccess) {
          return { success: false, message: 'شما دسترسی حذف تخفیف‌های این فروشگاه را ندارید' };
        }
      }

      if (discount.redemptions.length > 0) {
        // Soft delete to protect financial ledgers
        await prisma.discount.update({
          where: { id: discountId },
          data: { isActive: false },
        });
        return {
          success: true,
          message: 'تخفیف دارای سابقه استفاده در سفارش‌ها است و به منظور حفظ اسناد مالی غیرفعال شد',
        };
      }

      await prisma.discount.delete({
        where: { id: discountId },
      });

      return { success: true, message: 'تخفیف با موفقیت حذف شد' };
    });
  }

  /**
   * Lists discounts with filtering and pagination
   */
  async getDiscounts(query: {
    ownerType?: 'ADMIN' | 'MERCHANT';
    merchantId?: string;
    scope?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ discounts: DiscountDto[]; total: number; page: number; pageSize: number }> {
    return withDatabaseService('discount', 'query', async () => {
      const page = Math.max(1, query.page || 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (query.ownerType) where.ownerType = query.ownerType;
      if (query.merchantId) where.merchantId = query.merchantId;
      if (query.scope) where.scope = query.scope;
      if (query.isActive !== undefined) where.isActive = query.isActive;
      if (query.search && query.search.trim()) {
        const s = query.search.trim();
        where.OR = [
          { code: { contains: s, mode: 'insensitive' } },
          { titleFa: { contains: s, mode: 'insensitive' } },
        ];
      }

      const [total, items] = await Promise.all([
        prisma.discount.count({ where }),
        prisma.discount.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { mobile: true, customer: { select: { fullName: true } } } },
            merchant: { select: { businessNameFa: true } },
            category: { select: { nameFa: true } },
            listing: { select: { titleFa: true } },
          },
        }),
      ]);

      return {
        discounts: items.map((item) => this.toDiscountDto(item)),
        total,
        page,
        pageSize,
      };
    });
  }

  /**
   * Gets single discount details by id
   */
  async getDiscountById(discountId: string): Promise<DiscountDto | null> {
    return withDatabaseService('discount', discountId, async () => {
      const discount = await prisma.discount.findUnique({
        where: { id: discountId },
        include: {
          creator: { select: { mobile: true, customer: { select: { fullName: true } } } },
          merchant: { select: { businessNameFa: true } },
          category: { select: { nameFa: true } },
          listing: { select: { titleFa: true } },
        },
      });

      return discount ? this.toDiscountDto(discount) : null;
    });
  }

  /**
   * Retrieves redemption history for a discount or merchant
   */
  async getRedemptions(query: {
    discountId?: string;
    merchantId?: string;
    customerId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ redemptions: DiscountRedemptionDto[]; total: number }> {
    return withDatabaseService('discount', 'redemptions', async () => {
      const page = Math.max(1, query.page || 1);
      const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (query.discountId) where.discountId = query.discountId;
      if (query.customerId) where.customerId = query.customerId;
      if (query.merchantId) {
        where.discount = { merchantId: query.merchantId };
      }

      const [total, items] = await Promise.all([
        prisma.discountRedemption.count({ where }),
        prisma.discountRedemption.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { fullName: true } },
            order: { select: { orderNumber: true } },
          },
        }),
      ]);

      return {
        redemptions: items.map((r) => ({
          id: r.id,
          discountId: r.discountId,
          orderId: r.orderId,
          orderNumber: r.order?.orderNumber,
          customerId: r.customerId,
          customerNameFa: r.customer?.fullName || undefined,
          discountAmountToman: Number(r.discountAmountToman),
          createdAt: r.createdAt.toISOString(),
        })),
        total,
      };
    });
  }

  /**
   * Generates bulk unique discount coupons
   */
  async bulkGenerateDiscounts(
    creatorUserId: string,
    role: string,
    input: BulkGenerateDiscountsInput
  ): Promise<{ success: boolean; count: number; codes: string[]; message?: string }> {
    const isAdmin = role === 'ADMIN';
    if (!isAdmin) {
      return { success: false, count: 0, codes: [], message: 'فقط مدیر سیستم می‌تواند کدهای تخفیف گروهی تولید کند' };
    }

    const count = Math.min(1000, Math.max(1, input.count));
    const prefix = (input.prefix || 'LQ').toUpperCase().trim();
    const codes: string[] = [];

    // Generate unique random strings
    while (codes.length < count) {
      const randStr = randomBytes(3).toString('hex').toUpperCase();
      const code = `${prefix}-${randStr}`;
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }

    return withDatabaseService('discount', 'bulk', async () => {
      // Check existing in database
      const existing = await prisma.discount.findMany({
        where: { code: { in: codes } },
        select: { code: true },
      });
      const existingSet = new Set(existing.map((e) => e.code));
      const validCodes = codes.filter((c) => !existingSet.has(c));

      await prisma.$transaction(async (tx) => {
        for (const code of validCodes) {
          await tx.discount.create({
            data: {
              code,
              titleFa: input.titleFa.trim(),
              descriptionFa: input.descriptionFa?.trim() || null,
              ownerType: 'ADMIN',
              creatorUserId,
              merchantId: input.merchantId || null,
              discountType: input.discountType,
              discountPercent:
                input.discountType === 'PERCENTAGE' && input.discountPercent ? input.discountPercent : null,
              discountAmountToman:
                input.discountType === 'FIXED_AMOUNT' && input.discountAmountToman
                  ? BigInt(Math.floor(input.discountAmountToman))
                  : null,
              maxDiscountAmountToman:
                input.maxDiscountAmountToman ? BigInt(Math.floor(input.maxDiscountAmountToman)) : null,
              minOrderAmountToman:
                input.minOrderAmountToman ? BigInt(Math.floor(input.minOrderAmountToman)) : BigInt(0),
              applicationMethod: 'COUPON_CODE',
              scope: input.scope || 'PLATFORM',
              categoryId: input.categoryId || null,
              listingId: input.listingId || null,
              startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
              expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
              maxUses: input.maxUsesPerCode || 1,
              maxUsesPerCustomer: input.maxUsesPerCustomer || 1,
              isCombinable: false,
              isActive: true,
              fundingSource: input.fundingSource || 'PLATFORM',
            },
          });
        }
      });

      return {
        success: true,
        count: validCodes.length,
        codes: validCodes,
        message: `${validCodes.length} کد تخفیف یکتا با موفقیت تولید شد`,
      };
    });
  }

  /**
   * Retrieves summary statistics for admin or merchant
   */
  async getDiscountStats(merchantId?: string): Promise<DiscountStatsDto> {
    return withDatabaseService('discount', 'stats', async () => {
      const now = new Date();
      const where: any = {};
      const redemptionWhere: any = {};

      if (merchantId) {
        where.merchantId = merchantId;
        redemptionWhere.discount = { merchantId };
      }

      const [totalDiscounts, activeDiscounts, totalRedemptions, amountAgg] = await Promise.all([
        prisma.discount.count({ where }),
        prisma.discount.count({
          where: {
            ...where,
            isActive: true,
            startsAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        prisma.discountRedemption.count({ where: redemptionWhere }),
        prisma.discountRedemption.aggregate({
          where: redemptionWhere,
          _sum: { discountAmountToman: true },
        }),
      ]);

      return {
        totalDiscounts,
        activeDiscounts,
        totalRedemptions,
        totalDiscountAmountToman: Number(amountAgg._sum.discountAmountToman || 0),
      };
    });
  }
}

export const discountService = new DiscountService();
