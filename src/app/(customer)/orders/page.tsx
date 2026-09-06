'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

export default function OrdersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-loqme-neutral-900">سفارشات من</h2>
        <Badge variant="brand" size="sm">
          ۱ سفارش فعال
        </Badge>
      </div>

      {/* Active Order Card */}
      <Card variant="elevated" className="border-loqme-primary-200 bg-white">
        <div className="flex items-start justify-between pb-3 border-b border-loqme-neutral-100">
          <div>
            <div className="text-xs text-loqme-neutral-500">
              کد پیگیری: <span className="font-mono font-bold text-loqme-neutral-800">LQ-10492</span>
            </div>
            <h3 className="font-bold text-base text-loqme-neutral-900 mt-1">نانوایی و شیرینی سنتی برکت</h3>
            <p className="text-xs text-loqme-neutral-600">۱ × بسته شگفت‌انگیز نان تازه و کروسان عصرانه</p>
          </div>
          <Badge variant="success" size="md">
            آماده تحویل حضوری
          </Badge>
        </div>

        {/* Dynamic OTP / QR Handoff Preview */}
        <div className="my-4 p-4 bg-loqme-primary-50 rounded-xl border border-loqme-primary-200 text-center">
          <div className="text-xs font-semibold text-loqme-primary-800 mb-1">
            کد تحویل حضوری به متصدی فروشگاه:
          </div>
          <div className="text-3xl font-black font-mono tracking-widest text-loqme-primary-600 my-2">
            {toPersianDigits('4821')}
          </div>
          <div className="text-[11px] text-loqme-neutral-600">
            بازه‌ تحویل: امروز ساعت ۱۹:۰۰ الی ۲۰:۳۰ • آدرس: تهران، سعادت‌آباد، خیابان سرو غربی
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm">
            مبلغ پرداختی: <span className="font-bold text-loqme-neutral-900">{formatToman(48000)}</span>
          </div>
          <Button size="sm" variant="secondary">
            مسیریابی فروشگاه
          </Button>
        </div>
      </Card>
    </div>
  );
}
