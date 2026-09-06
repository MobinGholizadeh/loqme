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
      <header className="customer-header sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-loqme-neutral-200 px-4 py-2.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="brand-logo flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-loqme-primary-600 text-white flex items-center justify-center font-black text-lg shadow-xs group-hover:bg-loqme-primary-700 transition-colors">
                ل
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-loqme-neutral-900 leading-none">لقمه</span>
                <span className="text-[10px] font-semibold text-loqme-primary-600 leading-tight">کشف هوشمند</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 mr-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5',
                      isActive
                        ? 'bg-loqme-primary-50 text-loqme-primary-700 font-bold'
                        : 'text-loqme-neutral-600 hover:text-loqme-neutral-900 hover:bg-loqme-neutral-100'
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="location-pill hidden sm:flex items-center gap-1.5 text-xs text-loqme-neutral-700 bg-loqme-neutral-100 px-3 py-1 rounded-full border border-loqme-neutral-200">
              <span className="text-loqme-primary-600">📍</span>
              <span className="font-medium">ارومیه (شهر لانچ)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-loqme-neutral-50 border border-loqme-neutral-200 hover:bg-loqme-neutral-100 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-loqme-primary-100 text-loqme-primary-700 font-bold text-xs flex items-center justify-center">
                    {user.fullName ? user.fullName[0] : '👤'}
                  </div>
                  <span className="text-xs font-bold text-loqme-neutral-800 hidden sm:inline">
                    {user.fullName || 'حساب کاربری'}
                  </span>
                </Link>
                <Button size="sm" variant="ghost" onClick={handleLogout} className="text-xs text-loqme-neutral-500 hover:text-loqme-danger-600">
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
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24 md:pb-12">{children}</main>

      {/* Trust & Transparency Persian Footer */}
      <footer className="mt-auto border-t border-loqme-neutral-200 bg-white text-loqme-neutral-600 text-xs py-8 px-4 hidden md:block">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-loqme-neutral-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-loqme-primary-600">لقمه (Loqme)</span>
            </div>
            <p className="text-xs text-loqme-neutral-500 leading-relaxed">
              بازارچه محلی کشف هوشمندانه خوراکی‌های تازه و مازاد روزانه با ۵۰٪ تا ۷۰٪ تخفیف و ارزش اقتصادی ملموس.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-loqme-neutral-800">ایمنی مواد غذایی</h4>
            <p className="text-[11px] text-loqme-neutral-500 leading-relaxed">
              محصولات دارای تاریخ مصرف معتبر، بهداشتی و مورد تایید اصناف هستند. کالای تاریخ‌گذشته تحت هر شرایطی ممنوع است.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-loqme-neutral-800">شهرهای تحت پوشش</h4>
            <p className="text-[11px] text-loqme-neutral-500 leading-relaxed">
              فاز ۱ (لانچ بازار): ارومیه<br />
              فاز ۲ (توسعه کلانشهر): تهران
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-loqme-neutral-800">اصالت و قانونمندی</h4>
            <p className="text-[11px] text-loqme-neutral-500 leading-relaxed">
              تحویل حضوری با رمز یک‌بارمصرف و QR کد معتبر در فروشگاه‌های تاییدشده محله.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pt-4 flex items-center justify-between text-[11px] text-loqme-neutral-400">
          <span>© ۱۴۰۵ لقمه. کلیه حقوق محفوظ است. loqme.shop</span>
          <span className="flex items-center gap-2">
            <span>🛡️ خرید مطمئن</span>
            <span>•</span>
            <span>🌱 صرفه‌جویی پایدار</span>
          </span>
        </div>
      </footer>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="customer-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-loqme-neutral-200 px-3 py-1.5 md:hidden shadow-lg">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'nav-tab flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all',
                  isActive && 'nav-tab-active bg-loqme-primary-50'
                )}
              >
                <span className="nav-icon text-lg leading-none">{item.icon}</span>
                <span className="nav-label text-[10px] font-bold mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style jsx>{`
        .nav-tab {
          color: var(--loqme-neutral-500);
          transition: transform 160ms var(--ease-out), color 160ms ease, background-color 160ms ease;
        }

        .nav-tab:active {
          transform: scale(0.92);
        }

        .nav-tab-active {
          color: var(--loqme-primary-600);
          font-weight: 700;
        }

        .nav-tab-active .nav-icon {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};
