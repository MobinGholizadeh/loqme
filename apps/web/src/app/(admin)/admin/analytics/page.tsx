'use client';

import React, { useState, useEffect } from 'react';
import { MarketplaceAnalyticsReportDto, AnalyticsTimeframe } from '@loqme/types';
import { toPersianDigits, formatToman } from '@loqme/validation';
import { TrendChart } from '@/components/analytics/TrendChart';
import { CategoryDonutChart } from '@/components/analytics/CategoryDonutChart';
import { NeighborhoodDensityTable } from '@/components/analytics/NeighborhoodDensityTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30D');
  const [report, setReport] = useState<MarketplaceAnalyticsReportDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (tf: AnalyticsTimeframe) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?timeframe=${tf}`);
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      } else {
        setError(json.message || 'خطا در بارگذاری داده‌های تحلیلی');
      }
    } catch {
      setError('خطا در برقراری ارتباط با سرور تحلیل داده');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const timeframeOptions: { id: AnalyticsTimeframe; label: string }[] = [
    { id: 'TODAY', label: 'امروز' },
    { id: '7D', label: '۷ روز گذشته' },
    { id: '30D', label: '۳۰ روز گذشته' },
    { id: '90D', label: '۹۰ روز گذشته' },
    { id: '1Y', label: 'سال جاری' },
  ];

  const handleExportCsv = () => {
    window.open(`/api/admin/analytics/export?timeframe=${timeframe}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-loqme-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">تحلیل جامع عملکرد بازار</h1>
            <Badge variant="neutral" size="sm" className="bg-teal-500/20 text-teal-300 border-teal-500/30">
              داده‌های زنده و قطعی
            </Badge>
          </div>
          <p className="text-sm text-loqme-neutral-400 mt-1">
            پایش لحظه‌ای شاخص‌های کلیدی مالی، نرخ‌های عملیاتی، تراکم محله‌های ارومیه و وفاداری مشتریان
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="bg-loqme-neutral-900 border border-loqme-neutral-800 rounded-xl p-1 flex items-center gap-1">
            {timeframeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  timeframe === opt.id
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-loqme-neutral-400 hover:text-white hover:bg-loqme-neutral-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-loqme-neutral-700 text-loqme-neutral-200 hover:bg-loqme-neutral-800 text-xs"
          >
            📥 خروجی اکسل (CSV)
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <span className="text-sm text-loqme-neutral-400">در حال محاسبه شاخص‌های بازار...</span>
        </div>
      ) : error || !report ? (
        <div className="p-8 bg-rose-950/30 border border-rose-800/40 rounded-xl text-center text-rose-300 text-sm">
          {error || 'داده‌ای یافت نشد'}
        </div>
      ) : (
        <>
          {/* 1. Top Primary Financial & Value KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GMV */}
            <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5">
              <div className="text-xs text-loqme-neutral-400 font-medium">گردش ناخالص بازار (GMV)</div>
              <div className="text-2xl font-bold text-white mt-2">
                {formatToman(report.kpis.gmvToman)} <span className="text-xs font-normal text-loqme-neutral-400">تومان</span>
              </div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <span>{toPersianDigits(report.kpis.totalBagsSold)} بسته نجات‌یافته</span>
              </div>
            </Card>

            {/* Platform Commission */}
            <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5">
              <div className="text-xs text-loqme-neutral-400 font-medium">کارمزد پلتفرم لقمه</div>
              <div className="text-2xl font-bold text-teal-400 mt-2">
                {formatToman(report.kpis.platformCommissionToman)} <span className="text-xs font-normal text-loqme-neutral-400">تومان</span>
              </div>
              <div className="text-xs text-loqme-neutral-400 mt-2">
                میانگین سهم کارمزد: ۱۰٪ مصوب
              </div>
            </Card>

            {/* Average Order Value (AOV) */}
            <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5">
              <div className="text-xs text-loqme-neutral-400 font-medium">میانگین ارزش هر سفارش (AOV)</div>
              <div className="text-2xl font-bold text-white mt-2">
                {formatToman(report.kpis.averageOrderValueToman)} <span className="text-xs font-normal text-loqme-neutral-400">تومان</span>
              </div>
              <div className="text-xs text-loqme-neutral-400 mt-2">
                از مجموع {toPersianDigits(report.kpis.totalOrdersCount)} سفارش موفق
              </div>
            </Card>

            {/* Customer Cumulative Savings */}
            <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5">
              <div className="text-xs text-loqme-neutral-400 font-medium">مجموع صرفه‌جویی مشتریان</div>
              <div className="text-2xl font-bold text-amber-400 mt-2">
                {formatToman(report.kpis.customerCumulativeSavingsToman)} <span className="text-xs font-normal text-loqme-neutral-400">تومان</span>
              </div>
              <div className="text-xs text-loqme-neutral-400 mt-2">
                ارزش اقتصادی خلق‌شده برای خریداران
              </div>
            </Card>
          </div>

          {/* 2. Operational Health & Ratios Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-loqme-neutral-950 border border-loqme-neutral-800 p-4 rounded-xl">
            <div>
              <div className="text-[11px] text-loqme-neutral-400">نرخ فروش به عرضه (Sell-Through)</div>
              <div className="text-lg font-bold text-teal-400 mt-1">
                {toPersianDigits(report.kpis.sellThroughRate)}٪
              </div>
              <div className="w-full bg-loqme-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, report.kpis.sellThroughRate)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] text-loqme-neutral-400">نرخ موفقیت تحویل حضوری</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {toPersianDigits(report.kpis.pickupCompletionRate)}٪
              </div>
              <div className="w-full bg-loqme-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, report.kpis.pickupCompletionRate)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] text-loqme-neutral-400">نرخ مرجوعی و شکایات</div>
              <div className="text-lg font-bold text-rose-400 mt-1">
                {toPersianDigits(report.kpis.refundRate)}٪
              </div>
              <div className="w-full bg-loqme-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, report.kpis.refundRate)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] text-loqme-neutral-400">نرخ خرید مجدد (Retention)</div>
              <div className="text-lg font-bold text-indigo-400 mt-1">
                {toPersianDigits(report.kpis.repeatCustomerRate)}٪
              </div>
              <div className="w-full bg-loqme-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, report.kpis.repeatCustomerRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. Trend Line & Area Chart */}
          <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white">روند روزانه فروش ناخالص و تعداد سفارش‌ها</h2>
                <p className="text-xs text-loqme-neutral-400 mt-0.5">
                  نمودار پیوسته بر اساس سفارش‌های پرداخت‌شده قطعی در بازه انتخابی
                </p>
              </div>
              <span className="text-xs text-teal-400 font-medium">
                {toPersianDigits(report.dailyTrends.length)} روز معاملاتی
              </span>
            </div>
            <TrendChart data={report.dailyTrends} height={260} />
          </Card>

          {/* 4. Category Distribution & Customer Cohorts (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Donut */}
            <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-white">توزیع سهم فروش بر اساس دسته‌بندی خوراکی</h2>
                <p className="text-xs text-loqme-neutral-400 mt-0.5 mb-4">
                  سهم دسته‌های نانوایی، قنادی، رستوران و کافه از حجم کل فروش بازار
                </p>
                <CategoryDonutChart data={report.categoryDistribution} />
              </div>
            </Card>

            {/* Customer Cohorts & Retention */}
            <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 p-5">
              <h2 className="text-base font-bold text-white">تحلیل رفتار و وفاداری مشتریان (Cohorts)</h2>
              <p className="text-xs text-loqme-neutral-400 mt-0.5 mb-5">
                سنجش تکرار خرید و فعال‌سازی کاربران در چرخه حیات بازار
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-loqme-neutral-950 p-4 rounded-xl border border-loqme-neutral-800/80">
                  <span className="text-xs text-loqme-neutral-400">کل خریداران فعال بازه:</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {toPersianDigits(report.cohorts.activeOrderingCustomers)} کاربر
                  </div>
                </div>

                <div className="bg-loqme-neutral-950 p-4 rounded-xl border border-loqme-neutral-800/80">
                  <span className="text-xs text-loqme-neutral-400">مشتریان وفادار (≥ ۲ خرید):</span>
                  <div className="text-xl font-bold text-indigo-400 mt-1">
                    {toPersianDigits(report.cohorts.repeatCustomers)} کاربر
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1 text-loqme-neutral-300">
                    <span>نرخ تکرار خرید ۱۴ روزه</span>
                    <span className="font-semibold text-teal-400">
                      {toPersianDigits(report.cohorts.repeatRate14Days)}٪
                    </span>
                  </div>
                  <div className="w-full bg-loqme-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, report.cohorts.repeatRate14Days)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-loqme-neutral-300">
                    <span>نرخ تکرار خرید ۳۰ روزه</span>
                    <span className="font-semibold text-indigo-400">
                      {toPersianDigits(report.cohorts.repeatRate30Days)}٪
                    </span>
                  </div>
                  <div className="w-full bg-loqme-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, report.cohorts.repeatRate30Days)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 5. Hyper-Local Geographic Supply & Demand Table (Urmia Hubs) */}
          <Card className="bg-loqme-neutral-900/80 border-loqme-neutral-800 overflow-hidden">
            <div className="p-5 border-b border-loqme-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">تراکم عرضه و تقاضا به تفکیک محله‌های شهری</h2>
                <p className="text-xs text-loqme-neutral-400 mt-0.5">
                  رتبه‌بندی محله‌های ارومیه بر مبنای گردش مالی، تعداد فروشگاه‌ها و شاخص تقاضای پوشش‌داده‌نشده
                </p>
              </div>
              <Badge variant="success" size="sm">
                شهر پایلوت: ارومیه
              </Badge>
            </div>
            <NeighborhoodDensityTable data={report.neighborhoodDensity} />
          </Card>
        </>
      )}
    </div>
  );
}
