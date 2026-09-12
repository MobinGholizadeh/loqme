'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
import { Icons } from '@/components/ui/icons';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Visual Hero Section (Matches Screenshots 2 & 3) */}
      <div className="relative md:w-1/2 min-h-[300px] md:min-h-screen bg-[#0E484E] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden select-none">
        {/* Atmospheric Lifestyle Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-banner.jpg"
            alt="Loqme Food Discovery"
            fill
            priority
            className="object-cover object-center opacity-30 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#092225] via-[#0E484E]/90 to-[#135E66]/95" />
        </div>

        {/* Top Header on Visual Side: White Brand Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <LoqmeLogo size="md" variant="horizontal" theme="white" />
          </Link>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20 text-xs font-medium backdrop-blur-md">
            <Icons.Shield size={14} className="text-[#65CF9B]" />
            <span>پلتفرم امن و رسمی</span>
          </div>
        </div>

        {/* Center Prominent Headline & Video / Guide Badge (Screenshot 3 style) */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
          {/* Interactive Guide Badge (Matches Screenshot 3's "How Too Good To Go works") */}
          <Link
            href="/#how-it-works"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-xs sm:text-sm font-bold text-white transition-all shadow-sm group active:scale-95"
          >
            <div className="w-5 h-5 rounded-full bg-white text-[#135E66] flex items-center justify-center font-black text-[10px] pl-0.5 group-hover:scale-110 transition-transform">
              ▶
            </div>
            <span>چگونه لقمه کار می‌کند؟ (راهنمای ۴ مرحله‌ای)</span>
          </Link>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
              نجات غذای تازه و خوشمزه،
              <br />
              <span className="text-[#65CF9B]">با ارزش اقتصادی واقعی</span>
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-teal-100/90 leading-relaxed font-normal">
              در سراسر شهر، با همان کیفیت عالی و بسته‌بندی شناسنامه‌دار. از نانوایی‌ها، قنادی‌ها و کافه‌های مورد علاقه خود با تخفیف ۵۰٪ تا ۷۰٪ خرید کنید.
            </p>
          </div>

          {/* Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#65CF9B]/20 text-[#65CF9B] flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="font-semibold text-teal-50">تضمین ۱۰۰٪ سلامت و بهداشت</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-[#65CF9B]/20 text-[#65CF9B] flex items-center justify-center font-bold">
                ✓
              </div>
              <span className="font-semibold text-teal-50">رزرو ۱۰ دقیقه‌ای با شاپرک</span>
            </div>
          </div>
        </div>

        {/* Footer Copyright on Visual Side (Matches Screenshot 2's "© Too Good To Go") */}
        <div className="relative z-10 text-[11px] text-teal-200/70 pt-4 border-t border-white/10 flex items-center justify-between">
          <span>© ۱۴۰۵ سامانه لقمه (loqme.shop)</span>
          <span className="hidden sm:inline">کشف هوشمندانه خوراکی‌های روزانه</span>
        </div>
      </div>

      {/* Form Side (Right in LTR, Left in RTL, clean white foundation) */}
      <div className="md:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-16 bg-[#FAF7F5] md:bg-white overflow-y-auto">
        {/* Top return link */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="text-xs font-bold text-stone-600 hover:text-[#135E66] flex items-center gap-1.5 transition-colors p-1 rounded-lg"
          >
            <span>←</span>
            <span>بازگشت به صفحه اصلی</span>
          </Link>
          <Badge variant="brand" size="sm">
            ورود امن لقمه
          </Badge>
        </div>

        {/* Main Form Center Box */}
        <div className="max-w-md w-full mx-auto my-auto py-4">
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

        {/* Bottom Terms */}
        <div className="mt-8 text-center text-[11px] text-stone-400 max-w-sm mx-auto leading-relaxed">
          ورود یا ثبت‌نام در سامانه به منزله پذیرش{' '}
          <Link href="/rules" className="underline hover:text-stone-700">
            قوانین ایمنی مواد غذایی
          </Link>{' '}
          و شرایط استفاده از خدمات لقمه است.
        </div>
      </div>
    </div>
  );
}
