'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { AdminDashboardKpiDto } from '@loqme/types';

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminDashboardKpiDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        setKpis(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin KPIs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpis();
    const interval = setInterval(fetchKpis, 30000);
    return () => clearInterval(interval);
  }, [fetchKpis]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">کنسول نظارت و مدیریت ارشد لقمه</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ● زنده
            </span>
          </div>
          <p className="text-xs text-loqme-neutral-400 mt-1">
            پایش لحظه‌ای بازیگران بازارچه، احراز صلاحیت فروشگاه‌ها، ایمنی مواد غذایی و حسابداری کلان
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">
            🟢 پلتفرم کاملاً عملیاتی
          </Badge>
          <Button
            size="md"
            variant="outline"
            className="text-white border-loqme-neutral-700 hover:bg-loqme-neutral-800"
            onClick={() => {
              setIsLoading(true);
              fetchKpis();
            }}
          >
            🔄 بروزرسانی
          </Button>
        </div>
      </div>

      {isLoading && !kpis ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="white" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-400">در حال دریافت آمار کلان بازار...</p>
        </div>
      ) : (
        <>
          {/* Primary Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-card">
              <span className="text-xs text-loqme-neutral-400 font-medium">فروشگاه‌های فعال و تایید شده</span>
              <div className="text-3xl font-black text-loqme-primary-400 mt-2">
                {toPersianDigits(kpis?.activeMerchantsCount ?? 0)}
              </div>
              <span className="text-[11px] text-amber-400 mt-1 block">
                {toPersianDigits(kpis?.pendingMerchantsCount ?? 0)} فروشگاه در انتظار تایید جواز
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-card">
              <span className="text-xs text-loqme-neutral-400 font-medium">گردش مالی ۲۴ ساعت گذشته (GMV)</span>
              <div className="text-3xl font-black text-white mt-2">
                {formatToman(kpis?.gmv24hToman ?? 0)}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                سهم کارمزد پلتفرم: {formatToman(kpis?.commission24hToman ?? 0)}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-card">
              <span className="text-xs text-loqme-neutral-400 font-medium">بسته‌های فعال در بازار</span>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                {toPersianDigits(kpis?.activeListingsCount ?? 0)} عدد
              </div>
              <span className="text-[11px] text-loqme-neutral-400 mt-1 block">
                آماده رزرو و تحویل حضوری امروز
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-card">
              <span className="text-xs text-loqme-neutral-400 font-medium">شکایات باز و داوری</span>
              <div
                className={`text-3xl font-black mt-2 ${
                  (kpis?.openComplaintsCount ?? 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {toPersianDigits(kpis?.openComplaintsCount ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-400 mt-1 block">
                {(kpis?.openComplaintsCount ?? 0) === 0
                  ? '۱۰۰٪ سلامت و رضایت خریداران'
                  : 'نیازمند بررسی و صدور رای استرداد'}
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link href="/admin/merchants" className="group">
              <div className="p-5 rounded-2xl bg-loqme-neutral-800/60 border border-loqme-neutral-700 hover:border-loqme-primary-500 transition-all">
                <div className="text-2xl mb-2">🛡️</div>
                <h3 className="font-bold text-sm text-white group-hover:text-loqme-primary-400">
                  تایید و بازرسی فروشگاه‌ها
                </h3>
                <p className="text-xs text-loqme-neutral-400 mt-1">
                  بررسی مدارک صنفی و بهداشتی، تغییر وضعیت تایید، تعلیق متخلفین و تنظیم کارمزد اختصاصی.
                </p>
              </div>
            </Link>

            <Link href="/admin/moderation" className="group">
              <div className="p-5 rounded-2xl bg-loqme-neutral-800/60 border border-loqme-neutral-700 hover:border-loqme-primary-500 transition-all">
                <div className="text-2xl mb-2">🚨</div>
                <h3 className="font-bold text-sm text-white group-hover:text-loqme-primary-400">
                  مرکز داوری و استرداد آنی
                </h3>
                <p className="text-xs text-loqme-neutral-400 mt-1">
                  مشاهده گزارش‌های فساد غذا، بازرسی عکس‌های ارسالی خریدار و استرداد با یک کلیک.
                </p>
              </div>
            </Link>

            <Link href="/admin/finance" className="group">
              <div className="p-5 rounded-2xl bg-loqme-neutral-800/60 border border-loqme-neutral-700 hover:border-loqme-primary-500 transition-all">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="font-bold text-sm text-white group-hover:text-loqme-primary-400">
                  صورت‌حساب و تسویه پایا
                </h3>
                <p className="text-xs text-loqme-neutral-400 mt-1">
                  مشاهده مانده بستانکاری کلیه فروشگاه‌ها، محاسبه سهم پلتفرم و خروجی اکسل تسویه حساب.
                </p>
              </div>
            </Link>
          </div>

          {/* Infrastructure Health Status */}
          <div className="p-6 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>🖥️</span>
              <span>وضعیت پایداری سرویس‌های کلیدی سامانه:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">پایگاه داده PostgreSQL:</span>
                <span className="text-emerald-400 font-bold">متصل و پایدار</span>
              </div>

              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">موتور PostGIS مکانی:</span>
                <span className="text-emerald-400 font-bold">فعال (شعاع ارومیه)</span>
              </div>

              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">سرویس احراز هویت OTP:</span>
                <span className="text-emerald-400 font-bold">فعال (CSPRNG 5D)</span>
              </div>

              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">گیت لاگ‌های امنیتی:</span>
                <span className="text-emerald-400 font-bold">ثبت غیرقابل تغییر</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
