"use client";
import * as RedesignIcons from "lucide-react";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { AdminDashboardKpiDto } from "@loqme/types";

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<AdminDashboardKpiDto | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchKpis = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success || !json.data)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      setError("");
      if (json.success && json.data) {
        setKpis(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت اطلاعات ممکن نشد");
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
            <h1 className="text-2xl font-black text-loqme-neutral-900">
              نمای کلی بازارچه
            </h1>
          </div>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            پایش لحظه‌ای بازیگران بازارچه، احراز صلاحیت فروشگاه‌ها، ایمنی مواد
            غذایی و حسابداری کلان
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="outline"
            className="text-loqme-neutral-900 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
            onClick={() => {
              setIsLoading(true);
              fetchKpis();
            }}
          >
            <RedesignIcons.RefreshCw size={18} /> بروزرسانی
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 border border-rose-200 text-rose-700 rounded-lg"
        >
          {error}
        </div>
      )}
      {isLoading && !kpis ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال دریافت آمار کلان بازار...
          </p>
        </div>
      ) : kpis ? (
        <>
          {/* Primary Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                فروشگاه‌های فعال و تایید شده
              </span>
              <div className="text-2xl font-black text-loqme-primary-700 mt-2">
                {toPersianDigits(kpis?.activeMerchantsCount ?? 0)}
              </div>
              <span className="text-[11px] text-amber-700 mt-1 block">
                {toPersianDigits(kpis?.pendingMerchantsCount ?? 0)} فروشگاه در
                انتظار تایید جواز
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                گردش مالی ۲۴ ساعت گذشته (GMV)
              </span>
              <div className="text-3xl font-black text-loqme-neutral-900 mt-2">
                {formatToman(kpis?.gmv24hToman ?? 0)}
              </div>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                سهم کارمزد پلتفرم: {formatToman(kpis?.commission24hToman ?? 0)}
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                بسته‌های فعال در بازار
              </span>
              <div className="text-3xl font-black text-emerald-700 mt-2">
                {toPersianDigits(kpis?.activeListingsCount ?? 0)} عدد
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                آماده رزرو و تحویل حضوری امروز
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                شکایات باز و داوری
              </span>
              <div
                className={`text-3xl font-black mt-2 ${
                  (kpis?.openComplaintsCount ?? 0) > 0
                    ? "text-rose-700 animate-pulse"
                    : "text-emerald-700"
                }`}
              >
                {toPersianDigits(kpis?.openComplaintsCount ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                {(kpis?.openComplaintsCount ?? 0) === 0
                  ? "شکایت بازی ثبت نشده است"
                  : "نیازمند بررسی و صدور رای استرداد"}
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link href="/admin/merchants" className="group">
              <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 hover:border-loqme-primary-500 transition-all">
                <div className="text-2xl mb-2">
                  <RedesignIcons.ShieldCheck size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 group-hover:text-loqme-primary-400">
                  تایید و بازرسی فروشگاه‌ها
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  بررسی مدارک صنفی و بهداشتی، تغییر وضعیت تایید، تعلیق متخلفین و
                  تنظیم کارمزد اختصاصی.
                </p>
              </div>
            </Link>

            <Link href="/admin/moderation" className="group">
              <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 hover:border-loqme-primary-500 transition-all">
                <div className="text-2xl mb-2">
                  <RedesignIcons.TriangleAlert size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 group-hover:text-loqme-primary-400">
                  مرکز داوری و استرداد آنی
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  مشاهده گزارش‌های فساد غذا، بازرسی عکس‌های ارسالی خریدار و
                  استرداد با یک کلیک.
                </p>
              </div>
            </Link>

            <Link href="/admin/finance" className="group">
              <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 hover:border-loqme-primary-500 transition-all">
                <div className="text-2xl mb-2">
                  <RedesignIcons.Wallet size={20} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 group-hover:text-loqme-primary-400">
                  صورت‌حساب و تسویه پایا
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  مشاهده مانده بستانکاری کلیه فروشگاه‌ها، محاسبه سهم پلتفرم و
                  خروجی اکسل تسویه حساب.
                </p>
              </div>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
