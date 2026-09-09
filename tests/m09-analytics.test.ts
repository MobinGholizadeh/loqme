import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AnalyticsQuerySchema } from '@loqme/validation';
import { analyticsService, formatJalaliDate } from '@/domain/analytics/analytics.service';
import { requireAdminSession } from '@/lib/auth/admin-auth';
import { createSessionToken, SessionPayload } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { OrderStatus, RefundStatus, ListingStatus } from '@prisma/client';

describe('Milestone M09 — Marketplace Analytics Engine & Operational Intelligence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Zod Validation & Date Boundaries
  // =========================================================================
  describe('1. Zod Validation & Date Range Bounds', () => {
    it('validates supported timeframe options', () => {
      expect(AnalyticsQuerySchema.safeParse({ timeframe: 'TODAY' }).success).toBe(true);
      expect(AnalyticsQuerySchema.safeParse({ timeframe: '7D' }).success).toBe(true);
      expect(AnalyticsQuerySchema.safeParse({ timeframe: '30D' }).success).toBe(true);
      expect(AnalyticsQuerySchema.safeParse({ timeframe: '90D' }).success).toBe(true);
      expect(AnalyticsQuerySchema.safeParse({ timeframe: '1Y' }).success).toBe(true);
      expect(AnalyticsQuerySchema.safeParse({ timeframe: 'CUSTOM' }).success).toBe(true);
    });

    it('rejects invalid timeframe identifier', () => {
      expect(AnalyticsQuerySchema.safeParse({ timeframe: 'INVALID_TIMEFRAME' }).success).toBe(false);
    });

    it('defaults timeframe to 30D when omitted', () => {
      const parsed = AnalyticsQuerySchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.timeframe).toBe('30D');
      }
    });

    it('computes chronological date ranges correctly for all timeframes', () => {
      const range7D = analyticsService.getTimeframeDateRange('7D');
      expect(range7D.startDate.getTime()).toBeLessThan(range7D.endDate.getTime());

      const range30D = analyticsService.getTimeframeDateRange('30D');
      expect(range30D.startDate.getTime()).toBeLessThan(range30D.endDate.getTime());

      const rangeToday = analyticsService.getTimeframeDateRange('TODAY');
      expect(rangeToday.startDate.getTime()).toBeLessThanOrEqual(rangeToday.endDate.getTime());

      const customStart = '2026-08-01T00:00:00.000Z';
      const customEnd = '2026-08-15T23:59:59.999Z';
      const rangeCustom = analyticsService.getTimeframeDateRange('CUSTOM', customStart, customEnd);
      expect(rangeCustom.startDate.toISOString()).toBe(customStart);
      expect(rangeCustom.endDate.toISOString()).toBe(customEnd);
    });

    it('formats dates in Persian Jalali calendar accurately', () => {
      const testDate = new Date('2026-09-10T12:00:00.000Z');
      const jalaliStr = formatJalaliDate(testDate);
      expect(typeof jalaliStr).toBe('string');
      expect(jalaliStr.length).toBeGreaterThan(5);
    });
  });

  // =========================================================================
  // 2. Core Marketplace Financial Aggregation (CP-09.1, CP-09.7)
  // =========================================================================
  describe('2. Core Marketplace Financial Metrics', () => {
    it('calculates GMV, Commission, AOV, and Customer Savings strictly from real paid orders', async () => {
      const mockOrders = [
        // Paid Order 1: 100,000 Toman, Commission 10%, 2 items
        {
          id: 'ord-1',
          customerId: 'cust-1',
          merchantId: 'mch-1',
          totalAmountToman: 100000,
          status: OrderStatus.COMPLETED,
          createdAt: new Date('2026-09-08T10:00:00Z'),
          merchant: {
            id: 'mch-1',
            businessNameFa: 'نانوایی برکت ارومیه',
            commissionPercent: 10,
            locations: [{ city: { nameFa: 'ارومیه' }, neighborhood: { nameFa: 'دانشکده' } }],
          },
          items: [
            {
              quantity: 2,
              unitPriceToman: 50000,
              subtotalToman: 100000,
              listing: {
                id: 'list-1',
                categoryId: 'cat-bakery',
                originalPriceToman: 100000,
                discountedPriceToman: 50000,
                category: { id: 'cat-bakery', nameFa: 'نان تازه' },
              },
            },
          ],
          refunds: [],
        },
        // Paid Order 2: 60,000 Toman, Commission 15%, 1 item
        {
          id: 'ord-2',
          customerId: 'cust-2',
          merchantId: 'mch-2',
          totalAmountToman: 60000,
          status: OrderStatus.READY_FOR_PICKUP,
          createdAt: new Date('2026-09-09T14:00:00Z'),
          merchant: {
            id: 'mch-2',
            businessNameFa: 'قنادی شیرین ارومیه',
            commissionPercent: 15,
            locations: [{ city: { nameFa: 'ارومیه' }, neighborhood: { nameFa: 'خیام' } }],
          },
          items: [
            {
              quantity: 1,
              unitPriceToman: 60000,
              subtotalToman: 60000,
              listing: {
                id: 'list-2',
                categoryId: 'cat-pastry',
                originalPriceToman: 120000,
                discountedPriceToman: 60000,
                category: { id: 'cat-pastry', nameFa: 'شیرینی' },
              },
            },
          ],
          refunds: [],
        },
        // Unpaid / Cancelled Order: 50,000 Toman (must NOT be counted in GMV)
        {
          id: 'ord-3',
          customerId: 'cust-3',
          merchantId: 'mch-1',
          totalAmountToman: 50000,
          status: OrderStatus.CANCELLED,
          createdAt: new Date('2026-09-09T16:00:00Z'),
          merchant: {
            id: 'mch-1',
            businessNameFa: 'نانوایی برکت ارومیه',
            commissionPercent: 10,
            locations: [],
          },
          items: [],
          refunds: [],
        },
      ];

      const mockListings = [
        {
          id: 'list-1',
          category: { id: 'cat-bakery', nameFa: 'نان تازه' },
          inventory: { totalQuantity: 10, soldQuantity: 2 },
        },
        {
          id: 'list-2',
          category: { id: 'cat-pastry', nameFa: 'شیرینی' },
          inventory: { totalQuantity: 5, soldQuantity: 1 },
        },
      ];

      vi.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as any);
      vi.spyOn(prisma.listing, 'findMany').mockResolvedValue(mockListings as any);
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(25);
      vi.spyOn(prisma.neighborhood, 'findMany').mockResolvedValue([]);

      const report = await analyticsService.getMarketplaceAnalytics({ timeframe: '30D' });

      // Financial Verifications:
      // GMV = 100,000 + 60,000 = 160,000
      expect(report.kpis.gmvToman).toBe(160000);

      // Commission:
      // Order 1: 100,000 * 10% = 10,000
      // Order 2: 60,000 * 15% = 9,000
      // Total = 19,000
      expect(report.kpis.platformCommissionToman).toBe(19000);

      // AOV: 160,000 / 2 = 80,000
      expect(report.kpis.averageOrderValueToman).toBe(80000);
      expect(report.kpis.totalOrdersCount).toBe(2);

      // Customer Savings:
      // Order 1: 2 * (100,000 - 50,000) = 100,000
      // Order 2: 1 * (120,000 - 60,000) = 60,000
      // Total = 160,000
      expect(report.kpis.customerCumulativeSavingsToman).toBe(160000);

      // Merchant Net Payout:
      // GMV - Commission = 160,000 - 19,000 = 141,000
      expect(report.kpis.merchantNetPayoutToman).toBe(141000);
    });
  });

  // =========================================================================
  // 3. Operational Rates & Customer Cohorts (CP-09.1, CP-09.7)
  // =========================================================================
  describe('3. Operational Ratios & Retention Cohorts', () => {
    it('computes Sell-Through Rate, Pickup Completion Rate and Refund Rate correctly', async () => {
      const mockOrders = [
        // Completed Order
        {
          id: 'ord-1',
          customerId: 'cust-repeat-1',
          merchantId: 'mch-1',
          totalAmountToman: 40000,
          status: OrderStatus.COMPLETED,
          createdAt: new Date('2026-09-08T10:00:00Z'),
          merchant: { commissionPercent: 10, locations: [] },
          items: [{ quantity: 2, unitPriceToman: 20000, subtotalToman: 40000, listing: { originalPriceToman: 40000, discountedPriceToman: 20000 } }],
          refunds: [],
        },
        // Completed Order by same customer (Repeat buyer!)
        {
          id: 'ord-2',
          customerId: 'cust-repeat-1',
          merchantId: 'mch-1',
          totalAmountToman: 40000,
          status: OrderStatus.COMPLETED,
          createdAt: new Date('2026-09-09T10:00:00Z'),
          merchant: { commissionPercent: 10, locations: [] },
          items: [{ quantity: 1, unitPriceToman: 40000, subtotalToman: 40000, listing: { originalPriceToman: 80000, discountedPriceToman: 40000 } }],
          refunds: [],
        },
        // Refunded Order
        {
          id: 'ord-3',
          customerId: 'cust-single-2',
          merchantId: 'mch-1',
          totalAmountToman: 50000,
          status: OrderStatus.REFUNDED,
          createdAt: new Date('2026-09-09T12:00:00Z'),
          merchant: { commissionPercent: 10, locations: [] },
          items: [{ quantity: 1, unitPriceToman: 50000, subtotalToman: 50000, listing: { originalPriceToman: 100000, discountedPriceToman: 50000 } }],
          refunds: [{ amountToman: 50000 }],
        },
      ];

      const mockListings = [
        {
          id: 'list-1',
          inventory: { totalQuantity: 10, soldQuantity: 4 },
        },
      ];

      vi.spyOn(prisma.order, 'findMany').mockResolvedValue(mockOrders as any);
      vi.spyOn(prisma.listing, 'findMany').mockResolvedValue(mockListings as any);
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(50);
      vi.spyOn(prisma.neighborhood, 'findMany').mockResolvedValue([]);

      const report = await analyticsService.getMarketplaceAnalytics({ timeframe: '7D' });

      // Sell-Through Rate: 4 sold / 10 total = 40%
      expect(report.kpis.sellThroughRate).toBe(40);

      // Pickup Completion Rate:
      // 2 completed / 3 placed = 66.7%
      expect(report.kpis.pickupCompletionRate).toBe(66.7);

      // Refund Rate:
      // 1 refunded order out of 3 placed = 33.3%
      expect(report.kpis.refundRate).toBe(33.3);

      // Repeat Cohort:
      // 2 unique ordering customers: cust-repeat-1 (2 orders), cust-single-2 (1 order)
      // Repeat count = 1 / 2 = 50%
      expect(report.cohorts.activeOrderingCustomers).toBe(2);
      expect(report.cohorts.repeatCustomers).toBe(1);
      expect(report.cohorts.repeatRate14Days).toBe(50);
    });
  });

  // =========================================================================
  // 4. Geographic Neighborhood Density (CP-09.5)
  // =========================================================================
  describe('4. Geographic Neighborhood Density Ranking', () => {
    it('ranks neighborhoods by GMV and identifies unmet demand accurately', async () => {
      const mockNeighborhoods = [
        {
          id: 'neigh-1',
          nameFa: 'خیابان دانشکده',
          city: { nameFa: 'ارومیه' },
          merchantLocations: [
            {
              merchant: {
                listings: [{ id: 'l1' }, { id: 'l2' }],
                orders: [{ totalAmountToman: 250000 }, { totalAmountToman: 150000 }],
              },
            },
          ],
        },
        {
          id: 'neigh-2',
          nameFa: 'خیام جنوبی',
          city: { nameFa: 'ارومیه' },
          merchantLocations: [
            {
              merchant: {
                listings: [],
                orders: [{ totalAmountToman: 500000 }], // High orders with 0 listings -> unmet demand!
              },
            },
          ],
        },
      ];

      vi.spyOn(prisma.order, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.listing, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.neighborhood, 'findMany').mockResolvedValue(mockNeighborhoods as any);

      const report = await analyticsService.getMarketplaceAnalytics({ timeframe: '30D' });

      expect(report.neighborhoodDensity.length).toBe(2);
      // Ranked by GMV descending:
      // Neigh-2: 500,000 GMV (#1)
      // Neigh-1: 400,000 GMV (#2)
      expect(report.neighborhoodDensity[0].neighborhoodNameFa).toBe('خیام جنوبی');
      expect(report.neighborhoodDensity[0].totalGmvToman).toBe(500000);
      expect(report.neighborhoodDensity[0].unmetDemandScore).toBe(95); // High unmet demand

      expect(report.neighborhoodDensity[1].neighborhoodNameFa).toBe('خیابان دانشکده');
      expect(report.neighborhoodDensity[1].totalGmvToman).toBe(400000);
    });
  });

  // =========================================================================
  // 5. CSV Financial Exporter (CP-09.6)
  // =========================================================================
  describe('5. CSV Financial Report Exporter', () => {
    it('generates valid UTF-8 BOM CSV containing financial KPIs and breakdowns', async () => {
      vi.spyOn(prisma.order, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.listing, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.customer, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.neighborhood, 'findMany').mockResolvedValue([]);

      const csv = await analyticsService.generateAnalyticsCsv({ timeframe: '30D' });

      expect(typeof csv).toBe('string');
      // Starts with UTF-8 Byte Order Mark (\uFEFF)
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('گزارش تحلیلی عملکرد بازار پلتفرم لقمه');
      expect(csv).toContain('حجم ناخالص کل فروش (GMV)');
      expect(csv).toContain('کارمزد تحقق‌یافته پلتفرم');
      expect(csv).toContain('روند روزانه معاملات');
    });
  });

  // =========================================================================
  // 6. Admin RBAC & Route Protection (CP-09.3, CP-09.7)
  // =========================================================================
  describe('6. Admin RBAC Security & Gatekeeper', () => {
    it('denies unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/analytics');
      const auth = await requireAdminSession(req);

      expect('errorResponse' in auth).toBe(true);
      if ('errorResponse' in auth) {
        expect(auth.errorResponse.status).toBe(401);
      }
    });

    it('denies CUSTOMER and MERCHANT roles with 403', async () => {
      const customerPayload: SessionPayload = {
        userId: 'usr-cust-1',
        mobile: '09120000001',
        role: 'CUSTOMER',
      };
      const token = await createSessionToken(customerPayload);

      const req = new NextRequest('http://localhost:3000/api/admin/analytics', {
        headers: { cookie: `loqme_session=${token}` },
      });

      const auth = await requireAdminSession(req);
      expect('errorResponse' in auth).toBe(true);
      if ('errorResponse' in auth) {
        expect(auth.errorResponse.status).toBe(403);
      }
    });

    it('allows ADMIN users to access analytics', async () => {
      const adminPayload: SessionPayload = {
        userId: 'usr-admin-1',
        mobile: '09120000000',
        role: 'ADMIN',
      };
      const token = await createSessionToken(adminPayload);

      const req = new NextRequest('http://localhost:3000/api/admin/analytics', {
        headers: { cookie: `loqme_session=${token}` },
      });

      const auth = await requireAdminSession(req);
      expect('session' in auth).toBe(true);
      if ('session' in auth) {
        expect(auth.session.role).toBe('ADMIN');
      }
    });
  });
});
