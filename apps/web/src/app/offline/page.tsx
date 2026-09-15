"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-sm border border-stone-100 flex flex-col items-center">
        <LoqmeLogo size="md" variant="stacked" theme="dark" />

        <div className="w-20 h-20 mt-8 mb-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-3xl">
          📡
        </div>

        <h1 className="text-xl font-bold text-loqme-neutral-900 mb-2">
          ارتباط اینترنت برقرار نیست
        </h1>

        <p className="text-sm text-loqme-neutral-600 leading-relaxed mb-8">
          برای دسترسی به بسته‌های شگفت‌انگیز روزانه و رزرو لقمه‌ها، نیاز به
          اتصال اینترنت دارید. لطفاً اتصال دستگاه خود را بررسی فرمایید.
        </p>

        <div className="w-full space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full bg-loqme-primary-600 hover:bg-[#0e484e] text-white rounded-full py-3 text-sm font-medium shadow-sm transition-all"
          >
            تلاش مجدد
          </Button>

          <Link
            href="/"
            className="action-link secondary block w-full w-full border-loqme-neutral-200 text-loqme-neutral-700 hover:bg-stone-50 rounded-full py-3 text-sm font-medium"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
