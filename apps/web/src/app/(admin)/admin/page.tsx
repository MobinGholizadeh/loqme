'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">کنسول نظارت و مدیریت ارشد لقمه</h1>
          <p className="text-xs text-loqme-neutral-400 mt-1">
            پایش لحظه‌ای بازارچه، فروشگاه‌ها، ایمنی مواد غذایی و تراکنش‌ها
          </p>
        </div>
        <Badge variant="success" size="md">
          🟢 کلیه سرویس‌ها فعال
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700">
          <span className="text-xs text-loqme-neutral-400">فروشگاه‌های فعال و تایید شده</span>
          <div className="text-3xl font-black text-loqme-primary-400 mt-2">
            {toPersianDigits(1)}
          </div>
          <span className="text-[11px] text-loqme-neutral-400 mt-1 block">
            ۱ فروشگاه در انتظار بررسی جواز
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700">
          <span className="text-xs text-loqme-neutral-400">حجم کل تراکنش‌های پلتفرم</span>
          <div className="text-3xl font-black text-white mt-2">
            {formatToman(144000)}
          </div>
          <span className="text-[11px] text-loqme-success-500 mt-1 block">
            سهم کارمزد پلتفرم: {formatToman(14400)}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700">
          <span className="text-xs text-loqme-neutral-400">شکایات ایمنی یا فساد غذا</span>
          <div className="text-3xl font-black text-loqme-success-500 mt-2">
            {toPersianDigits(0)}
          </div>
          <span className="text-[11px] text-loqme-neutral-400 mt-1 block">
            ۱۰۰٪ انطباق با قوانین بهداشتی
          </span>
        </div>
      </div>

      {/* Platform Infrastructure Health */}
      <div className="p-6 rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700 space-y-4">
        <h3 className="font-bold text-base text-white">وضعیت زیرساخت فنی (M01 Foundation Status):</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
            <span className="text-loqme-neutral-300">پایگاه داده PostgreSQL 15:</span>
            <Badge variant="success" size="sm">
              متصل (Docker / Local)
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
            <span className="text-loqme-neutral-300">موتور احراز هویت پیامکی (OTP):</span>
            <Badge variant="success" size="sm">
              فعال (Console Mock / CSPRNG)
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
            <span className="text-loqme-neutral-300">کنترل دسترسی نقش‌محور (RBAC):</span>
            <Badge variant="brand" size="sm">
              فعال در لایه Middleware
            </Badge>
          </div>

          <div className="p-3 rounded-lg bg-loqme-neutral-900 border border-loqme-neutral-700 flex items-center justify-between">
            <span className="text-loqme-neutral-300">طراحی و فونت Vazirmatn در حالت RTL:</span>
            <Badge variant="success" size="sm">
              تایید شده (dir=&quot;rtl&quot;)
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
