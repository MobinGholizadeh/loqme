'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error in page:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-stone-200/80 flex flex-col items-center">
        <LoqmeLogo size="md" variant="horizontal" theme="dark" />

        <div className="w-16 h-16 mt-6 mb-4 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl text-rose-600">
          ⚠️
        </div>

        <h1 className="text-xl font-bold text-stone-900 mb-2">
          متاسفانه در پردازش صفحه خطایی رخ داد
        </h1>

        <p className="text-sm text-stone-600 leading-relaxed mb-6">
          نگران نباشید، اطلاعات حساب و سفارش‌های شما امن هستند. می‌توانید مجدداً تلاش کنید یا به صفحه اصلی بازگردید.
        </p>

        {error.digest && (
          <div className="text-[11px] font-mono text-stone-400 bg-stone-50 py-1 px-3 rounded-lg mb-6 max-w-full truncate">
            کد رهگیری خطا: {error.digest}
          </div>
        )}

        <div className="w-full space-y-3">
          <Button
            onClick={() => reset()}
            className="w-full bg-[#135E66] hover:bg-[#0e484e] text-white rounded-full py-2.5 text-sm font-medium shadow-sm transition-all"
          >
            🔄 تلاش مجدد
          </Button>

          <Link href="/" className="block w-full">
            <Button
              variant="outline"
              className="w-full border-stone-200 text-stone-700 hover:bg-stone-50 rounded-full py-2.5 text-sm font-medium"
            >
              بازگشت به صفحه اصلی
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
