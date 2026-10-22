import { prisma } from '@/lib/prisma';
import { requireMerchantContext } from './merchant-access.service';
import type { MerchantDataReportDto } from '@loqme/types';

/** Seven complete local calendar days; fixed Tehran offset for the supported post-2023 period. */
export function merchantReportWindow(now: Date, days: 7 | 30 = 7) {
  const offset = 210 * 60_000;
  const end = new Date(Math.floor((now.getTime() + offset) / 86_400_000) * 86_400_000 - offset);
  return { start: new Date(end.getTime() - days * 86_400_000), end };
}

export async function getMerchantDataReport(userId: string, merchantId: string, locationId?: string, days: 7 | 30 = 7): Promise<MerchantDataReportDto> {
  const context = await requireMerchantContext(userId, merchantId, 'REPORT_READ', locationId);
  const now = new Date();
  const { start, end } = merchantReportWindow(now, days);
  const range = { gte: start, lt: end };
  const scope = { merchantId: context.merchantId, ...(locationId ? { merchantLocationId: locationId } : {}) };
  return prisma.$transaction(async tx => {
    const payments = await tx.payment.aggregate({ where: { order: scope, status: { in: ['SUCCESS', 'REFUNDED'] }, verifiedAt: range }, _sum: { amountToman: true } });
    const refunds = await tx.refund.aggregate({ where: { order: scope, status: 'SETTLED', settledAt: range }, _sum: { amountToman: true } });
    const sales = await tx.order.aggregate({ where: { ...scope, acceptedPaymentId: { not: null }, paidAt: range },
      _sum: { totalAmountToman: true, commissionAmountToman: true, merchantPayoutAmountToman: true }, _count: true });
    const pickupCount = await tx.pickupVerification.count({ where: { order: scope, isVerified: true, verifiedAt: range } });
    // Unknown event times cannot truthfully be assigned to a reporting period.
    const unknownPaymentTimes = await tx.payment.count({ where: { order: scope, status: { in: ['SUCCESS', 'REFUNDED'] }, verifiedAt: null } });
    const unknownRefundTimes = await tx.refund.count({ where: { order: scope, status: 'SETTLED', settledAt: null } });
    const unknownLocations = await tx.order.count({ where: { merchantId, merchantLocationId: null, createdAt: { lt: end } } });
    // Merchant-wide case count is deliberately labelled in the UI even for one location.
    const openReconciliations = await tx.reconciliationCase.count({ where: { merchantId, status: 'OPEN' } });
    const observations = await tx.listingRevision.count({ where: { merchantId, ...(locationId ? { locationId } : {}), kind: { not: 'BASELINE' } } });
    const coverage = await tx.listingRevision.aggregate({ where: { merchantId, ...(locationId ? { locationId } : {}) }, _min: { recordedAt: true } });
    const previousPaidOrderCount = await tx.order.count({ where: { ...scope, acceptedPaymentId: { not: null }, paidAt: { gte: new Date(start.getTime() - days*86_400_000), lt: start } } });
    const gross = payments._sum.amountToman ?? BigInt(0);
    const returned = refunds._sum.amountToman ?? BigInt(0);
    const report: MerchantDataReportDto = {
      version: '1', merchantId, locationId: locationId ?? null, source: 'LOQME_MARKETPLACE', timezone: 'Asia/Tehran',
      startIso: start.toISOString(), endExclusiveIso: end.toISOString(), computedAtIso: now.toISOString(),
      collectionsToman: gross.toString(), refundsToman: returned.toString(), netCollectionsToman: (gross-returned).toString(),
      bookedSalesToman: (sales._sum.totalAmountToman ?? BigInt(0)).toString(),
      bookedCommissionToman: (sales._sum.commissionAmountToman ?? BigInt(0)).toString(),
      bookedMerchantPayableToman: (sales._sum.merchantPayoutAmountToman ?? BigInt(0)).toString(),
      paidOrderCount: sales._count, previousPaidOrderCount, historyCoverageStartIso: coverage._min.recordedAt?.toISOString() ?? null, pickupCount,
      quality: { unknownPaymentTimes, unknownRefundTimes, unknownLocations, openReconciliations, baselineOnly: observations === 0 }, insights: [],
    };
    report.insights = buildMerchantInsights(report);
    return report;
  }, { isolationLevel: 'RepeatableRead' });
}

export function buildMerchantInsights(report: MerchantDataReportDto): MerchantDataReportDto['insights'] {
  const insights: MerchantDataReportDto['insights'] = [];
  if (report.quality.openReconciliations) insights.push({ code: 'RECONCILIATION', textFa: 'پرداخت‌هایی در سطح فروشگاه نیازمند بررسی پشتیبانی هستند؛ پیش از تصمیم مالی آن‌ها را پیگیری کنید', evidence: ['quality.openReconciliations'] });
  if (report.quality.unknownPaymentTimes || report.quality.unknownRefundTimes) insights.push({ code: 'INCOMPLETE_HISTORY', textFa: 'زمان برخی پرداخت‌ها یا استردادهای قدیمی مشخص نیست؛ مبالغ آن‌ها در این بازه جمع نشده است', evidence: ['quality.unknownPaymentTimes', 'quality.unknownRefundTimes'] });
  if (report.paidOrderCount < 5) insights.push({ code: 'LOW_SAMPLE', textFa: 'برای پیشنهاد تغییر قیمت یا تعداد بسته‌ها، داده کافی در این بازه نداریم؛ ثبت منظم بسته‌ها و تحویل‌ها را ادامه دهید', evidence: ['paidOrderCount'] });
  else insights.push({ code: 'OBSERVED_ACTIVITY', textFa: `${report.paidOrderCount.toLocaleString('fa-IR')} سفارش در این بازه پرداخت و تخصیص داده شده است؛ این عدد فقط فروش لقمه را نشان می‌دهد`, evidence: ['paidOrderCount', 'startIso', 'endExclusiveIso'] });
  if (report.paidOrderCount >= 5 && report.previousPaidOrderCount >= 5) {
    const difference = report.paidOrderCount-report.previousPaidOrderCount;
    insights.push({ code: 'ORDER_COMPARISON', textFa: difference === 0 ? 'تعداد سفارش‌های پرداخت‌شده با بازه هم‌اندازه قبلی برابر است' : `تعداد سفارش‌های پرداخت‌شده نسبت به بازه هم‌اندازه قبلی ${Math.abs(difference).toLocaleString('fa-IR')} سفارش ${difference > 0 ? 'بیشتر' : 'کمتر'} است؛ علت این تغییر از این داده‌ها مشخص نیست`, evidence: ['paidOrderCount', 'previousPaidOrderCount'] });
  }
  if (BigInt(report.refundsToman) > BigInt(0)) insights.push({ code: 'REFUNDS', textFa: 'استرداد تسویه‌شده در این بازه ثبت شده است؛ تاریخ استرداد ممکن است با تاریخ خرید متفاوت باشد', evidence: ['refundsToman'] });
  return insights;
}
