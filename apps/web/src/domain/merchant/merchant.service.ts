import { withDatabaseService } from '@/lib/db/context';
import { prisma } from '@/lib/prisma';
import { listingImageStorage } from '@/domain/listing/image-storage';
import { BusinessType, VerificationStatus, StaffRole, Prisma } from '@prisma/client';
import { CreateMerchantInput, CreateMerchantSchema } from '@loqme/validation';
import { NearbyMerchantQuery } from '@loqme/types';

export interface NearbyLocationResult {
  id: string;
  merchantId: string;
  cityId: string;
  neighborhoodId: string | null;
  addressFa: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  distanceMeters: number;
  businessNameFa: string;
  businessType: BusinessType;
  ratingAverage: number;
  ratingCount: number;
  verificationStatus: VerificationStatus;
}

export class MerchantService {
  /**
   * Creates a new merchant profile with primary location and initial owner staff role
   */
  async createMerchant(input: CreateMerchantInput) {
    const validated = CreateMerchantSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Merchant
      const merchant = await tx.merchant.create({
        data: {
          ownerUserId: validated.ownerUserId,
          businessNameFa: validated.businessNameFa,
          businessType: validated.businessType as BusinessType,
          licenseNumber: validated.licenseNumber,
          commissionPercent: validated.commissionPercent,
          verificationStatus: VerificationStatus.PENDING,
          staff: {
            create: {
              userId: validated.ownerUserId,
              role: StaffRole.OWNER,
              canScanPickup: true,
            },
          },
        },
      });

      // 2. Create primary store location
      const location = await tx.merchantLocation.create({
        data: {
          merchantId: merchant.id,
          cityId: validated.location.cityId,
          neighborhoodId: validated.location.neighborhoodId,
          addressFa: validated.location.addressFa,
          postalCode: validated.location.postalCode,
          latitude: validated.location.latitude,
          longitude: validated.location.longitude,
          phone: validated.location.phone,
        },
      });

      return {
        ...merchant,
        locations: [location],
      };
    });
  }

  /**
   * Fetches a merchant with locations, hours, and staff
   */
  async getMerchantById(id: string) {
    return await prisma.merchant.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            city: true,
            neighborhood: true,
            hours: true,
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
        listings: {
          where: { status: 'PUBLISHED' },
          include: {
            inventory: true,
            safety: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Lists merchants with optional filters
   */
  async listMerchants(options?: {
    businessType?: BusinessType;
    verificationStatus?: VerificationStatus;
    limit?: number;
  }) {
    return await prisma.merchant.findMany({
      where: {
        businessType: options?.businessType,
        verificationStatus: options?.verificationStatus,
      },
      include: {
        locations: {
          include: {
            city: true,
            neighborhood: true,
          },
        },
      },
      take: options?.limit ?? 50,
      orderBy: { ratingAverage: 'desc' },
    });
  }

  /**
   * Finds store locations nearby using PostGIS ST_DWithin and calculates exact distance with ST_Distance
   */
  async findNearby(query: NearbyMerchantQuery): Promise<NearbyLocationResult[]> {
    const radiusMeters = query.radiusMeters ?? 5000;
    const limit = query.limit ?? 20;

    let businessTypeFilter = Prisma.empty;
    if (query.businessType) {
      businessTypeFilter = Prisma.sql`AND m."businessType" = ${query.businessType}::"BusinessType"`;
    }

    const results = await prisma.$queryRaw<NearbyLocationResult[]>`
      SELECT 
        ml.id,
        ml."merchantId",
        ml."cityId",
        ml."neighborhoodId",
        ml."addressFa",
        ml."postalCode",
        ml.latitude,
        ml.longitude,
        ml.phone,
        ROUND(ST_Distance(ml.geom, ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography)::numeric, 1)::float as "distanceMeters",
        m."businessNameFa",
        m."businessType",
        m."ratingAverage",
        m."ratingCount",
        m."verificationStatus"
      FROM "MerchantLocation" ml
      JOIN "Merchant" m ON m.id = ml."merchantId"
      WHERE ml.geom IS NOT NULL
        AND ST_DWithin(ml.geom, ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography, ${radiusMeters})
        AND m."verificationStatus" = 'APPROVED'::"VerificationStatus"
        ${businessTypeFilter}
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit};
    `;

    return results;
  }

  /**
   * Updates merchant verification status (Admin moderation)
   */
  async updateVerificationStatus(merchantId: string, status: VerificationStatus) {
    return await prisma.merchant.update({
      where: { id: merchantId },
      data: { verificationStatus: status },
    });
  }

  /**
   * Helper: Resolves the target merchant and enforces strict tenant authorization & RBAC
   */
  async resolveMerchantAndAuthorize(
    merchantUserId: string,
    merchantId?: string,
    minRole?: StaffRole
  ) {
    const user = await prisma.user.findUnique({ where: { id: merchantUserId }, select: { role: true, isActive: true } });
    if (!user?.isActive || !['MERCHANT_OWNER', 'MERCHANT_STAFF'].includes(user.role)) {
      throw new Error('عدم دسترسی: این بخش مخصوص حساب فروشنده است؛ مدیریت فروشگاه‌ها از پنل مدیریت انجام می‌شود');
    }
    // 1. If merchantId provided, verify user has access to it
    // If not provided, find the primary merchant for the user
    let targetMerchantId = merchantId;

    if (!targetMerchantId) {
      const owned = await prisma.merchant.findFirst({
        where: { ownerUserId: merchantUserId },
        select: { id: true },
      });
      if (owned) {
        targetMerchantId = owned.id;
      } else {
        const staffRec = await prisma.merchantStaff.findFirst({
          where: { userId: merchantUserId },
          select: { merchantId: true },
        });
        if (staffRec) {
          targetMerchantId = staffRec.merchantId;
        }
      }
    }

    if (!targetMerchantId) {
      throw new Error('عدم دسترسی: فروشگاهی برای این حساب کاربری یافت نشد');
    }

    if (!merchantId) {
      const other = await prisma.merchant.findFirst({ where: { id: { not: targetMerchantId },
        OR: [{ ownerUserId: merchantUserId }, { staff: { some: { userId: merchantUserId } } }] }, select: { id: true } });
      if (other && other.id !== targetMerchantId) throw new Error('عدم دسترسی: برای این حساب چند فروشگاه وجود دارد؛ فروشگاه را انتخاب کنید');
    }

    // 2. Load merchant with staff membership
    const merchant = await prisma.merchant.findUnique({
      where: { id: targetMerchantId },
      include: {
        staff: true,
        locations: {
          include: {
            city: true,
            hours: {
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
    });

    if (!merchant) {
      throw new Error('فروشگاه مورد نظر یافت نشد');
    }

    // 3. Check membership
    const isOwner = merchant.ownerUserId === merchantUserId;
    const staffMember = merchant.staff.find((s) => s.userId === merchantUserId);

    if (!isOwner && !staffMember) {
      throw new Error('عدم دسترسی: شما عضو کادر این فروشگاه نمی‌باشید');
    }

    const effectiveRole: StaffRole = isOwner ? StaffRole.OWNER : staffMember!.role;

    // 4. Role check if minRole is required
    if (minRole) {
      const roleWeight = {
        [StaffRole.CASHIER]: 1,
        [StaffRole.MANAGER]: 2,
        [StaffRole.OWNER]: 3,
      };

      if (roleWeight[effectiveRole] < roleWeight[minRole]) {
        throw new Error('عدم دسترسی: سطح دسترسی شما برای انجام این عملیات کافی نیست');
      }
    }

    return {
      merchant,
      staffMember,
      isOwner,
      role: effectiveRole,
    };
  }

  /**
   * CP-07.1: Fetches real-time Merchant Dashboard KPIs
   */
  async getDashboardStats(merchantUserId: string, merchantId?: string) {
    const { merchant } = await this.resolveMerchantAndAuthorize(merchantUserId, merchantId);

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Active Listings
    const activeListings = await prisma.listing.findMany({
      where: {
        merchantId: merchant.id,
        status: 'PUBLISHED',
        pickupEnd: { gt: now },
      },
      include: {
        inventory: true,
      },
    });

    const activeListingsCount = activeListings.length;
    const reservedBagsCount = activeListings.reduce(
      (sum, l) => sum + (l.inventory?.reservedQuantity || 0),
      0
    );

    // 2. Today's Orders
    const todayOrders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
        createdAt: { gte: startOfToday },
        status: { in: ['PAID', 'READY_FOR_PICKUP', 'COMPLETED'] },
      },
      include: {
        items: true,
      },
    });

    let soldTodayCount = 0;
    let grossRevenueTodayToman = 0;

    for (const ord of todayOrders) {
      grossRevenueTodayToman += Number(ord.totalAmountToman);
      for (const item of ord.items) {
        soldTodayCount += item.quantity;
      }
    }

    // 3. Pending pickups
    const pendingPickupsCount = await prisma.order.count({
      where: {
        merchantId: merchant.id,
        status: { in: ['PAID', 'READY_FOR_PICKUP'] },
      },
    });

    // Commission changes must not rewrite the amounts agreed at checkout.
    const netPayoutTodayToman = todayOrders.reduce((sum, order) => sum + Number(order.merchantPayoutAmountToman), 0);

    // 5. Next Pickup Window Alert
    let nextPickupWindow: {
      start: string;
      end: string;
      labelFa: string;
      startsInMinutes: number;
    } | null = null;

    const upcomingListing = activeListings.find(
      (l) => l.pickupStart && l.pickupStart.getTime() > now.getTime()
    );

    if (upcomingListing) {
      const diffMs = upcomingListing.pickupStart.getTime() - now.getTime();
      const diffMins = Math.max(0, Math.round(diffMs / (60 * 1000)));
      const sH = upcomingListing.pickupStart.getHours().toString().padStart(2, '0');
      const sM = upcomingListing.pickupStart.getMinutes().toString().padStart(2, '0');
      const eH = upcomingListing.pickupEnd.getHours().toString().padStart(2, '0');
      const eM = upcomingListing.pickupEnd.getMinutes().toString().padStart(2, '0');

      nextPickupWindow = {
        start: upcomingListing.pickupStart.toISOString(),
        end: upcomingListing.pickupEnd.toISOString(),
        labelFa: `ساعت ${sH}:${sM} الی ${eH}:${eM}`,
        startsInMinutes: diffMins,
      };
    } else if (merchant.locations[0]?.hours?.length) {
      const dayOfWeek = (now.getDay() + 1) % 7; // Convert JS 0=Sun..6=Sat to 0=Sat..6=Fri
      const todayHour = merchant.locations[0].hours.find((h) => h.dayOfWeek === dayOfWeek);
      if (todayHour && todayHour.isOpen && todayHour.defaultPickupStart && todayHour.defaultPickupEnd) {
        nextPickupWindow = {
          start: todayHour.defaultPickupStart,
          end: todayHour.defaultPickupEnd,
          labelFa: `ساعت ${todayHour.defaultPickupStart} الی ${todayHour.defaultPickupEnd}`,
          startsInMinutes: 0,
        };
      }
    }

    return {
      merchantId: merchant.id,
      businessNameFa: merchant.businessNameFa,
      bannerImageUrl: merchant.bannerImageUrl,
      verificationStatus: merchant.verificationStatus,
      activeListingsCount,
      reservedBagsCount,
      soldTodayCount,
      pendingPickupsCount,
      grossRevenueTodayToman,
      netPayoutTodayToman,
      ratingAverage: merchant.ratingAverage,
      ratingCount: merchant.ratingCount,
      nextPickupWindow,
    };
  }

  /**
   * CP-07.4 & CP-07.5: Gets Store Profile, Location Coordinates & 7-Day Operating Schedule
   */
  async getStoreSettings(merchantUserId: string, merchantId?: string) {
    const { merchant } = await this.resolveMerchantAndAuthorize(merchantUserId, merchantId);

    const primaryLoc = merchant.locations[0];
    const existingHours = primaryLoc?.hours || [];

    const DAY_NAMES_FA = [
      'شنبه',
      'یکشنبه',
      'دوشنبه',
      'سه‌شنبه',
      'چهارشنبه',
      'پنج‌شنبه',
      'جمعه',
    ];

    // Ensure all 7 days exist
    const fullHours = Array.from({ length: 7 }, (_, i) => {
      const match = existingHours.find((h) => h.dayOfWeek === i);
      if (match) {
        return {
          dayOfWeek: i,
          dayNameFa: DAY_NAMES_FA[i],
          isOpen: match.isOpen,
          storeOpenTime: match.storeOpenTime,
          storeCloseTime: match.storeCloseTime,
          defaultPickupStart: match.defaultPickupStart,
          defaultPickupEnd: match.defaultPickupEnd,
        };
      }
      return {
        dayOfWeek: i,
        dayNameFa: DAY_NAMES_FA[i],
        isOpen: i !== 6, // Default Friday closed or open
        storeOpenTime: '08:00',
        storeCloseTime: '22:00',
        defaultPickupStart: null,
        defaultPickupEnd: null,
      };
    });

    return {
      id: merchant.id,
      businessNameFa: merchant.businessNameFa,
      businessType: merchant.businessType,
      bannerImageUrl: merchant.bannerImageUrl,
      licenseNumber: merchant.licenseNumber,
      commissionPercent: Number(merchant.commissionPercent),
      verificationStatus: merchant.verificationStatus,
      ratingAverage: merchant.ratingAverage,
      ratingCount: merchant.ratingCount,
      primaryLocation: primaryLoc
        ? {
            id: primaryLoc.id,
            addressFa: primaryLoc.addressFa,
            phone: primaryLoc.phone,
            postalCode: primaryLoc.postalCode,
            latitude: primaryLoc.latitude,
            longitude: primaryLoc.longitude,
            cityId: primaryLoc.cityId,
            cityNameFa: primaryLoc.city?.nameFa,
          }
        : null,
      hours: fullHours,
    };
  }

  /**
   * CP-07.4 & CP-07.5: Updates Store Profile, Coordinates and 7-Day Schedule
   */
  async updateStoreSettings(
    merchantUserId: string,
    data: {
      businessNameFa?: string;
      bannerImageUrl?: string;
      phone?: string | null;
      addressFa?: string;
      postalCode?: string | null;
      latitude?: number;
      longitude?: number;
      hours?: Array<{
        dayOfWeek: number;
        isOpen: boolean;
        storeOpenTime: string;
        storeCloseTime: string;
        defaultPickupStart: string | null;
        defaultPickupEnd: string | null;
      }>;
    },
    merchantId?: string
  ) {
    const { merchant } = await this.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.MANAGER
    );

    return await prisma.$transaction(async (tx) => {
      // Cover URLs must refer to this merchant's uploaded photo, never a stock illustration.
      if (data.bannerImageUrl !== undefined) {
        if (!data.bannerImageUrl.startsWith(`/api/listing-images/${merchant.id}/`)) throw new Error('عکس جلد فروشگاه را از گالری خود بارگذاری کنید');
        await listingImageStorage.authorize(merchant.id, data.bannerImageUrl);
      }
      if (data.businessNameFa || data.bannerImageUrl) {
        await tx.merchant.update({
          where: { id: merchant.id },
          data: { businessNameFa: data.businessNameFa?.trim(), bannerImageUrl: data.bannerImageUrl },
        });
      }

      // 2. Update Primary Location
      const primaryLoc = merchant.locations[0];
      if (primaryLoc) {
        const updateLocData: Prisma.MerchantLocationUpdateInput = {};
        if (data.addressFa !== undefined) updateLocData.addressFa = data.addressFa;
        if (data.phone !== undefined) updateLocData.phone = data.phone;
        if (data.postalCode !== undefined) updateLocData.postalCode = data.postalCode;
        if (data.latitude !== undefined) updateLocData.latitude = data.latitude;
        if (data.longitude !== undefined) updateLocData.longitude = data.longitude;

        await tx.merchantLocation.update({
          where: { id: primaryLoc.id },
          data: updateLocData,
        });

        // 3. Update or Upsert Hours
        if (data.hours && data.hours.length > 0) {
          for (const h of data.hours) {
            await tx.merchantHours.upsert({
              where: {
                merchantLocationId_dayOfWeek: {
                  merchantLocationId: primaryLoc.id,
                  dayOfWeek: h.dayOfWeek,
                },
              },
              create: {
                merchantLocationId: primaryLoc.id,
                dayOfWeek: h.dayOfWeek,
                isOpen: h.isOpen,
                storeOpenTime: h.storeOpenTime,
                storeCloseTime: h.storeCloseTime,
                defaultPickupStart: h.defaultPickupStart,
                defaultPickupEnd: h.defaultPickupEnd,
              },
              update: {
                isOpen: h.isOpen,
                storeOpenTime: h.storeOpenTime,
                storeCloseTime: h.storeCloseTime,
                defaultPickupStart: h.defaultPickupStart,
                defaultPickupEnd: h.defaultPickupEnd,
              },
            });
          }
        }
      }

      return { success: true, message: 'تنظیمات فروشگاه با موفقیت بروزرسانی شد' };
    });
  }

  /**
   * CP-07.6: Gets Staff Members List (Owner or Manager only)
   */
  async getStaffList(merchantUserId: string, merchantId?: string) {
    const { merchant } = await this.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.MANAGER
    );

    const staffMembers = await prisma.merchantStaff.findMany({
      where: { merchantId: merchant.id },
      include: {
        user: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return staffMembers.map((sm) => ({
      id: sm.id,
      userId: sm.userId,
      mobile: sm.user.mobile,
      fullName: sm.user.customer?.fullName || null,
      role: sm.role,
      canScanPickup: sm.canScanPickup,
      createdAt: sm.createdAt.toISOString(),
    }));
  }

  /**
   * CP-07.6: Invites a new staff member by Iranian mobile number (Owner only)
   */
  async addStaffMember(
    merchantUserId: string,
    data: { mobile: string; fullName?: string; role: 'MANAGER' | 'CASHIER'; canScanPickup?: boolean },
    merchantId?: string
  ) {
    const { merchant } = await this.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.OWNER
    );

    const normalizedMobile = data.mobile;

    return withDatabaseService('invite', merchant.id, () => prisma.$transaction(async (tx) => {
      // 1. Find or create the user
      let user = await tx.user.findUnique({
        where: { mobile: normalizedMobile },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            mobile: normalizedMobile,
            role: 'MERCHANT_STAFF',
            customer: data.fullName
              ? {
                  create: {
                    fullName: data.fullName,
                  },
                }
              : undefined,
          },
        });
      }

      // 2. Check if already staff at this store
      const existingStaff = await tx.merchantStaff.findUnique({
        where: {
          merchantId_userId: {
            merchantId: merchant.id,
            userId: user.id,
          },
        },
      });

      if (existingStaff) {
        throw new Error('این شماره موبایل قبلاً به عنوان همکار در این فروشگاه ثبت شده است');
      }

      // Existing customers need the merchant role to enter the portal. Preserve higher roles.
      await tx.user.updateMany({
        where: { id: user.id, role: 'CUSTOMER' },
        data: { role: 'MERCHANT_STAFF' },
      });

      // 3. Create staff record
      const staffRecord = await tx.merchantStaff.create({
        data: {
          merchantId: merchant.id,
          userId: user.id,
          role: data.role as StaffRole,
          canScanPickup: data.canScanPickup ?? true,
        },
        include: {
          user: {
            include: { customer: true },
          },
        },
      });

      return {
        id: staffRecord.id,
        userId: user.id,
        mobile: user.mobile,
        fullName: staffRecord.user.customer?.fullName || data.fullName || null,
        role: staffRecord.role,
        canScanPickup: staffRecord.canScanPickup,
        createdAt: staffRecord.createdAt.toISOString(),
      };
    }), normalizedMobile);
  }

  /**
   * CP-07.6: Revokes a staff member (Owner only)
   */
  async removeStaffMember(merchantUserId: string, staffId: string, merchantId?: string) {
    const { merchant } = await this.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.OWNER
    );

    const targetStaff = await prisma.merchantStaff.findUnique({
      where: { id: staffId },
    });

    if (!targetStaff || targetStaff.merchantId !== merchant.id) {
      throw new Error('همکار مورد نظر در این فروشگاه یافت نشد');
    }

    if (targetStaff.userId === merchant.ownerUserId || targetStaff.role === StaffRole.OWNER) {
      throw new Error('امکان حذف مالک اصلی فروشگاه وجود ندارد');
    }

    await prisma.merchantStaff.delete({
      where: { id: staffId },
    });

    return { success: true, message: 'دسترسی همکار با موفقیت لغو شد' };
  }

  /**
   * CP-07.7: Financial & Settlement Statement (Owner only)
   */
  async getFinanceSummary(merchantUserId: string, merchantId?: string) {
    const { merchant } = await this.resolveMerchantAndAuthorize(
      merchantUserId,
      merchantId,
      StaffRole.OWNER
    );

    // 1. Fetch completed / paid orders
    const orders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
        status: { in: ['COMPLETED', 'PAID', 'READY_FOR_PICKUP', 'NO_SHOW'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let grossSalesToman = 0;
    const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length;

    for (const ord of orders) {
      grossSalesToman += Number(ord.totalAmountToman);
    }

    const commissionPercent = Number(merchant.commissionPercent ?? 10.0);
    const platformCommissionToman = orders.reduce((sum, order) => sum + Number(order.commissionAmountToman), 0);
    const netPayableBalanceToman = orders.reduce((sum, order) => sum + Number(order.merchantPayoutAmountToman), 0);

    // 2. Fetch double-entry ledger transactions
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        OR: [
          { type: 'CUSTOMER_PAYMENT' },
          { type: 'CUSTOMER_REFUND', debitAccount: 'PLATFORM_CLEARING', creditAccount: 'CUSTOMER_PAYMENT' },
        ],
        order: {
          merchantId: merchant.id,
        },
      },
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const ledgerEntries = transactions.map((tx) => {
      const sign = tx.type === 'CUSTOMER_REFUND' ? -1 : 1;
      const gross = sign * Number(tx.amountToman);
      const comm = sign * Number(tx.order?.commissionAmountToman ?? 0);
      const net = gross - comm;

      return {
        id: tx.id,
        orderId: tx.orderId,
        orderNumber: tx.order?.orderNumber || 'LQ-TRANSACTION',
        type: tx.type,
        descriptionFa: `${sign < 0 ? 'استرداد وجه' : 'پرداخت'} سفارش شماره ${tx.order?.orderNumber || ''}`,
        grossAmountToman: gross,
        commissionAmountToman: comm,
        netAmountToman: net,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    // 3. Check for approved default bank account and active payouts
    const defaultBank = (prisma as any).merchantBankAccount ? await (prisma as any).merchantBankAccount.findFirst({
      where: {
        merchantId: merchant.id,
        isDefault: true,
        status: 'APPROVED',
        isActive: true,
      },
    }) : null;

    const activePayouts = (prisma as any).merchantPayoutRequest ? await (prisma as any).merchantPayoutRequest.findMany({
      where: {
        merchantId: merchant.id,
        status: { in: ['COMPLETED', 'PENDING', 'APPROVED'] },
      },
      select: { amountToman: true },
    }) : [];
    const deductedPayouts = activePayouts.reduce((sum: number, p: any) => sum + Number(p.amountToman), 0);
    const effectiveNetPayable = Math.max(0, netPayableBalanceToman - deductedPayouts);

    return {
      merchantId: merchant.id,
      businessNameFa: merchant.businessNameFa,
      commissionPercent,
      grossSalesToman,
      platformCommissionToman,
      netPayableBalanceToman: effectiveNetPayable,
      totalOrdersCount: orders.length,
      completedOrdersCount,
      shabaNumber: defaultBank?.shabaNumber || null,
      isBankVerified: Boolean(defaultBank),
      transactions: ledgerEntries,
    };
  }
}

export const merchantService = new MerchantService();
