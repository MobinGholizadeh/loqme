'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FastListingModal } from '@/components/merchant/FastListingModal';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { MerchantDashboardDto } from '@loqme/types';

export default function MerchantDashboardPage() {
  const [stats, setStats] = useState<MerchantDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFastListingOpen, setIsFastListingOpen] = useState<boolean>(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/merchant/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch merchant dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-loqme-neutral-900">داشبورد فروشگاه</h1>
            {stats && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                ● زنده
              </span>
            )}
          </div>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            وضعیت موجودی مازاد، سفارش‌های امروز، صف تحویل و درآمد خالص
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="primary"
            className="gap-2 shadow-sm font-bold"
            onClick={() => setIsFastListingOpen(true)}
          >
            <span>⚡</span>
            <span>+ ثبت سریع بسته (زیر ۶۰ ثانیه)</span>
          </Button>

          <Button
            size="md"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setIsLoading(true);
              fetchStats();
            }}
            title="بروزرسانی داده‌ها"
          >
            <span>🔄</span>
          </Button>
        </div>
      </div>

      {isLoading && !stats ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">در حال دریافت وضعیت فروشگاه...</p>
        </div>
      ) : (
        <>
          {/* Active Pickup Window Alert */}
          {stats?.nextPickupWindow && (
            <Card variant="elevated" className="bg-loqme-primary-50 border-2 border-loqme-primary-300 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="md">
                      بازه تحویل حضوری امروز
                    </Badge>
                    {stats.nextPickupWindow.startsInMinutes > 0 && (
                      <span className="text-xs font-bold text-loqme-primary-800 bg-white px-2 py-0.5 rounded-md border border-loqme-primary-200">
                        شروع در {toPersianDigits(stats.nextPickupWindow.startsInMinutes)} دقیقه دیگر
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-base text-loqme-primary-950">
                    {stats.nextPickupWindow.labelFa}
                  </h3>
                  <p className="text-xs text-loqme-neutral-600">
                    لطفاً بسته‌های رزرو شده را از قبل تفکیک کنید تا هنگام مراجعه مشتریان، تحویل با اسکن
                    سریع QR یا کد ۴ رقمی بدون معطلی انجام شود.
                  </p>
                </div>

                <Link href="/merchant/orders">
                  <Button size="md" variant="primary" className="w-full sm:w-auto shadow-xs whitespace-nowrap">
                    مشاهده صف تحویل ({toPersianDigits(stats.pendingPickupsCount)})
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Primary KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">بسته‌های فعال امروز</span>
              <div className="text-2xl font-black text-loqme-primary-600 mt-2">
                {toPersianDigits(stats?.activeListingsCount ?? 0)} عدد
              </div>
              <span className="text-[11px] text-loqme-success-600 mt-1 block">
                {toPersianDigits(stats?.reservedBagsCount ?? 0)} عدد رزرو شده توسط مشتریان
              </span>
            </Card>

            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">فروش قطعی امروز</span>
              <div className="text-2xl font-black text-loqme-neutral-900 mt-2">
                {formatToman(stats?.grossRevenueTodayToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                {toPersianDigits(stats?.soldTodayCount ?? 0)} بسته تحویل شده / فروخته شده
              </span>
            </Card>

            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">تسویه خالص امروز (۹۰٪)</span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {formatToman(stats?.netPayoutTodayToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                پس از کسر کارمزد ۱۰٪ لقمه
              </span>
            </Card>

            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">امتیاز و رضایت مشتریان</span>
              <div className="text-2xl font-black text-amber-500 mt-2 flex items-center gap-1.5">
                <span>⭐</span>
                <span>{toPersianDigits(stats?.ratingAverage?.toFixed(2) ?? '۵.۰۰')}</span>
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                بر اساس {toPersianDigits(stats?.ratingCount ?? 0)} نظر ثبت شده
              </span>
            </Card>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link href="/merchant/listings" className="group">
              <Card variant="elevated" className="p-5 bg-white border border-loqme-neutral-200 group-hover:border-loqme-primary-400 transition-all">
                <div className="text-2xl mb-2">📦</div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 group-hover:text-loqme-primary-700">
                  مدیریت بسته‌های مازاد
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  توقف موقت (Pause)، افزودن یا کاهش موجودی، و مشاهده وضعیت لحظه‌ای بسته‌ها.
                </p>
              </Card>
            </Link>

            <Link href="/merchant/orders" className="group">
              <Card variant="elevated" className="p-5 bg-white border border-loqme-neutral-200 group-hover:border-loqme-primary-400 transition-all">
                <div className="text-2xl mb-2">🛍️</div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 group-hover:text-loqme-primary-700">
                  صف تحویل حضوری و اسکن
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  اسکن بارکد QR خریدار با دوربین یا ثبت کد ۴ رقمی جهت تایید آنی سفارش.
                </p>
              </Card>
            </Link>

            <Link href="/merchant/finance" className="group">
              <Card variant="elevated" className="p-5 bg-white border border-loqme-neutral-200 group-hover:border-loqme-primary-400 transition-all">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 group-hover:text-loqme-primary-700">
                  صورت‌حساب مالی و تسویه
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  ریز تراکنش‌های دفاتر کل، محاسبه دقیق ۱۰٪ کارمزد و مانده قابل تسویه حساب.
                </p>
              </Card>
            </Link>
          </div>
        </>
      )}

      {/* Fast Listing Modal */}
      <FastListingModal
        isOpen={isFastListingOpen}
        onClose={() => setIsFastListingOpen(false)}
        onListingCreated={() => {
          fetchStats();
        }}
      />
    </div>
  );
}
