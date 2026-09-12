'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import {
  DashboardSquare01Icon,
  Store01Icon,
  UserIcon,
  ShoppingBag01Icon,
  AlertCircleIcon,
  Settings01Icon,
  Logout01Icon,
  SparklesIcon,
} from 'hugeicons-react';
import { Icons } from '@/components/ui/icons';

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
    { href: '/admin', label: 'داشبورد نظارت و آمار', icon: DashboardSquare01Icon },
    { href: '/admin/analytics', label: 'تحلیل داده‌ها و بازار', icon: SparklesIcon },
    { href: '/admin/merchants', label: 'تایید و مدیریت فروشگاه‌ها', icon: Store01Icon },
    { href: '/admin/customers', label: 'مدیریت کاربران و مشتریان', icon: UserIcon },
    { href: '/admin/listings', label: 'نظارت بر بسته‌ها و دسته‌ها', icon: ShoppingBag01Icon },
    { href: '/admin/moderation', label: 'مرکز شکایات و داوری', icon: AlertCircleIcon },
    { href: '/admin/finance', label: 'کارمزد و تسویه حساب', icon: ShoppingBag01Icon },
    { href: '/admin/audit', label: 'لاگ‌های حسابرسی و امنیتی', icon: Icons.Shield },
    { href: '/admin/settings', label: 'تنظیمات و پیکربندی سیستم', icon: Settings01Icon },
  ];

  return (
    <div className="admin-shell min-h-screen flex flex-col md:flex-row bg-[#FAF7F5] text-stone-900 font-sans">
      {/* Crisp White Admin Sidebar */}
      <aside className="admin-sidebar w-full md:w-64 bg-white border-b md:border-b-0 md:border-l border-stone-200 flex flex-col shadow-xs">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <LoqmeLogo size="sm" variant="horizontal" theme="teal" subtext="کنسول نظارت ارشد" />
          </Link>
          <Badge variant="danger" size="sm">
            Admin
          </Badge>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComp = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                  isActive
                    ? 'bg-teal-50 text-[#135E66] border border-teal-200 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                )}
              >
                <IconComp size={18} className={isActive ? 'text-[#135E66]' : 'text-stone-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 mt-auto bg-stone-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-[#135E66] flex items-center justify-center font-bold text-xs">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 truncate">
              <div className="text-xs font-bold text-stone-900 truncate">
                {user?.fullName || 'مدیر سیستم'}
              </div>
              <div className="text-[10px] text-stone-400 font-mono">مدیر کل</div>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-1.5"
          >
            <Logout01Icon size={14} />
            <span>خروج از پنل مدیریت</span>
          </Button>
        </div>
      </aside>

      {/* Main Viewport Content in White-First Theme */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#FAF7F5] min-h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
