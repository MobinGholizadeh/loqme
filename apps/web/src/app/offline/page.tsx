'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-stone-100 flex flex-col items-center">
        <LoqmeLogo size="md" variant="stacked" theme="dark" />

        <div className="w-20 h-20 mt-8 mb-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-3xl">
          📡
        </div>

        <h1 className="text-xl font-bold text-stone-900 mb-2">
          ارتباط اینترنت برقرار نیست
        </h1>

        <p className="text-sm text-stone-600 leading-relaxed mb-8">
          برای دسترسی به بسته‌های شگفت‌انگیز روزانه و رزرو لقمه‌ها، نیاز به اتصال اینترنت دارید. لطفاً اتصال دستگاه خود را بررسی فرمایید.
        </p>

        <div className="w-full space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full bg-[#135E66] hover:bg-[#0e484e] text-white rounded-full py-3 text-sm font-medium shadow-sm transition-all"
          >
            🔄 تلاش مجدد
          </Button>

          <Link href="/" className="block w-full">
            <Button
              variant="outline"
              className="w-full border-stone-200 text-stone-700 hover:bg-stone-50 rounded-full py-3 text-sm font-medium"
            >
              بازگشت به صفحه اصلی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
