'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

export default function MerchantDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-loqme-neutral-900">داشبورد فروشگاه</h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            وضعیت موجودی مازاد، فروش و تحویل حضوری امروز
          </p>
        </div>
        <Button size="md" variant="primary">
          + تعریف بسته شگفت‌انگیز جدید
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="p-4 bg-white">
          <span className="text-xs text-loqme-neutral-500 font-medium">بسته‌های فعال امروز</span>
          <div className="text-2xl font-black text-loqme-primary-600 mt-2">
            {toPersianDigits(5)} عدد
          </div>
          <span className="text-[11px] text-loqme-success-600 mt-1 block">
            ۳ عدد رزرو شده توسط مشتریان
          </span>
        </Card>

        <Card variant="elevated" className="p-4 bg-white">
          <span className="text-xs text-loqme-neutral-500 font-medium">فروش قطعی امروز</span>
          <div className="text-2xl font-black text-loqme-neutral-900 mt-2">
            {formatToman(144000)}
          </div>
          <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
            تسویه خالص پس از کسر کارمزد ۱۰٪
          </span>
        </Card>

        <Card variant="elevated" className="p-4 bg-white">
          <span className="text-xs text-loqme-neutral-500 font-medium">امتیاز و رضایت مشتریان</span>
          <div className="text-2xl font-black text-loqme-warning-500 mt-2 flex items-center gap-1">
            <span>⭐</span>
            <span>{toPersianDigits('4.85')}</span>
          </div>
          <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
            بر اساس ۱۴۲ نظر ثبت شده
          </span>
        </Card>
      </div>

      {/* Active Pickup Alert */}
      <Card variant="elevated" className="bg-loqme-primary-50 border-loqme-primary-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="brand" size="md" className="mb-2">
              بازه‌ تحویل فعال امروز
            </Badge>
            <h3 className="font-bold text-base text-loqme-primary-900">
              ساعت ۱۹:۰۰ الی ۲۰:۳۰ (شروع در ۴۵ دقیقه دیگر)
            </h3>
            <p className="text-xs text-loqme-neutral-600 mt-1">
              لطفاً بسته‌های نان و شیرینی رزرو شده را از قبل تفکیک و بسته‌بندی کنید تا هنگام مراجعه
              مشتری با اسکن سریع QR یا کد ۴ رقمی تحویل داده شوند.
            </p>
          </div>
          <Button size="sm" variant="primary">
            مشاهده صف تحویل
          </Button>
        </div>
      </Card>
    </div>
  );
}
