'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function MerchantSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-loqme-neutral-900">تنظیمات فروشگاه</h1>
        <p className="text-xs text-loqme-neutral-500 mt-1">
          اطلاعات عمومی، ساعات تحویل پیش‌فرض و پروانه کسب
        </p>
      </div>

      <Card variant="elevated" className="p-6 space-y-4 bg-white">
        <Input
          label="نام فروشگاه در لقمه"
          defaultValue="نانوایی و شیرینی سنتی برکت"
          disabled
        />

        <Input
          label="آدرس دقیق فروشگاه برای مراجعه مشتری"
          defaultValue="تهران، سعادت‌آباد، میدان کاج، خیابان سرو غربی، پلاک ۲۴"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="شروع بازه تحویل پیش‌فرض" defaultValue="19:00" dir="ltr" />
          <Input label="پایان بازه تحویل پیش‌فرض" defaultValue="20:30" dir="ltr" />
        </div>

        <div className="pt-3 border-t border-loqme-neutral-200 flex items-center justify-between">
          <Badge variant="success" size="sm">
            جواز کسب تایید شده توسط بازرس لقمه
          </Badge>
          <Button size="md" variant="primary">
            ذخیره تغییرات
          </Button>
        </div>
      </Card>
    </div>
  );
}
