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
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4">
      {/* Stitch Design Board: Seller & Store Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-primary">پنل فروشندگان و اصناف لقمه</h1>
            {stats && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span>داشبورد زنده</span>
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            پایش موجودی مازاد روزانه، صف تحویل حضوری، بازه زمانی تحویل و تسویه حساب مالی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="primary"
            rounded="pill"
            className="gap-2 shadow-sm font-bold bg-primary hover:bg-primary-container text-white text-xs px-4"
            onClick={() => setIsFastListingOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ ثبت سریع لقمه (زیر ۶۰ ثانیه)</span>
          </Button>

          <Button
            size="md"
            variant="outline"
            rounded="pill"
            className="border-outline-variant text-on-surface hover:bg-surface-container"
            onClick={() => {
              setIsLoading(true);
              fetchStats();
            }}
            title="بروزرسانی داده‌ها"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </Button>
        </div>
      </div>

      {isLoading && !stats ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-on-surface-variant">در حال دریافت وضعیت فروشگاه...</p>
        </div>
      ) : (
        <>
          {/* Active Pickup Window Alert matching Stitch Portal Banner */}
          {stats?.nextPickupWindow && (
            <div className="rounded-3xl bg-surface-container-low border-2 border-primary-container p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary">
                      بازه تحویل حضوری امروز
                    </span>
                    {stats.nextPickupWindow.startsInMinutes > 0 && (
                      <span className="text-xs font-bold text-primary bg-surface-container-lowest px-2.5 py-0.5 rounded-full border border-outline-variant/30">
                        شروع در {toPersianDigits(stats.nextPickupWindow.startsInMinutes)} دقیقه دیگر
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-base text-primary">
                    {stats.nextPickupWindow.labelFa}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    لطفاً بسته‌های رزروشده را تفکیک فرمایید تا تحویل با اسکن سریع QR بارکد یا کد ۴ رقمی اختصاصی مشتریان در کمترین زمان انجام گیرد.
                  </p>
                </div>

                <Link href="/merchant/orders">
                  <Button size="md" variant="primary" rounded="pill" className="w-full sm:w-auto bg-primary hover:bg-primary-container text-white shadow-xs whitespace-nowrap text-xs font-bold">
                    مشاهده صف تحویل ({toPersianDigits(stats.pendingPickupsCount)})
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Primary KPI Cards Grid matching Stitch Metric Architecture */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">بسته‌های فعال امروز</span>
                <span className="material-symbols-outlined text-[20px] text-primary">inventory_2</span>
              </div>
              <div className="text-2xl font-black text-primary">
                {toPersianDigits(stats?.activeListingsCount ?? 0)} بسته
              </div>
              <span className="text-[11px] text-secondary font-bold block">
                {toPersianDigits(stats?.reservedBagsCount ?? 0)} عدد رزرو قطعی
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">فروش ناخالص امروز</span>
                <span className="material-symbols-outlined text-[20px] text-primary">point_of_sale</span>
              </div>
              <div className="text-2xl font-black text-on-surface">
                {formatToman(stats?.grossRevenueTodayToman ?? 0)}
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                {toPersianDigits(stats?.soldTodayCount ?? 0)} بسته تحویل شده
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">تسویه خالص فروشگاه (۹۰٪)</span>
                <span className="material-symbols-outlined text-[20px] text-secondary">payments</span>
              </div>
              <div className="text-2xl font-black text-secondary">
                {formatToman(stats?.netPayoutTodayToman ?? 0)}
              </div>
              <span className="text-[11px] text-outline block">
                پس از کسر ۱۰٪ کارمزد پلتفرم
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">رضایت مشتریان</span>
                <span className="material-symbols-outlined text-[20px] text-amber-500">star</span>
              </div>
              <div className="text-2xl font-black text-amber-500 flex items-center gap-1">
                <span>{toPersianDigits(stats?.ratingAverage?.toFixed(2) ?? '۵.۰۰')}</span>
              </div>
              <span className="text-[11px] text-outline block">
                بر اساس {toPersianDigits(stats?.ratingCount ?? 0)} نظر ثبت‌شده
              </span>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link href="/merchant/listings" className="group">
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 group-hover:border-primary/50 transition-all shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface group-hover:text-primary">
                  مدیریت بسته‌های مازاد
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  توقف موقت فروش، افزایش یا کاهش موجودی، و بررسی وضعیت بسته‌های فعال.
                </p>
              </div>
            </Link>

            <Link href="/merchant/orders" className="group">
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 group-hover:border-primary/50 transition-all shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface group-hover:text-primary">
                  صف تحویل حضوری و اسکن
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  اسکن بارکد QR خریداران یا وارد کردن کد ۴ رقمی جهت تایید آنی تحویل.
                </p>
              </div>
            </Link>

            <Link href="/merchant/finance" className="group">
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 group-hover:border-primary/50 transition-all shadow-xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">account_balance</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface group-hover:text-primary">
                  صورت‌حساب و دفاتر مالی
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  ریز تراکنش‌های بانکی، ثبت شماره شبا و درخواست تسویه حساب پایا.
                </p>
              </div>
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
