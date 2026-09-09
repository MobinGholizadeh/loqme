'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-loqme-neutral-25 flex flex-col justify-center items-center px-4 py-8">
      {/* Return to home link */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs text-loqme-neutral-600 hover:text-loqme-primary-600 flex items-center gap-1 transition-colors"
        >
          <span>←</span>
          <span>بازگشت به صفحه اصلی</span>
        </Link>
        <Badge variant="brand" size="sm">
          ورود امن لقمه
        </Badge>
      </div>

      {/* Main Login Form Box wrapped in Suspense for useSearchParams */}
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-stone-200">
              <Spinner size="lg" />
            </div>
          }
        >
          <OtpLoginForm />
        </Suspense>
      </div>

      <div className="mt-8 text-center text-xs text-loqme-neutral-500 max-w-xs leading-relaxed">
        ورود به معنای پذیرش قوانین ایمنی مواد غذایی و شرایط استفاده از خدمات لقمه (Loqme) است.
      </div>
    </div>
  );
}
