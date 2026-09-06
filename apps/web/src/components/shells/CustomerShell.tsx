'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface CustomerShellProps {
  children: React.ReactNode;
}

export const CustomerShell: React.FC<CustomerShellProps> = ({ children }) => {
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
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { href: '/explore', label: 'کاوش', icon: '🔍' },
    { href: '/orders', label: 'سفارشات من', icon: '🛍️' },
    { href: '/profile', label: 'پروفایل', icon: '👤' },
  ];

  return (
    <div className="customer-shell min-h-screen flex flex-col bg-loqme-neutral-25">
      {/* Top Header */}
      <header className="customer-header sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-loqme-neutral-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="brand-logo flex items-center gap-1.5">
              <span className="text-2xl font-black text-loqme-primary-600">لقمه</span>
              <Badge variant="brand" size="sm">
                کشف هوشمند
              </Badge>
            </Link>

            <div className="location-pill hidden sm:flex items-center gap-1 text-xs text-loqme-neutral-600 bg-loqme-neutral-100 px-2.5 py-1 rounded-full">
              <span>📍</span>
              <span>تهران، سعادت‌آباد</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-loqme-neutral-700 hidden sm:inline">
                  {user.fullName || 'کاربر لقمه'}
                </span>
                <Button size="sm" variant="ghost" onClick={handleLogout} className="text-xs">
                  خروج
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="primary">
                  ورود / ثبت‌نام
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-24">{children}</main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="customer-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-loqme-neutral-200 px-2 py-1.5 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:shadow-lg">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('nav-tab flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all', isActive && 'nav-tab-active')}
              >
                <span className="nav-icon text-lg">{item.icon}</span>
                <span className="nav-label text-[11px] font-medium mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style jsx>{`
        .nav-tab {
          color: var(--loqme-neutral-500);
          transition: transform 160ms var(--ease-out), color 160ms ease;
        }

        .nav-tab:active {
          transform: scale(0.92);
        }

        .nav-tab-active {
          color: var(--loqme-primary-600);
          font-weight: 600;
        }

        .nav-tab-active .nav-icon {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};
