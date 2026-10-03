import { prisma } from '@/lib/prisma';
import { csvRow } from '@/lib/utils/csv';
import { OrderStatus, RefundStatus, ListingStatus } from '@prisma/client';
import {
  AnalyticsTimeframe,
  MarketplaceAnalyticsReportDto,
  MarketplaceAnalyticsKpiDto,
  DailyAnalyticsTrendPointDto,
  CategoryDistributionDto,
  NeighborhoodDensityDto,
  CustomerCohortAnalyticsDto,
} from '@loqme/types';
import { AnalyticsQueryInput } from '@loqme/validation';

/**
 * Format standard JavaScript Date into Solar Hijri (Jalali) Persian date string (e.g. ۱۴۰۳/۰۶/۲۰)
 */
export function formatJalaliDate(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toLocaleDateString('fa-IR');
  }
}

export class AnalyticsService {
  /**
   * CP-09.1: Calculate exact start and end date boundaries for selectable timeframes
   */
  getTimeframeDateRange(
    timeframe: AnalyticsTimeframe = '30D',
    customStart?: string,
    customEnd?: string
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = customEnd ? new Date(customEnd) : new Date(now);

    let startDate: Date;

    switch (timeframe) {
      case 'TODAY': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      }
      case '7D': {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      }
      case '30D': {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      }
      case '90D': {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      }
      case '1Y': {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      }
      case 'CUSTOM': {
        startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      }
      default: {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate, endDate };
  }

  /**
   * CP-09.1, CP-09.2, CP-09.3, CP-09.4, CP-09.5: Comprehensive Marketplace Analytics Aggregation
   */
  async getMarketplaceAnalytics(filter: AnalyticsQueryInput): Promise<MarketplaceAnalyticsReportDto> {
    const { startDate, endDate } = this.getTimeframeDateRange(
      filter.timeframe as AnalyticsTimeframe,
      filter.startDate,
      filter.endDate
    );

    // 1. Fetch Orders within date range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(filter.merchantId ? { merchantId: filter.merchantId } : {}),
      },
      include: {
        items: {
          include: {
            listing: {
              select: {
                id: true,
                categoryId: true,
                originalPriceToman: true,
                discountedPriceToman: true,
                category: { select: { id: true, nameFa: true } },
              },
            },
          },
        },
        merchant: {
          select: {
            id: true,
            businessNameFa: true,
            commissionPercent: true,
            locations: {
              include: { city: true, neighborhood: true },
              take: 1,
            },
          },
        },
        refunds: {
          where: { status: { in: [RefundStatus.APPROVED, RefundStatus.SETTLED] } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch Listings created or active in date range
    const listings = await prisma.listing.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(filter.merchantId ? { merchantId: filter.merchantId } : {}),
      },
      include: {
        inventory: true,
        category: { select: { id: true, nameFa: true } },
      },
    });

    // -------------------------------------------------------------------------
    // A. Financial & Core KPIs
    // -------------------------------------------------------------------------
    const paidStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.COMPLETED,
      OrderStatus.REFUNDED,
      OrderStatus.NO_SHOW,
    ];

    const paidOrders = orders.filter((o) => paidStatuses.includes(o.status));
    const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED);
    const refundedOrders = orders.filter(
      (o) => o.status === OrderStatus.REFUNDED || (o.refunds && o.refunds.length > 0)
    );

    let totalGmvToman = 0;
    let totalPlatformCommissionToman = 0;
    let totalRefundsToman = 0;
    let totalCustomerSavingsToman = 0;
    let totalBagsSold = 0;

    for (const ord of paidOrders) {
      const ordAmount = Number(ord.totalAmountToman);
      totalGmvToman += ordAmount;

      const commRate = Number(ord.merchant.commissionPercent) || 10.0;
      totalPlatformCommissionToman += Math.round((ordAmount * commRate) / 100);

      for (const ref of ord.refunds) {
        totalRefundsToman += Number(ref.amountToman);
      }

      for (const item of ord.items) {
        totalBagsSold += item.quantity;
        const orig = Number(item.listing?.originalPriceToman || 0);
        const disc = Number(item.listing?.discountedPriceToman || item.unitPriceToman);
        if (orig > disc) {
          totalCustomerSavingsToman += item.quantity * (orig - disc);
        }
      }
    }

    const totalOrdersCount = paidOrders.length;
    const averageOrderValueToman =
      totalOrdersCount > 0 ? Math.round(totalGmvToman / totalOrdersCount) : 0;
    const merchantNetPayoutToman = Math.max(
      0,
      totalGmvToman - totalPlatformCommissionToman - totalRefundsToman
    );

    // -------------------------------------------------------------------------
    // B. Operational Ratios (Sell-Through, Pickup Rate, Refund Rate)
    // -------------------------------------------------------------------------
    let totalPublishedBags = 0;
    let inventorySoldBags = 0;
    for (const l of listings) {
      if (l.inventory) {
        totalPublishedBags += l.inventory.totalQuantity;
        inventorySoldBags += l.inventory.soldQuantity;
      }
    }

    const effectiveSoldBags = Math.max(totalBagsSold, inventorySoldBags);
    const sellThroughRate =
      totalPublishedBags > 0
        ? Math.min(100, Math.round((effectiveSoldBags / totalPublishedBags) * 1000) / 10)
        : effectiveSoldBags > 0
        ? 100
        : 0;

    const pickupCompletionRate =
      totalOrdersCount > 0
        ? Math.round((completedOrders.length / totalOrdersCount) * 1000) / 10
        : 0;

    const refundRate =
      totalOrdersCount > 0
        ? Math.round((refundedOrders.length / totalOrdersCount) * 1000) / 10
        : 0;

    // -------------------------------------------------------------------------
    // C. Customer Repeat Cohort & Retention
    // -------------------------------------------------------------------------
    const customerOrdersMap = new Map<string, number>();
    for (const ord of paidOrders) {
      customerOrdersMap.set(ord.customerId, (customerOrdersMap.get(ord.customerId) || 0) + 1);
    }

    const activeOrderingCustomers = customerOrdersMap.size;
    let repeatCustomers = 0;
    Array.from(customerOrdersMap.values()).forEach((orderCount) => {
      if (orderCount >= 2) {
        repeatCustomers++;
      }
    });

    const repeatCustomerRate =
      activeOrderingCustomers > 0
        ? Math.round((repeatCustomers / activeOrderingCustomers) * 1000) / 10
        : 0;

    const totalCustomers = await prisma.customer.count();

    const cohorts: CustomerCohortAnalyticsDto = {
      totalCustomers,
      activeOrderingCustomers,
      repeatCustomers,
      repeatRate14Days: repeatCustomerRate,
      repeatRate30Days: repeatCustomerRate,
    };

    const kpis: MarketplaceAnalyticsKpiDto = {
      gmvToman: totalGmvToman,
      platformCommissionToman: totalPlatformCommissionToman,
      averageOrderValueToman,
      totalOrdersCount,
      totalBagsSold: effectiveSoldBags,
      customerCumulativeSavingsToman: totalCustomerSavingsToman,
      merchantNetPayoutToman,
      sellThroughRate,
      pickupCompletionRate,
      refundRate,
      repeatCustomerRate,
    };

    // -------------------------------------------------------------------------
    // D. Daily Time-Series Trend Points
    // -------------------------------------------------------------------------
    const dailyMap = new Map<
      string,
      { gmv: number; orders: number; commission: number; bags: number; dateObj: Date }
    >();

    for (const ord of paidOrders) {
      const dateKey = ord.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(dateKey) || {
        gmv: 0,
        orders: 0,
        commission: 0,
        bags: 0,
        dateObj: ord.createdAt,
      };

      const amt = Number(ord.totalAmountToman);
      existing.gmv += amt;
      existing.orders += 1;
      const commRate = Number(ord.merchant.commissionPercent) || 10.0;
      existing.commission += Math.round((amt * commRate) / 100);

      for (const itm of ord.items) {
        existing.bags += itm.quantity;
      }

      dailyMap.set(dateKey, existing);
    }

    // Sort chronologically
    const sortedKeys = Array.from(dailyMap.keys()).sort();
    const dailyTrends: DailyAnalyticsTrendPointDto[] = sortedKeys.map((key) => {
      const data = dailyMap.get(key)!;
      return {
        dateIso: key,
        dateFa: formatJalaliDate(data.dateObj),
        gmvToman: data.gmv,
        ordersCount: data.orders,
        commissionToman: data.commission,
        soldBags: data.bags,
      };
    });

    // -------------------------------------------------------------------------
    // E. Category Distribution Breakdown
    // -------------------------------------------------------------------------
    const categoryMap = new Map<
      string,
      { nameFa: string; listingsCount: number; soldBags: number; gmv: number }
    >();

    // Register active categories from listings
    for (const l of listings) {
      const catId = l.category?.id || 'uncategorized';
      const catName = l.category?.nameFa || 'سایر دسته‌ها';
      const entry = categoryMap.get(catId) || {
        nameFa: catName,
        listingsCount: 0,
        soldBags: 0,
        gmv: 0,
      };
      entry.listingsCount += 1;
      categoryMap.set(catId, entry);
    }

    // Accumulate sold bags & revenue per category from paid order items
    for (const ord of paidOrders) {
      for (const itm of ord.items) {
        const catId = itm.listing?.category?.id || 'uncategorized';
        const catName = itm.listing?.category?.nameFa || 'سایر دسته‌ها';
        const entry = categoryMap.get(catId) || {
          nameFa: catName,
          listingsCount: 0,
          soldBags: 0,
          gmv: 0,
        };
        entry.soldBags += itm.quantity;
        entry.gmv += Number(itm.subtotalToman || Number(itm.unitPriceToman) * itm.quantity);
        categoryMap.set(catId, entry);
      }
    }

    const categoryDistribution: CategoryDistributionDto[] = Array.from(
      categoryMap.entries()
    ).map(([catId, data]) => ({
      categoryId: catId,
      categoryNameFa: data.nameFa,
      listingsCount: data.listingsCount,
      soldBagsCount: data.soldBags,
      gmvToman: data.gmv,
      percentage:
        totalGmvToman > 0
          ? Math.round((data.gmv / totalGmvToman) * 1000) / 10
          : 0,
    }));

    // -------------------------------------------------------------------------
    // F. Geographic Neighborhood Density (Urmia & Expansion Hubs)
    // -------------------------------------------------------------------------
    const neighborhoods = await prisma.neighborhood.findMany({
      include: {
        city: true,
        merchantLocations: {
          include: {
            merchant: {
              include: {
                listings: {
                  where: { status: ListingStatus.PUBLISHED },
                  select: { id: true },
                },
                orders: {
                  where: {
                    createdAt: { gte: startDate, lte: endDate },
                    status: { in: paidStatuses },
                  },
                  select: { totalAmountToman: true },
                },
              },
            },
          },
        },
      },
    });

    const neighborhoodDensity: NeighborhoodDensityDto[] = neighborhoods.map((n) => {
      let activeMerchants = 0;
      let activeListings = 0;
      let neighborhoodOrders = 0;
      let neighborhoodGmv = 0;

      for (const loc of n.merchantLocations) {
        if (loc.merchant) {
          activeMerchants += 1;
          activeListings += loc.merchant.listings.length;
          for (const ord of loc.merchant.orders) {
            neighborhoodOrders += 1;
            neighborhoodGmv += Number(ord.totalAmountToman);
          }
        }
      }

      // Unmet demand score: high orders or low supply indicator (0 - 100)
      let unmetDemandScore = 0;
      if (neighborhoodOrders > 0 && activeListings === 0) {
        unmetDemandScore = 95; // Extreme unmet demand
      } else if (neighborhoodOrders > 0) {
        unmetDemandScore = Math.min(
          100,
          Math.round((neighborhoodOrders / Math.max(1, activeListings * 3)) * 100)
        );
      }

      return {
        neighborhoodId: n.id,
        neighborhoodNameFa: n.nameFa,
        cityNameFa: n.city?.nameFa || 'ارومیه',
        activeMerchantsCount: activeMerchants,
        activeListingsCount: activeListings,
        totalOrdersCount: neighborhoodOrders,
        totalGmvToman: neighborhoodGmv,
        unmetDemandScore,
      };
    });

    // Sort neighborhoods by GMV descending
    neighborhoodDensity.sort((a, b) => b.totalGmvToman - a.totalGmvToman);

    return {
      timeframe: filter.timeframe as AnalyticsTimeframe,
      startDateIso: startDate.toISOString(),
      endDateIso: endDate.toISOString(),
      kpis,
      dailyTrends,
      categoryDistribution,
      neighborhoodDensity,
      cohorts,
    };
  }

  /**
   * CP-09.6: Generate CSV Report for Accounting & Platform Operations
   */
  async generateAnalyticsCsv(filter: AnalyticsQueryInput): Promise<string> {
    const report = await this.getMarketplaceAnalytics(filter);

    const rows: string[] = [];
    // Prepend UTF-8 BOM so Persian characters open cleanly in Excel
    const BOM = '\uFEFF';

    rows.push('گزارش تحلیلی عملکرد بازار پلتفرم لقمه (Loqme)');
    rows.push(`بازه زمانی:,${report.timeframe}`);
    rows.push(`تاریخ شروع:,${report.startDateIso}`);
    rows.push(`تاریخ پایان:,${report.endDateIso}`);
    rows.push('');

    rows.push('--- شاخص‌های کلیدی مالی و عملیاتی ---');
    rows.push(`حجم ناخالص کل فروش (GMV):,${report.kpis.gmvToman} تومان`);
    rows.push(`کارمزد تحقق‌یافته پلتفرم:,${report.kpis.platformCommissionToman} تومان`);
    rows.push(`میانگین ارزش سبد خرید (AOV):,${report.kpis.averageOrderValueToman} تومان`);
    rows.push(`تعداد سفارش‌های موفق:,${report.kpis.totalOrdersCount}`);
    rows.push(`تعداد کل بسته‌های نجات‌یافته:,${report.kpis.totalBagsSold}`);
    rows.push(`مجموع صرفه‌جویی اقتصادی مشتریان:,${report.kpis.customerCumulativeSavingsToman} تومان`);
    rows.push(`خالص تعهد پرداختی به فروشگاه‌ها:,${report.kpis.merchantNetPayoutToman} تومان`);
    rows.push(`نرخ فروش به عرضه (Sell-Through):,${report.kpis.sellThroughRate} %`);
    rows.push(`نرخ موفقیت تحویل حضوری:,${report.kpis.pickupCompletionRate} %`);
    rows.push(`نرخ مرجوعی و بازپرداخت:,${report.kpis.refundRate} %`);
    rows.push(`نرخ خرید مجدد مشتریان (Retention):,${report.kpis.repeatCustomerRate} %`);
    rows.push('');

    rows.push('--- روند روزانه معاملات ---');
    rows.push('تاریخ شمسی,تاریخ میلادی,تعداد سفارش‌ها,تعداد بسته,فروش ناخالص (تومان),کارمزد (تومان)');
    for (const d of report.dailyTrends) {
      rows.push(
        csvRow([d.dateFa, d.dateIso, d.ordersCount, d.soldBags, d.gmvToman, d.commissionToman])
      );
    }
    rows.push('');

    rows.push('--- عملکرد محله‌های شهری ---');
    rows.push('نام محله,نام شهر,تعداد فروشگاه فعال,بسته‌های موجود,تعداد سفارش,فروش کل (تومان),شاخص تقاضای برآورده‌نشده');
    for (const n of report.neighborhoodDensity) {
      rows.push(
        csvRow([n.neighborhoodNameFa, n.cityNameFa, n.activeMerchantsCount, n.activeListingsCount, n.totalOrdersCount, n.totalGmvToman, n.unmetDemandScore])
      );
    }

    return BOM + rows.join('\n');
  }
}

export const analyticsService = new AnalyticsService();
