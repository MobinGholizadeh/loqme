'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toPersianDigits } from '@/lib/utils/persian';

export default function MerchantOrdersPage() {
  const [pickupCode, setPickupCode] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupCode.length === 4) {
      setVerifiedSuccess(true);
      setTimeout(() => setVerifiedSuccess(false), 4000);
      setPickupCode('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-loqme-neutral-900">صف تحویل حضوری مشتریان</h1>
        <p className="text-xs text-loqme-neutral-500 mt-1">
          برای تکمیل تحویل، کد ۴ رقمی ارائه شده توسط مشتری را وارد کرده یا بارکد را اسکن کنید.
        </p>
      </div>

      {/* Quick Verification Form */}
      <Card variant="elevated" className="p-5 bg-white border-loqme-primary-200">
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Input
              label="کد ۴ رقمی تحویل سفارش مشتری:"
              placeholder="مثال: ۴۸۲۱"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value)}
              maxLength={4}
              className="text-center font-mono text-xl tracking-widest"
              autoFocus
            />
          </div>
          <Button type="submit" size="md" variant="primary" disabled={pickupCode.length !== 4}>
            ✓ تایید و تحویل بسته
          </Button>
          <Button type="button" size="md" variant="secondary">
            📷 اسکن QR
          </Button>
        </form>

        {verifiedSuccess && (
          <div className="mt-3 p-3 bg-loqme-success-50 border border-loqme-success-500 text-loqme-success-700 rounded-lg text-sm font-semibold flex items-center gap-2">
            <span>✓</span>
            <span>بسته با موفقیت تحویل شد! وضعیت سفارش به «تکمیل شده» تغییر یافت.</span>
          </div>
        )}
      </Card>

      {/* Pending Pickups Queue List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-loqme-neutral-800">
          سفارشات در انتظار مراجعه مشتری (امروز ساعت ۱۹:۰۰ الی ۲۰:۳۰):
        </h3>

        <Card variant="elevated" className="p-4 bg-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-loqme-neutral-900">سارا محمدی</span>
              <Badge variant="brand" size="sm">
                کد رهگیری: LQ-10492
              </Badge>
            </div>
            <div className="text-xs text-loqme-neutral-500 mt-1">
              ۱ × بسته شگفت‌انگیز نان تازه و کروسان عصرانه
            </div>
          </div>
          <div className="text-left">
            <Badge variant="warning" size="md">
              کد تایید: {toPersianDigits('4821')}
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
