'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

const CATEGORIES = [
  { id: 'all', name: 'همه دسته‌ها', icon: '✨' },
  { id: 'bakery', name: 'نان و شیرینی', icon: '🥐' },
  { id: 'cafe', name: 'کافه و دسر', icon: '☕' },
  { id: 'supermarket', name: 'سوپرمارکت', icon: '🛒' },
  { id: 'restaurant', name: 'غذای گرم', icon: '🍲' },
];

const MOCK_BAGS = [
  {
    id: '1',
    storeName: 'نانوایی و شیرینی سنتی برکت',
    category: 'نان و شیرینی',
    title: 'بسته شگفت‌انگیز نان تازه و کروسان عصرانه',
    originalPrice: 120000,
    discountedPrice: 48000,
    remainingQty: 3,
    pickupWindow: 'امروز ۱۹:۰۰ تا ۲۰:۳۰',
    distanceKm: '۰.۸',
    safetyVerified: true,
  },
  {
    id: '2',
    storeName: 'کافه راش سعادت‌آباد',
    category: 'کافه و دسر',
    title: 'بسته کوکی، دونات تازه و شیک میوه‌ای',
    originalPrice: 180000,
    discountedPrice: 69000,
    remainingQty: 2,
    pickupWindow: 'امروز ۲۰:۰۰ تا ۲۱:۳۰',
    distanceKm: '۱.۲',
    safetyVerified: true,
  },
  {
    id: '3',
    storeName: 'سوپر میوه و ارگانیک سرو',
    category: 'سوپرمارکت',
    title: 'جعبه میوه دست‌چین تازه فصل',
    originalPrice: 150000,
    discountedPrice: 55000,
    remainingQty: 5,
    pickupWindow: 'امروز ۲۱:۰۰ تا ۲۲:۳۰',
    distanceKm: '۱.۹',
    safetyVerified: true,
  },
];

export default function ExplorePage() {
  return (
    <div className="space-y-6">
      {/* Search & Location Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-loqme-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-loqme-neutral-400">🔍</span>
          <input
            type="text"
            placeholder="جستجوی شیرینی، قهوه، غذا و فروشگاه..."
            className="w-full bg-transparent border-none text-sm outline-none text-loqme-neutral-800 placeholder:text-loqme-neutral-400"
          />
        </div>
        <Badge variant="brand" size="sm">
          فیلترها
        </Badge>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat, idx) => (
          <button
            key={cat.id}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              idx === 0
                ? 'bg-loqme-primary-500 text-white shadow-xs'
                : 'bg-white text-loqme-neutral-700 border border-loqme-neutral-200 hover:bg-loqme-neutral-50'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Discovery Section Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-loqme-neutral-900">بسته‌های شگفت‌انگیز در نزدیکی شما</h2>
          <p className="text-xs text-loqme-neutral-500 mt-0.5">آماده تحویل حضوری در ساعات آینده</p>
        </div>
        <Badge variant="success" size="sm">
          {toPersianDigits(MOCK_BAGS.length)} بسته موجود
        </Badge>
      </div>

      {/* Surprise Bags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_BAGS.map((bag) => {
          const discountPercent = Math.round(
            ((bag.originalPrice - bag.discountedPrice) / bag.originalPrice) * 100
          );

          return (
            <Card key={bag.id} variant="elevated" isInteractive className="p-4 flex flex-col justify-between">
              <div>
                {/* Store Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-loqme-neutral-900">{bag.storeName}</h3>
                    <span className="text-[11px] text-loqme-neutral-500">
                      فاصله: {bag.distanceKm} کیلومتر • {bag.category}
                    </span>
                  </div>
                  {bag.safetyVerified && (
                    <Badge variant="success" size="sm">
                      ✓ تضمین بهداشت
                    </Badge>
                  )}
                </div>

                {/* Bag Title */}
                <div className="font-medium text-sm text-loqme-neutral-800 my-2">
                  {bag.title}
                </div>

                {/* Pickup Window Indicator */}
                <div className="bg-loqme-primary-50 text-loqme-primary-800 text-xs px-2.5 py-1 rounded-md flex items-center justify-between my-2">
                  <span>⏰ تحویل: {bag.pickupWindow}</span>
                  <span className="font-semibold text-[11px] text-loqme-warning-600">
                    تنها {toPersianDigits(bag.remainingQty)} عدد باقی‌مانده
                  </span>
                </div>
              </div>

              {/* Price & Action Footer */}
              <div className="pt-3 border-t border-loqme-neutral-200 mt-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-loqme-neutral-400 line-through">
                    {formatToman(bag.originalPrice)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-loqme-primary-600">
                      {formatToman(bag.discountedPrice)}
                    </span>
                    <Badge variant="brand" size="sm">
                      {toPersianDigits(discountPercent)}٪ تخفیف
                    </Badge>
                  </div>
                </div>

                <Button size="sm" variant="primary">
                  رزرو ۱۰ دقیقه‌ای
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
