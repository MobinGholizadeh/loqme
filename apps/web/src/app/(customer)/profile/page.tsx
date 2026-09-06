'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    mobile: string;
    role: string;
    fullName?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-loqme-neutral-900">حساب کاربری</h2>
        <Button size="sm" variant="ghost" onClick={handleLogout} className="text-loqme-danger-600">
          خروج از حساب
        </Button>
      </div>

      {/* User Info Card */}
      <Card variant="elevated" className="p-5 flex items-center gap-4 bg-white">
        <div className="w-16 h-16 rounded-2xl bg-loqme-primary-100 text-loqme-primary-600 flex items-center justify-center text-2xl font-black">
          {user?.fullName ? user.fullName[0] : '👤'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-loqme-neutral-900">
              {user?.fullName || 'کاربر لقمه'}
            </h3>
            <Badge variant="brand" size="sm">
              {user?.role || 'CUSTOMER'}
            </Badge>
          </div>
          <p className="text-xs text-loqme-neutral-500 mt-1 font-mono">
            {user ? toPersianDigits(user.mobile) : 'در حال بارگذاری...'}
          </p>
        </div>
      </Card>

      {/* Cumulative Savings Card (UX Psychology Anchor) */}
      <Card variant="elevated" className="bg-gradient-to-br from-emerald-50 to-white border-loqme-success-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-loqme-success-700">
            🌱 پس‌انداز هوشمندانه شما در لقمه:
          </span>
          <Badge variant="success" size="sm">
            ارزش اقتصادی ملموس
          </Badge>
        </div>
        <div className="text-2xl font-black text-loqme-success-600">
          {formatToman(450000)}
        </div>
        <p className="text-xs text-loqme-neutral-500 mt-2">
          با نجات ۶ بسته مازاد باکیفیت تا به امروز به این میزان در هزینه‌های خود صرفه‌جویی کرده‌اید.
        </p>
      </Card>

      {/* Quick Shell Switchers for testing */}
      <Card variant="flat" className="p-4 space-y-3">
        <div className="text-xs font-bold text-loqme-neutral-700">دسترسی سریع به پنل‌ها:</div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => router.push('/merchant')}>
            ورود به پنل فروشگاه
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push('/admin')}>
            ورود به کنسول مدیریت
          </Button>
        </div>
      </Card>
    </div>
  );
}
