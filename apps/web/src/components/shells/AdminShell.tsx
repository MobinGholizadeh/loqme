'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface AdminShellProps {
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
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
    { href: '/admin', label: 'داشبورد نظارت و آمار', icon: '📈' },
    { href: '/admin/merchants', label: 'تایید و مدیریت فروشگاه‌ها', icon: '🛡️' },
    { href: '/admin/customers', label: 'مدیریت کاربران و مشتریان', icon: '👥' },
    { href: '/admin/listings', label: 'نظارت بر بسته‌ها و دسته‌ها', icon: '📦' },
    { href: '/admin/moderation', label: 'مرکز شکایات و داوری', icon: '🚨' },
    { href: '/admin/finance', label: 'کارمزد و تسویه حساب', icon: '💰' },
    { href: '/admin/audit', label: 'لاگ‌های حسابرسی و امنیتی', icon: '📜' },
    { href: '/admin/settings', label: 'تنظیمات و پیکربندی سیستم', icon: '⚙️' },
  ];

  return (
    <div className="admin-shell min-h-screen flex flex-col md:flex-row bg-loqme-neutral-900 text-white">
      {/* Dark modern Admin Sidebar */}
      <aside className="admin-sidebar w-full md:w-64 bg-loqme-neutral-950 border-b md:border-b-0 md:border-l border-loqme-neutral-800 flex flex-col">
        <div className="p-4 border-b border-loqme-neutral-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <LoqmeLogo size="sm" variant="horizontal" theme="white" subtext="کنسول نظارت ارشد" />
          </Link>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-loqme-primary-600 text-white font-bold'
                    : 'text-loqme-neutral-300 hover:bg-loqme-neutral-800 hover:text-white'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-loqme-neutral-800 mt-auto">
          <div className="text-xs text-loqme-neutral-400 mb-2">
            اپراتور: <span className="text-white font-semibold">{user?.fullName || 'مدیر سامانه'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="flex-1">
              <Button size="sm" variant="ghost" className="w-full text-xs text-loqme-neutral-300">
                مشاهده بازار
              </Button>
            </Link>
            <Button size="sm" variant="destructive" onClick={handleLogout} className="text-xs">
              خروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-loqme-neutral-900">{children}</main>
    </div>
  );
};
