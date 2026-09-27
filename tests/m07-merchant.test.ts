import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FastCreateListingSchema,
  UpdateListingStockSchema,
  CreateStaffSchema,
  UpdateStoreSettingsSchema,
} from '@loqme/validation';
import { merchantService } from '@/domain/merchant/merchant.service';
import { listingService } from '@/domain/listing/listing.service';
import { prisma } from '@/lib/prisma';
import { StaffRole, ListingStatus, BusinessType, VerificationStatus } from '@prisma/client';

describe('Milestone M07 — Merchant Product & Management Portal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Zod Validation & Schema Integrity (CP-07.2, CP-07.3, CP-07.5, CP-07.6)
  // =========================================================================
  describe('1. Zod Validation & Schema Integrity', () => {
    it('validates correct fast listing input with price discount', () => {
      const validInput = { imageUrl: '/listing-defaults/bread.png',
        categorySlug: 'pastry',
        titleFa: 'بسته شیرینی عصرانه',
        descriptionFa: 'بسته تازه شیرینی دانمارکی و رولت خامه پخت امروز',
        originalPriceToman: 150000,
        discountedPriceToman: 75000,
        quantity: 5,
        pickupStart: '19:00',
        pickupEnd: '21:00',
      };

      const result = FastCreateListingSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('rejects listing where discounted price is greater than or equal to original price', () => {
      const invalidInputEqual = {
        titleFa: 'بسته نان تازه',
        descriptionFa: 'شامل چند عدد نان تازه تنوری',
        originalPriceToman: 50000,
        discountedPriceToman: 50000,
        quantity: 3,
      };
      expect(FastCreateListingSchema.safeParse(invalidInputEqual).success).toBe(false);

      const invalidInputGreater = {
        titleFa: 'بسته نان تازه',
        descriptionFa: 'شامل چند عدد نان تازه تنوری',
        originalPriceToman: 50000,
        discountedPriceToman: 60000,
        quantity: 3,
      };
      expect(FastCreateListingSchema.safeParse(invalidInputGreater).success).toBe(false);
    });

    it('validates staff creation with Iranian mobile number format', () => {
      const validStaff = {
        mobile: '09121112233',
        fullName: 'رضا کمالی',
        role: 'CASHIER' as const,
        canScanPickup: true,
      };

      const result = CreateStaffSchema.safeParse(validStaff);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mobile).toBe('09121112233');
      }
    });

    it('normalizes Persian digits and +98 prefix in staff mobile number', () => {
      const persianMobileStaff = {
        mobile: '+989123456789',
        role: 'MANAGER' as const,
      };

      const result = CreateStaffSchema.safeParse(persianMobileStaff);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mobile).toBe('09123456789');
      }
    });

    it('validates 7-day operating hours and coordinates schema', () => {
      const validSettings = {
        businessNameFa: 'نانوایی و قنادی نمونه',
        phone: '04433445566',
        addressFa: 'ارومیه، خیابان دانشکده، پلاک ۱۲',
        latitude: 37.5512,
        longitude: 45.0763,
        hours: [
          {
            dayOfWeek: 0,
            isOpen: true,
            storeOpenTime: '08:00',
            storeCloseTime: '22:00',
            defaultPickupStart: '20:00',
            defaultPickupEnd: '21:30',
          },
        ],
      };

      const result = UpdateStoreSettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. Active Listing & Stock Management (CP-07.3)
  // =========================================================================
  describe('2. Active Listing & Stock Management Domain', () => {
    const mockMerchantId = 'merchant-0001';
    const mockOtherMerchantId = 'merchant-0002';
    const mockListingId = 'listing-0001';

    it('toggles listing status between PUBLISHED and PAUSED with tenant security', async () => {
      vi.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: mockListingId,
        merchantId: mockMerchantId,
        status: ListingStatus.PUBLISHED,
      } as any);

      const updateSpy = vi.spyOn(prisma.listing, 'update').mockResolvedValue({
        id: mockListingId,
        merchantId: mockMerchantId,
        status: ListingStatus.PAUSED,
      } as any);

      const result = await listingService.toggleListingStatus(mockMerchantId, mockListingId);

      expect(result.status).toBe(ListingStatus.PAUSED);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: mockListingId },
        data: { status: ListingStatus.PAUSED },
        include: { inventory: true, safety: true, category: true },
      });
    });

    it('rejects status toggle if listing belongs to another merchant (Cross-Tenant Defense)', async () => {
      vi.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: mockListingId,
        merchantId: mockOtherMerchantId, // Belongs to Merchant 2
        status: ListingStatus.PUBLISHED,
      } as any);

      await expect(
        listingService.toggleListingStatus(mockMerchantId, mockListingId) // Called by Merchant 1
      ).rejects.toThrow('عدم دسترسی: این بسته متعلق به فروشگاه شما نمی‌باشد');
    });

    it('adjusts listing stock atomically and prevents stock going below reserved/sold count', async () => {
      vi.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: mockListingId,
        merchantId: mockMerchantId,
        status: ListingStatus.PUBLISHED,
        inventory: {
          id: 'inv-001',
          totalQuantity: 5,
          reservedQuantity: 2,
          soldQuantity: 1,
        },
      } as any);

      // Attempting to decrease stock by 3 would make total 2 (which is < 2 reserved + 1 sold = 3)
      await expect(
        listingService.adjustListingStock(mockMerchantId, mockListingId, { deltaQuantity: -3 })
      ).rejects.toThrow('موجودی کل نمی‌تواند کمتر از بسته‌های در حال رزرو یا فروخته‌شده');
    });

    it('successfully updates inventory and marks SOLD_OUT when total equals sold', async () => {
      vi.spyOn(prisma.listing, 'findUnique').mockResolvedValue({
        id: mockListingId,
        merchantId: mockMerchantId,
        status: ListingStatus.PUBLISHED,
        inventory: {
          id: 'inv-001',
          totalQuantity: 5,
          reservedQuantity: 0,
          soldQuantity: 3,
        },
      } as any);

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          listingInventory: {
            update: vi.fn().mockResolvedValue({
              id: 'inv-001',
              totalQuantity: 3,
              version: 2,
            }),
          },
          listing: {
            update: vi.fn().mockResolvedValue({
              id: mockListingId,
              status: ListingStatus.SOLD_OUT,
            }),
          },
        });
      });

      const result = await listingService.adjustListingStock(mockMerchantId, mockListingId, {
        totalQuantity: 3, // equals soldQuantity -> transitions to SOLD_OUT
      });

      expect(result.status).toBe(ListingStatus.SOLD_OUT);
      expect(result.inventory.totalQuantity).toBe(3);
    });
  });

  // =========================================================================
  // 3. Real-Time Dashboard KPIs & Financial Calculations (CP-07.1 & CP-07.7)
  // =========================================================================
  describe('3. Real-Time Dashboard KPIs & Financial Settlement', () => {
    const ownerUserId = 'user-owner-001';
    const merchantId = 'merchant-0001';

    beforeEach(() => {
      vi.spyOn(merchantService, 'resolveMerchantAndAuthorize').mockResolvedValue({
        merchant: {
          id: merchantId,
          ownerUserId,
          businessNameFa: 'قنادی ماه بانو',
          businessType: BusinessType.BAKERY,
          verificationStatus: VerificationStatus.APPROVED,
          commissionPercent: 10.0,
          ratingAverage: 4.9,
          ratingCount: 85,
          locations: [
            {
              id: 'loc-01',
              addressFa: 'ارومیه، خیابان امام',
              hours: [],
            },
          ],
        },
        staffMember: undefined,
        isOwner: true,
        role: StaffRole.OWNER,
      } as any);
    });

    it('computes accurate real-time dashboard KPIs including 10% commission net payout', async () => {
      // 1. Mock active listings
      vi.spyOn(prisma.listing, 'findMany').mockResolvedValue([
        { id: 'l1', inventory: { totalQuantity: 10, reservedQuantity: 2 } },
        { id: 'l2', inventory: { totalQuantity: 5, reservedQuantity: 1 } },
      ] as any);

      // 2. Mock today orders (Gross = 300,000 Toman)
      vi.spyOn(prisma.order, 'findMany').mockResolvedValue([
        {
          id: 'o1',
          totalAmountToman: BigInt(200000),
          items: [{ quantity: 2 }],
        },
        {
          id: 'o2',
          totalAmountToman: BigInt(100000),
          items: [{ quantity: 1 }],
        },
      ] as any);

      // 3. Mock pending pickups count
      vi.spyOn(prisma.order, 'count').mockResolvedValue(2);

      const stats = await merchantService.getDashboardStats(ownerUserId, merchantId);

      expect(stats.activeListingsCount).toBe(2);
      expect(stats.reservedBagsCount).toBe(3); // 2 + 1
      expect(stats.soldTodayCount).toBe(3); // 2 + 1
      expect(stats.pendingPickupsCount).toBe(2);
      expect(stats.grossRevenueTodayToman).toBe(300000);

      // 10% Platform Commission: 300,000 * 10% = 30,000
      // Net Payout: 300,000 - 30,000 = 270,000 Toman
      expect(stats.netPayoutTodayToman).toBe(270000);
      expect(stats.ratingAverage).toBe(4.9);
      expect(stats.ratingCount).toBe(85);
    });

    it('calculates settlement statement with double-entry ledger history', async () => {
      vi.spyOn(prisma.order, 'findMany').mockResolvedValue([
        { id: 'o1', totalAmountToman: BigInt(100000), status: 'COMPLETED' },
        { id: 'o2', totalAmountToman: BigInt(50000), status: 'COMPLETED' },
      ] as any);

      vi.spyOn(prisma.financialTransaction, 'findMany').mockResolvedValue([
        {
          id: 'tx-1',
          orderId: 'o1',
          amountToman: BigInt(100000),
          type: 'ORDER_PAYMENT',
          createdAt: new Date(),
          order: { orderNumber: 'LQ-1001' },
        },
      ] as any);

      const finance = await merchantService.getFinanceSummary(ownerUserId, merchantId);

      expect(finance.grossSalesToman).toBe(150000);
      expect(finance.platformCommissionToman).toBe(15000); // 10%
      expect(finance.netPayableBalanceToman).toBe(135000); // 90%
      expect(finance.completedOrdersCount).toBe(2);
      expect(finance.transactions.length).toBe(1);
      expect(finance.transactions[0].grossAmountToman).toBe(100000);
      expect(finance.transactions[0].commissionAmountToman).toBe(10000);
      expect(finance.transactions[0].netAmountToman).toBe(90000);
    });
  });

  // =========================================================================
  // 4. Staff Management & Multi-Tenant Access Control (CP-07.6 & CP-07.8)
  // =========================================================================
  describe('4. Staff Management & Tenant Security Boundaries', () => {
    const ownerUserId = 'user-owner-001';
    const strangerUserId = 'user-stranger-999';
    const merchantId = 'merchant-0001';

    it('allows store owner to invite a new cashier staff member by mobile', async () => {
      vi.spyOn(merchantService, 'resolveMerchantAndAuthorize').mockResolvedValue({
        merchant: { id: merchantId, ownerUserId },
        isOwner: true,
        role: StaffRole.OWNER,
      } as any);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-002',
        mobile: '09141112233',
        fullName: 'سارا احمدی',
        role: 'MERCHANT_STAFF',
      } as any);

      vi.spyOn(prisma.merchantStaff, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.merchantStaff, 'create').mockResolvedValue({
        id: 'staff-rec-002',
        merchantId,
        userId: 'new-user-002',
        role: StaffRole.CASHIER,
        canScanPickup: true,
        createdAt: new Date(),
        user: {
          id: 'new-user-002',
          mobile: '09141112233',
          fullName: 'سارا احمدی',
        },
      } as any);

      const result = await merchantService.addStaffMember(ownerUserId, {
        mobile: '09141112233',
        fullName: 'سارا احمدی',
        role: 'CASHIER',
        canScanPickup: true,
      });

      expect(result.role).toBe('CASHIER');
      expect(result.mobile).toBe('09141112233');
      expect(result.canScanPickup).toBe(true);
    });

    it('prevents duplicate staff invitation with the same mobile number', async () => {
      vi.spyOn(merchantService, 'resolveMerchantAndAuthorize').mockResolvedValue({
        merchant: { id: merchantId, ownerUserId },
        isOwner: true,
        role: StaffRole.OWNER,
      } as any);

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'existing-user-001',
        mobile: '09141112233',
      } as any);

      vi.spyOn(prisma.merchantStaff, 'findUnique').mockResolvedValue({
        id: 'staff-rec-001',
      } as any);

      await expect(
        merchantService.addStaffMember(ownerUserId, {
          mobile: '09141112233',
          role: 'CASHIER',
        })
      ).rejects.toThrow('این شماره موبایل قبلاً به عنوان همکار در این فروشگاه ثبت شده است');
    });

    it('prevents revoking the store owner', async () => {
      vi.spyOn(merchantService, 'resolveMerchantAndAuthorize').mockResolvedValue({
        merchant: { id: merchantId, ownerUserId },
        isOwner: true,
        role: StaffRole.OWNER,
      } as any);

      vi.spyOn(prisma.merchantStaff, 'findUnique').mockResolvedValue({
        id: 'staff-owner-id',
        merchantId,
        userId: ownerUserId, // The store owner!
        role: StaffRole.OWNER,
      } as any);

      await expect(
        merchantService.removeStaffMember(ownerUserId, 'staff-owner-id', merchantId)
      ).rejects.toThrow('امکان حذف مالک اصلی فروشگاه وجود ندارد');
    });

    it('rejects access if user does not belong to the target store (Tenant Isolation)', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ role: 'MERCHANT_OWNER', isActive: true } as any);
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
        id: merchantId,
        ownerUserId: 'real-owner-id',
        staff: [],
      } as any);

      await expect(
        merchantService.resolveMerchantAndAuthorize(strangerUserId, merchantId)
      ).rejects.toThrow('عدم دسترسی: شما عضو کادر این فروشگاه نمی‌باشید');
    });
  });
});
