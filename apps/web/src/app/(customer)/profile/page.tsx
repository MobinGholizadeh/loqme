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
    <div className="space-y-6 max-w-4xl mx-auto pb-16 px-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-primary">ردپای سبز و حساب کاربری</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            گزارش اثرات زیست‌محیطی، پس‌انداز هوشمند و مدیریت هویت کاربری
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          rounded="pill"
          onClick={handleLogout}
          className="text-error border-outline-variant hover:bg-error-container/20 text-xs font-bold"
        >
          خروج از حساب
        </Button>
      </div>

      {/* User Info Card */}
      <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center text-2xl font-black shadow-xs">
          {user?.fullName ? user.fullName[0] : '👤'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-on-surface">
              {user?.fullName || 'کاربر لقمه'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container">
              {user?.role || 'CUSTOMER'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 font-mono">
            {user ? toPersianDigits(user.mobile) : 'در حال بارگذاری...'}
          </p>
        </div>
      </div>

      {/* Stitch Design Board: Green Impact Dashboard Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-secondary">eco</span>
            <span>ردپای سبز نجات غذا (Green Impact Dashboard)</span>
          </h2>
          <span className="text-xs font-semibold text-secondary">محاسبه بر اساس استانداردهای فائو</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Metric 1: CO2 Saved */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1 text-center">
            <div className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-1">
              <span className="material-symbols-outlined text-[20px]">cloud_done</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary">{toPersianDigits(15.2)}</div>
            <div className="text-[11px] text-on-surface-variant font-medium">کیلوگرم CO2e ذخیره‌شده</div>
          </div>

          {/* Metric 2: Water Saved */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1 text-center">
            <div className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-1">
              <span className="material-symbols-outlined text-[20px]">water_drop</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary">{toPersianDigits(4200)}</div>
            <div className="text-[11px] text-on-surface-variant font-medium">لیتر آب مجازی صرفه‌جویی</div>
          </div>

          {/* Metric 3: Meals Saved */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1 text-center">
            <div className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center mx-auto mb-1">
              <span className="material-symbols-outlined text-[20px]">lunch_dining</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary">{toPersianDigits(6)}</div>
            <div className="text-[11px] text-on-surface-variant font-medium">بسته غذای نجات‌یافته</div>
          </div>

          {/* Metric 4: Financial Savings */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-1 text-center">
            <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mx-auto mb-1">
              <span className="material-symbols-outlined text-[20px]">savings</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary">{formatToman(450000)}</div>
            <div className="text-[11px] text-on-surface-variant font-medium">سود مستقیم اقتصادی</div>
          </div>
        </div>
      </div>

      {/* Badges & Achievements Shelf */}
      <div className="rounded-3xl bg-surface-container-low border border-outline-variant/30 p-5 space-y-3">
        <h3 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-secondary">military_tech</span>
          <span>نشان‌ها و افتخارات نجات غذا</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex items-center gap-3">
            <span className="text-2xl">🥇</span>
            <div>
              <div className="font-bold text-xs text-on-surface">قهرمان محله</div>
              <div className="text-[11px] text-on-surface-variant">بیش از ۵ خرید موفق</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex items-center gap-3">
            <span className="text-2xl">🥖</span>
            <div>
              <div className="font-bold text-xs text-on-surface">دوستدار نان تازه</div>
              <div className="text-[11px] text-on-surface-variant">نجات نان و شیرینی سنتی</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="font-bold text-xs text-on-surface">تحویل سر وقت</div>
              <div className="text-[11px] text-on-surface-variant">۱۰۰٪ پایبندی به ساعت تحویل</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Shell Switchers for Dev/Demo */}
      <div className="rounded-2xl bg-surface-container-low border border-outline-variant/30 p-4 space-y-2.5">
        <div className="text-xs font-bold text-on-surface-variant">دسترسی سریع به پنل‌های سازمانی:</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            rounded="pill"
            onClick={() => router.push('/merchant')}
            className="bg-surface-container-lowest text-on-surface hover:bg-surface-container-high border border-outline-variant/30 text-xs"
          >
            ورود به پنل فروشندگان
          </Button>
          <Button
            size="sm"
            variant="ghost"
            rounded="pill"
            onClick={() => router.push('/admin')}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-xs"
          >
            ورود به کنسول مدیریت ارشد
          </Button>
        </div>
      </div>
    </div>
  );
}
