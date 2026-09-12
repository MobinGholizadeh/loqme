'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4">
      {/* Stitch Design Board: Admin Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">کنسول مدیریت ارشد لقمه (Admin Portal)</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>پایش زنده</span>
            </span>
          </div>
          <p className="text-xs text-loqme-neutral-400 mt-1">
            نظارت لحظه‌ای بر اکوسیستم بازارچه، تایید صلاحیت اصناف، ایمنی غذایی و دفاتر مالی شاپرک
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 text-xs font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>پلتفرم کاملاً عملیاتی</span>
          </span>
          <Button
            size="md"
            variant="outline"
            rounded="pill"
            className="text-white border-loqme-neutral-700 hover:bg-loqme-neutral-800 text-xs"
            onClick={() => {
              setIsLoading(true);
              fetchKpis();
            }}
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
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
            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-md space-y-1.5">
              <div className="flex items-center justify-between text-loqme-neutral-400 text-xs">
                <span>فروشگاه‌های تاییدشده</span>
                <span className="material-symbols-outlined text-[20px] text-teal-400">storefront</span>
              </div>
              <div className="text-3xl font-black text-teal-400">
                {toPersianDigits(kpis?.activeMerchantsCount ?? 0)}
              </div>
              <span className="text-[11px] text-amber-400 font-semibold block">
                {toPersianDigits(kpis?.pendingMerchantsCount ?? 0)} فروشگاه در صف تایید جواز
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-md space-y-1.5">
              <div className="flex items-center justify-between text-loqme-neutral-400 text-xs">
                <span>گردش ناخالص ۲۴ ساعت (GMV)</span>
                <span className="material-symbols-outlined text-[20px] text-emerald-400">trending_up</span>
              </div>
              <div className="text-3xl font-black text-white">
                {formatToman(kpis?.gmv24hToman ?? 0)}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold block">
                کارمزد ناخالص ۱۰٪: {formatToman(kpis?.commission24hToman ?? 0)}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-md space-y-1.5">
              <div className="flex items-center justify-between text-loqme-neutral-400 text-xs">
                <span>بسته‌های فعال در بازارچه</span>
                <span className="material-symbols-outlined text-[20px] text-teal-400">inventory_2</span>
              </div>
              <div className="text-3xl font-black text-emerald-400">
                {toPersianDigits(kpis?.activeListingsCount ?? 0)} عدد
              </div>
              <span className="text-[11px] text-loqme-neutral-400 block">
                آماده رزرو و تحویل حضوری
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 shadow-md space-y-1.5">
              <div className="flex items-center justify-between text-loqme-neutral-400 text-xs">
                <span>شکایات و داوری باز</span>
                <span className="material-symbols-outlined text-[20px] text-rose-400">gavel</span>
              </div>
              <div
                className={`text-3xl font-black ${
                  (kpis?.openComplaintsCount ?? 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {toPersianDigits(kpis?.openComplaintsCount ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-400 block">
                {(kpis?.openComplaintsCount ?? 0) === 0
                  ? '۱۰۰٪ سلامت و عدم مغایرت'
                  : 'نیازمند بررسی و رای استرداد وجه'}
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link href="/admin/merchants" className="group">
              <div className="p-5 rounded-2xl bg-loqme-neutral-800/60 border border-loqme-neutral-700 hover:border-teal-500 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-900/60 text-teal-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-teal-400">
                  تایید صلاحیت و بازرسی فروشگاه‌ها
                </h3>
                <p className="text-xs text-loqme-neutral-400 leading-relaxed">
                  بررسی پروانه‌های بهداشتی و صنفی، تغییر وضعیت فروشگاه، تعلیق متخلفان و تنظیم درصد کارمزد.
                </p>
              </div>
            </Link>

            <Link href="/admin/moderation" className="group">
              <div className="p-5 rounded-2xl bg-loqme-neutral-800/60 border border-loqme-neutral-700 hover:border-teal-500 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">warning</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-teal-400">
                  مرکز داوری و استرداد آنی وجه
                </h3>
                <p className="text-xs text-loqme-neutral-400 leading-relaxed">
                  بررسی گزارش‌های تصویری فساد غذا، مغایرت اقلام و تایید استرداد وجه شاپرک.
                </p>
              </div>
            </Link>

            <Link href="/admin/finance" className="group">
              <div className="p-5 rounded-2xl bg-loqme-neutral-800/60 border border-loqme-neutral-700 hover:border-teal-500 transition-all space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">account_balance</span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-teal-400">
                  حسابداری کلان و تسویه پایا
                </h3>
                <p className="text-xs text-loqme-neutral-400 leading-relaxed">
                  تراز بدهکار/بستانکار فروشگاه‌ها، محاسبه دقیق کارمزد پلتفرم و فایل خروجی بانکی پایا.
                </p>
              </div>
            </Link>
          </div>

          {/* Infrastructure Health Status */}
          <div className="p-6 rounded-2xl bg-loqme-neutral-800/80 border border-loqme-neutral-700/80 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-teal-400">dns</span>
              <span>وضعیت سلامت و پایداری سرویس‌های کلیدی سامانه:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">پایگاه داده PostgreSQL:</span>
                <span className="text-emerald-400 font-bold">متصل و پایدار</span>
              </div>

              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">موتور PostGIS مکانی:</span>
                <span className="text-emerald-400 font-bold">شعاع ارومیه و تهران</span>
              </div>

              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">احراز هویت OTP (CSPRNG):</span>
                <span className="text-emerald-400 font-bold">فعال (۵ رقمی)</span>
              </div>

              <div className="p-3 rounded-xl bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
                <span className="text-loqme-neutral-300">لاگ‌های تغییرناپذیر ممیزی:</span>
                <span className="text-emerald-400 font-bold">ثبت متمرکز</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
