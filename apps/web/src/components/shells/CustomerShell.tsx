'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
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
    { href: '/explore', label: 'کاوش بسته‌ها', icon: '🔍' },
    { href: '/orders', label: 'سفارشات من', icon: '🛍️' },
    { href: '/profile', label: 'پروفایل', icon: '👤' },
  ];

  return (
    <div className="customer-shell min-h-screen flex flex-col bg-[#FAF7F5]">
      {/* Top Header */}
      <header className="customer-header sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-loqme-neutral-200 px-4 py-2.5 transition-all shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="brand-logo flex items-center group">
              <LoqmeLogo size="md" variant="horizontal" theme="teal" />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5',
                      isActive
                        ? 'bg-loqme-primary-50 text-loqme-primary-700'
                        : 'text-loqme-neutral-600 hover:text-loqme-neutral-900 hover:bg-loqme-neutral-100'
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="location-pill hidden lg:flex items-center gap-1.5 text-xs text-loqme-neutral-700 bg-loqme-neutral-100 px-3.5 py-1 rounded-full border border-loqme-neutral-200">
              <span className="text-loqme-primary-600 font-bold">📍</span>
              <span className="font-semibold">ارومیه (شهر لانچ) • تهران</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/merchant/register" className="hidden sm:inline-flex">
              <Button size="sm" variant="accent" rounded="pill">
                همکاری با ما
              </Button>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-loqme-neutral-100 border border-loqme-neutral-200 hover:bg-loqme-primary-50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-loqme-primary-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.fullName ? user.fullName[0] : '👤'}
                  </div>
                  <span className="text-xs font-bold text-loqme-neutral-800 hidden sm:inline">
                    {user.fullName || 'حساب من'}
                  </span>
                </Link>
                <Button size="sm" variant="ghost" rounded="pill" onClick={handleLogout} className="text-xs text-loqme-neutral-500 hover:text-loqme-danger-600">
                  خروج
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="primary" rounded="pill">
                  ورود / ثبت‌نام
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 pb-24 md:pb-12">{children}</main>

      {/* Deep Teal Branded Footer (Matches Design Template) */}
      <footer className="mt-auto bg-[#135E66] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-teal-700/60">
            {/* Column 1: Brand Logo & Description */}
            <div className="space-y-4">
              <LoqmeLogo size="lg" variant="stacked" theme="white" subtext="سامانه کشف هوشمند خوراکی‌های تازه" />
              <p className="text-xs text-teal-100/90 leading-relaxed text-center md:text-right">
                سامانه لقمه پلتفرم اجتماعی و اقتصادی پایدار برای کشف خوراکی‌های روزانه و تازه با ۵۰٪ تا ۷۰٪ تخفیف واقعی است. با هم از هدررفت غذا جلوگیری می‌کنیم.
              </p>
            </div>

            {/* Column 2: Categories */}
            <div className="space-y-3">
              <h4 className="font-black text-sm text-teal-100">دسته‌بندی‌ها</h4>
              <ul className="space-y-2 text-xs text-teal-200">
                <li><Link href="/explore?cat=bakery" className="hover:text-white transition-colors">نانوایی و قنادی</Link></li>
                <li><Link href="/explore?cat=cafe" className="hover:text-white transition-colors">کافه و دسر</Link></li>
                <li><Link href="/explore?cat=restaurant" className="hover:text-white transition-colors">رستوران و غذای گرم</Link></li>
                <li><Link href="/explore?cat=supermarket" className="hover:text-white transition-colors">سوپرمارکت و میوه</Link></li>
                <li><Link href="/explore?cat=healthy" className="hover:text-white transition-colors">سالاد و غذای سالم</Link></li>
              </ul>
            </div>

            {/* Column 3: Merchants & Business */}
            <div className="space-y-3">
              <h4 className="font-black text-sm text-teal-100">فروشندگان و همکاران</h4>
              <ul className="space-y-2 text-xs text-teal-200">
                <li><Link href="/merchant/register" className="hover:text-white transition-colors">ثبت‌نام فروشگاه جدید</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">ورود به پنل فروشندگان</Link></li>
                <li><Link href="/rules" className="hover:text-white transition-colors">راهنمای ایمنی و بهداشت مواد غذایی</Link></li>
                <li><Link href="/rules#pricing" className="hover:text-white transition-colors">قوانین بسته‌های شگفت‌انگیز</Link></li>
              </ul>
            </div>

            {/* Column 4: Trust & Safety */}
            <div className="space-y-3">
              <h4 className="font-black text-sm text-teal-100">اصالت و قانونمندی</h4>
              <p className="text-xs text-teal-100/90 leading-relaxed">
                کلیه محصولات دارای مجوز بهداشتی، تاریخ مصرف معتبر و مورد تایید اصناف هستند. فروش غذای مانده، تاریخ‌گذشته یا دست‌خورده در لقمه اکیداً ممنوع است.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-teal-800/80 text-[11px] font-bold text-teal-100 border border-teal-600">
                  🛡️ تضمین سلامت ۱۰۰٪
                </span>
                <span className="px-3 py-1 rounded-full bg-teal-800/80 text-[11px] font-bold text-teal-100 border border-teal-600">
                  ⚡ تحویل امن LQ
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-teal-200/80 gap-3">
            <span>© ۱۴۰۵ کلیه حقوق برای سامانه لقمه (loqme.shop) محفوظ است.</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">حریم خصوصی</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-white transition-colors">قوانین و مقررات</Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-white transition-colors">پشتیبانی و تماس</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-stone-200 px-3 py-1.5 md:hidden shadow-lg">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-150 active:scale-90',
                  isActive
                    ? 'bg-teal-50 text-[#135E66] font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                )}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] font-bold mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
