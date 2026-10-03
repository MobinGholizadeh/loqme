import { prisma } from '@/lib/prisma';
import { VerificationStatus, ListingStatus, Role, Prisma, OrderStatus, RefundStatus } from '@prisma/client';
import { auditService } from '@/domain/moderation/audit.service';
import {
  AdminUpdateMerchantInput,
  AdminUpdateCustomerInput,
  CreateCategoryInput,
  UpdateSystemSettingsInput,
} from '@loqme/validation';
import {
  AdminDashboardKpiDto,
  AdminMerchantItemDto,
  AdminCustomerItemDto,
  AdminListingItemDto,
  AdminCategoryDto,
  AdminSettlementReportDto,
  MerchantSettlementSheetDto,
  SystemSettingsDto,
} from '@loqme/types';

// In-memory system settings with production defaults
let systemSettings: SystemSettingsDto = {
  maintenanceMode: false,
  announcementBannerFa: 'سامانه عرضه هوشمند و ایمن مازاد غذایی لقمه در شهر ارومیه فعال است.',
  activeSmsProvider: 'MOCK',
};

export class AdminService {
  /**
   * CP-08.1: Central Admin Dashboard Real-Time Metrics & KPIs
   */
  async getDashboardKPIs(): Promise<AdminDashboardKpiDto> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Merchants Counts
    const [activeMerchantsCount, pendingMerchantsCount, suspendedMerchantsCount] =
      await Promise.all([
        prisma.merchant.count({ where: { verificationStatus: VerificationStatus.APPROVED } }),
        prisma.merchant.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
        prisma.merchant.count({ where: { verificationStatus: VerificationStatus.SUSPENDED } }),
      ]);

    // 2. Active Published Listings
    const activeListingsCount = await prisma.listing.count({
      where: {
        status: ListingStatus.PUBLISHED,
        pickupEnd: { gt: now },
      },
    });

    // 3. 24-Hour Orders & GMV
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        status: { in: [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED] },
      },
      select: { totalAmountToman: true, commissionAmountToman: true },
    });

    const totalOrders24hCount = recentOrders.length;
    let gmv24hToman = 0;
    for (const ord of recentOrders) {
      gmv24hToman += Number(ord.totalAmountToman);
    }
    const commission24hToman = recentOrders.reduce((sum, order) => sum + Number(order.commissionAmountToman), 0);

    // 4. Open Complaints
    const openComplaintsCount = await prisma.complaint.count({
      where: { status: { in: ['PENDING', 'INVESTIGATING'] } },
    });

    return {
      activeMerchantsCount,
      pendingMerchantsCount,
      suspendedMerchantsCount,
      activeListingsCount,
      totalOrders24hCount,
      gmv24hToman,
      commission24hToman,
      openComplaintsCount,
      systemHealth: {
        database: true,
        auth: true,
        rbac: true,
      },
    };
  }

  /**
   * CP-08.2: List Merchants with Verification & Location Information
   */
  async listMerchants(filter?: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<AdminMerchantItemDto[]> {
    const where: Prisma.MerchantWhereInput = {};

    if (filter?.status && filter.status !== 'ALL') {
      where.verificationStatus = filter.status as VerificationStatus;
    }

    if (filter?.search) {
      where.OR = [
        { businessNameFa: { contains: filter.search, mode: 'insensitive' } },
        { licenseNumber: { contains: filter.search, mode: 'insensitive' } },
        { owner: { mobile: { contains: filter.search } } },
      ];
    }

    const merchants = await prisma.merchant.findMany({
      where,
      include: {
        owner: {
          include: { customer: true },
        },
        locations: {
          include: { city: true },
          take: 1,
        },
        listings: {
          where: { status: ListingStatus.PUBLISHED },
          select: { id: true },
        },
        orders: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 50,
    });

    return merchants.map((m) => {
      const primaryLoc = m.locations[0];
      return {
        id: m.id,
        businessNameFa: m.businessNameFa,
        businessType: m.businessType,
        ownerMobile: m.owner.mobile,
        ownerFullName: m.owner.customer?.fullName || null,
        licenseNumber: m.licenseNumber,
        commissionPercent: Number(m.commissionPercent),
        verificationStatus: m.verificationStatus,
        ratingAverage: m.ratingAverage,
        ratingCount: m.ratingCount,
        addressFa: primaryLoc?.addressFa,
        cityNameFa: primaryLoc?.city?.nameFa,
        activeListingsCount: m.listings.length,
        totalOrdersCount: m.orders.length,
        createdAt: m.createdAt.toISOString(),
      };
    });
  }

  /**
   * CP-08.2: Admin Status Override & Commission Adjustment with Audit Trail
   */
  async updateMerchant(
    adminUserId: string,
    merchantId: string,
    data: AdminUpdateMerchantInput
  ) {
    const existing = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!existing) {
      throw new Error('فروشگاه مورد نظر یافت نشد');
    }

    const updateData: Prisma.MerchantUpdateInput = {};

    if (data.verificationStatus) {
      updateData.verificationStatus = data.verificationStatus as VerificationStatus;
    }

    if (data.commissionPercent !== undefined) {
      updateData.commissionPercent = data.commissionPercent;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.update({
        where: { id: merchantId },
        data: updateData,
      });

      // If merchant is suspended or rejected, automatically pause all active listings!
      if (
        data.verificationStatus === VerificationStatus.SUSPENDED ||
        data.verificationStatus === VerificationStatus.REJECTED
      ) {
        await tx.listing.updateMany({
          where: {
            merchantId,
            status: ListingStatus.PUBLISHED,
          },
          data: { status: ListingStatus.PAUSED },
        });
      }

      return merchant;
    });

    // Record immutable audit log
    await auditService.logAction({
      action: 'ADMIN_UPDATE_MERCHANT',
      entityType: 'MERCHANT',
      entityId: merchantId,
      actorId: adminUserId,
      actorRole: Role.ADMIN,
      details: {
        previousStatus: existing.verificationStatus,
        newStatus: data.verificationStatus,
        previousCommission: Number(existing.commissionPercent),
        newCommission: data.commissionPercent,
        reasonFa: data.reasonFa,
      },
    });

    return {
      success: true,
      message: 'وضعیت فروشگاه با موفقیت بروزرسانی شد',
      data: updated,
    };
  }

  /**
   * CP-08.3: List Customers with Savings and Purchase Totals
   */
  async listCustomers(filter?: {
    search?: string;
    limit?: number;
  }): Promise<AdminCustomerItemDto[]> {
    const where: Prisma.UserWhereInput = {
      role: { in: [Role.CUSTOMER, Role.MERCHANT_STAFF, Role.MERCHANT_OWNER] },
    };

    if (filter?.search) {
      where.OR = [
        { mobile: { contains: filter.search } },
        { customer: { fullName: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        customer: {
          include: {
            orders: { select: { id: true } },
            complaints: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 50,
    });

    return users.map((u) => ({
      id: u.customer?.id || u.id,
      userId: u.id,
      mobile: u.mobile,
      fullName: u.customer?.fullName || null,
      isActive: u.isActive,
      cumulativeSavingsToman: Number(u.customer?.cumulativeSavingsToman || 0),
      totalOrdersCount: u.customer?.orders.length || 0,
      complaintsCount: u.customer?.complaints.length || 0,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  /**
   * CP-08.3: Toggle Customer Active Status
   */
  async updateCustomerStatus(
    adminUserId: string,
    customerUserId: string,
    data: AdminUpdateCustomerInput
  ) {
    const user = await prisma.user.findUnique({
      where: { id: customerUserId },
    });

    if (!user) {
      throw new Error('کاربر مورد نظر یافت نشد');
    }

    const updated = await prisma.user.update({
      where: { id: customerUserId },
      data: { isActive: data.isActive },
    });

    await auditService.logAction({
      action: 'ADMIN_UPDATE_CUSTOMER_STATUS',
      entityType: 'USER',
      entityId: customerUserId,
      actorId: adminUserId,
      actorRole: Role.ADMIN,
      details: {
        previousActive: user.isActive,
        newActive: data.isActive,
        reasonFa: data.reasonFa,
      },
    });

    return {
      success: true,
      message: data.isActive ? 'حساب کاربری فعال شد' : 'حساب کاربری مسدود شد',
      user: updated,
    };
  }

  /**
   * CP-08.4: List All Marketplace Listings for Moderation
   */
  async listGlobalListings(filter?: {
    categoryId?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<AdminListingItemDto[]> {
    const where: Prisma.ListingWhereInput = {};

    if (filter?.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status as ListingStatus;
    }

    if (filter?.search) {
      where.OR = [
        { titleFa: { contains: filter.search, mode: 'insensitive' } },
        { merchant: { businessNameFa: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        merchant: { select: { id: true, businessNameFa: true } },
        category: { select: { id: true, nameFa: true } },
        inventory: { select: { totalQuantity: true } },
        safety: { select: { safetyStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filter?.limit ?? 50,
    });

    return listings.map((l) => ({
      id: l.id,
      merchantId: l.merchantId,
      merchantNameFa: l.merchant.businessNameFa,
      categoryId: l.categoryId,
      categoryNameFa: l.category?.nameFa,
      titleFa: l.titleFa,
      originalPriceToman: Number(l.originalPriceToman),
      discountedPriceToman: Number(l.discountedPriceToman),
      quantity: l.inventory?.totalQuantity || 0,
      status: l.status,
      safetyStatus: l.safety?.safetyStatus || 'UNKNOWN',
      pickupStart: l.pickupStart?.toISOString() || null,
      pickupEnd: l.pickupEnd?.toISOString() || null,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * CP-08.4: List Product Categories
   */
  async listCategories(): Promise<AdminCategoryDto[]> {
    const categories = await prisma.category.findMany({
      include: {
        listings: { select: { id: true } },
      },
      orderBy: { nameFa: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameFa: c.nameFa,
      iconUrl: c.iconUrl,
      parentId: c.parentId,
      listingsCount: c.listings.length,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * CP-08.4: Create Product Category
   */
  async createCategory(adminUserId: string, data: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error('دسته‌بندی با این شناسه انگلیسی قبلاً ثبت شده است');
    }

    const category = await prisma.category.create({
      data: {
        slug: data.slug,
        nameFa: data.nameFa,
        iconUrl: data.iconUrl,
        parentId: data.parentId,
      },
    });

    await auditService.logAction({
      action: 'ADMIN_CREATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: category.id,
      actorId: adminUserId,
      actorRole: Role.ADMIN,
      details: { slug: category.slug, nameFa: category.nameFa },
    });

    return category;
  }

  /**
   * CP-08.6: Generate Settlement Report across All Merchants
   */
  async getSettlementReport(): Promise<AdminSettlementReportDto> {
    const merchants = await prisma.merchant.findMany({
      where: { verificationStatus: VerificationStatus.APPROVED },
      include: {
        orders: {
          where: { status: { in: [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED] } },
          include: {
            refunds: { where: { status: { in: [RefundStatus.APPROVED, RefundStatus.SETTLED] } } },
          },
        },
      },
    });

    let totalGmvToman = 0;
    let totalPlatformCommissionToman = 0;
    let totalRefundsToman = 0;
    let totalNetPayableToman = 0;

    const sheets: MerchantSettlementSheetDto[] = [];

    for (const m of merchants) {
      let storeGmv = 0;
      let storeRefunds = 0;
      let commissionCut = 0;

      for (const ord of m.orders) {
        storeGmv += Number(ord.totalAmountToman);
        commissionCut += Number(ord.commissionAmountToman);
        for (const ref of ord.refunds) {
          storeRefunds += Number(ref.amountToman);
        }
      }

      const commissionRate = Number(m.commissionPercent ?? 10.0);
      const netPayable = Math.max(0, storeGmv - commissionCut - storeRefunds);

      totalGmvToman += storeGmv;
      totalPlatformCommissionToman += commissionCut;
      totalRefundsToman += storeRefunds;
      totalNetPayableToman += netPayable;

      sheets.push({
        merchantId: m.id,
        businessNameFa: m.businessNameFa,
        commissionPercent: commissionRate,
        grossGmvToman: storeGmv,
        commissionCutToman: commissionCut,
        refundsDeductedToman: storeRefunds,
        netPayableToman: netPayable,
        shabaNumber: null,
        ordersCount: m.orders.length,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      totalGmvToman,
      totalPlatformCommissionToman,
      totalRefundsToman,
      totalNetPayableToman,
      merchants: sheets,
    };
  }

  /**
   * CP-08.7: Get System Configuration & Feature Flags
   */
  getSystemSettings(): SystemSettingsDto {
    return { ...systemSettings };
  }

  /**
   * CP-08.7: Update System Configuration & Feature Flags
   */
  async updateSystemSettings(adminUserId: string, data: UpdateSystemSettingsInput) {
    if (data.maintenanceMode !== undefined) {
      systemSettings.maintenanceMode = data.maintenanceMode;
    }
    if (data.announcementBannerFa !== undefined) {
      systemSettings.announcementBannerFa = data.announcementBannerFa;
    }
    if (data.activeSmsProvider) {
      systemSettings.activeSmsProvider = data.activeSmsProvider;
    }

    await auditService.logAction({
      action: 'ADMIN_UPDATE_SYSTEM_SETTINGS',
      entityType: 'SYSTEM',
      entityId: 'SYSTEM_SETTINGS',
      actorId: adminUserId,
      actorRole: Role.ADMIN,
      details: { ...systemSettings },
    });

    return { ...systemSettings };
  }
}

export const adminService = new AdminService();
