'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface MerchantShellProps {
  children: React.ReactNode;
}

export const MerchantShell: React.FC<MerchantShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; fullName?: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/merchant', label: 'داشبورد فروشگاه', icon: '📊' },
    { href: '/merchant/listings', label: 'مدیریت بسته‌های مازاد', icon: '📦' },
    { href: '/merchant/orders', label: 'تحویل حضوری و اسکن QR', icon: '🛍️' },
    { href: '/merchant/settings', label: 'تنظیمات و ساعات کاری', icon: '⚙️' },
  ];

  return (
    <div className="merchant-shell min-h-screen flex flex-col md:flex-row bg-loqme-neutral-100">
      {/* Sidebar for Desktop / Tablet */}
      <aside className="merchant-sidebar w-full md:w-64 bg-white border-b md:border-b-0 md:border-l border-loqme-neutral-200 flex flex-col">
        <div className="sidebar-header p-4 border-b border-loqme-neutral-200 flex items-center justify-between">
          <Link href="/merchant" className="flex items-center gap-2">
            <LoqmeLogo size="sm" variant="horizontal" subtext="پنل همکاران" />
          </Link>
        </div>

        {/* Store Switcher Widget */}
        <div className="store-switcher p-3 m-3 rounded-xl bg-loqme-primary-50 border border-loqme-primary-200">
          <div className="text-xs text-loqme-primary-700 font-semibold mb-1">فروشگاه فعال:</div>
          <div className="font-bold text-sm text-loqme-neutral-900">نانوایی و شیرینی سنتی برکت</div>
          <div className="text-[11px] text-loqme-neutral-600 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-loqme-success-500 animate-pulse"></span>
            <span>تایید شده • وضعیت تحویل: فعال</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-loqme-primary-600 text-white shadow-sm'
                    : 'text-loqme-neutral-700 hover:bg-loqme-neutral-100'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & footer actions */}
        <div className="sidebar-footer p-4 border-t border-loqme-neutral-200 mt-auto">
          <div className="text-xs text-loqme-neutral-500 mb-2">
            ورود با: <span className="font-semibold text-loqme-neutral-800">{user?.fullName || 'همکار گرامی'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="flex-1">
              <Button size="sm" variant="ghost" className="w-full text-xs">
                نمای مشتری
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="text-xs text-loqme-danger-600">
              خروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Merchant Portal Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
};
