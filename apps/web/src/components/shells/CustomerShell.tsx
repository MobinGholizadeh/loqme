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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/explore');
    }
  };

  const navLinks = [
    { href: '/explore', label: 'کاوش و خرید لقمه', icon: 'lunch_dining' },
    { href: '/orders', label: 'سفارش‌های من', icon: 'receipt_long' },
    { href: '/profile', label: 'ردپای سبز من', icon: 'eco' },
    { href: '/merchant/register', label: 'همکاری فروشگاه‌ها', icon: 'storefront' },
    { href: '/rules', label: 'درباره لقمه', icon: 'info' },
  ];

  return (
    <div className="customer-shell min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Top Header matching Stitch Header design */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_2px_12px_rgba(12,80,74,0.06)]">
        <div className="max-w-7xl mx-auto px-4 md:px-margin-desktop h-20 flex items-center justify-between gap-space-md">
          {/* Right side: Brand Emblem & Location Tag */}
          <div className="flex items-center gap-space-md shrink-0">
            <Link href="/" className="flex items-center gap-space-sm group">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">lunch_dining</span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-lg text-title-lg text-primary font-bold tracking-tight">لقمه</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant">نجات غذا، نجات زمین</span>
              </div>
            </Link>

            <Link
              href="/explore"
              className="hidden xl:flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-full text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              <span className="font-label-sm text-xs font-semibold">ارومیه و تهران</span>
              <span className="font-label-sm text-[11px] text-secondary">(شعاع ۵ ک‌م)</span>
            </Link>
          </div>

          {/* Center: Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-2">
            <div className="relative w-full flex items-center bg-surface-container-low rounded-full px-space-md py-2 text-on-surface-variant border border-transparent focus-within:border-primary-container focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_#0c504a] transition-all">
              <span className="material-symbols-outlined text-[20px] ml-space-sm text-outline">search</span>
              <input
                className="w-full bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline"
                placeholder="جستجوی نانوایی، شیرینی‌فروشی، کافه یا سوپرمارکت..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-outline-variant/20">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1',
                    isActive
                      ? 'bg-primary-container text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Left side: Icons & Profile Avatar */}
          <div className="flex items-center gap-space-sm shrink-0">
            <Link
              href="/orders"
              aria-label="سفارش‌های من"
              className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-space-xs pl-2.5 pr-1 py-1 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                    {user.fullName ? user.fullName[0] : '👤'}
                  </div>
                  <span className="hidden sm:inline font-label-sm text-xs font-semibold px-1 text-on-surface">
                    {user.fullName || 'حساب کاربری'}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  aria-label="خروج"
                  className="p-2 rounded-full text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                  title="خروج از حساب"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="primary" rounded="pill" className="bg-primary hover:bg-primary-container text-white px-4">
                  ورود / عضویت
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content with 80px top padding for fixed navbar */}
      <main className="flex-1 w-full pt-20 pb-24 md:pb-12">{children}</main>

      {/* Stitch-Tuned Deep Pine / Teal Footer */}
      <footer className="mt-auto bg-[#003833] text-white py-14 px-4 border-t border-primary-container/60">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#0C504A]">
            {/* Column 1: Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0C504A] flex items-center justify-center text-[#70F8E8]">
                  <span className="material-symbols-outlined text-[24px]">lunch_dining</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-lg font-black text-white">سامانه لقمه</h3>
                  <p className="text-xs text-[#96D2C9]">نجات هوشمند مازاد تازه خوراکی‌ها</p>
                </div>
              </div>
              <p className="text-xs text-teal-100/80 leading-relaxed text-justify">
                پلتفرم پایدار محلی برای کشف و خرید بسته‌های باکیفیت و تازه نانوایی‌ها، قنادی‌ها، کافه‌ها و رستوران‌ها با ۵۰٪ تا ۷۰٪ تخفیف واقعی. از اسراف غذا جلوگیری کنید و هوشمندانه خرید نمایید.
              </p>
            </div>

            {/* Column 2: Categories */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#70F8E8]">دسته‌بندی‌های اصلی</h4>
              <ul className="space-y-2 text-xs text-teal-100/80">
                <li><Link href="/explore?cat=bakery" className="hover:text-white transition-colors">🥐 نانوایی و قنادی</Link></li>
                <li><Link href="/explore?cat=cafe" className="hover:text-white transition-colors">☕ کافه و دسر</Link></li>
                <li><Link href="/explore?cat=restaurant" className="hover:text-white transition-colors">🍕 رستوران و غذای گرم</Link></li>
                <li><Link href="/explore?cat=supermarket" className="hover:text-white transition-colors">🛒 سوپرمارکت و میوه</Link></li>
                <li><Link href="/explore?cat=healthy" className="hover:text-white transition-colors">🥗 سالاد و رژیمی</Link></li>
              </ul>
            </div>

            {/* Column 3: Merchants & Guild */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#70F8E8]">فروشندگان و اصناف</h4>
              <ul className="space-y-2 text-xs text-teal-100/80">
                <li><Link href="/merchant/register" className="hover:text-white transition-colors">ثبت‌نام فروشگاه جدید</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">ورود به پنل فروشندگان</Link></li>
                <li><Link href="/rules" className="hover:text-white transition-colors">دستورالعمل‌های بهداشت و ایمنی</Link></li>
                <li><Link href="/rules#pricing" className="hover:text-white transition-colors">ضوابط بسته‌های شگفت‌انگیز</Link></li>
              </ul>
            </div>

            {/* Column 4: Health & Legal Guarantee */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[#70F8E8]">تضمین سلامت و کیفیت</h4>
              <p className="text-xs text-teal-100/80 leading-relaxed">
                تمام اقلام عرضه‌شده در لقمه تحت نظارت اصناف و کاملاً سالم و قانونی هستند. فروش هرگونه غذای مانده، تاریخ‌گذشته یا غیراستاندارد در لقمه غیرمجاز است.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#0C504A] text-[11px] font-bold text-[#70F8E8] border border-[#2EC4B6]/30">
                  🛡️ تضمین سلامت ۱۰۰٪
                </span>
                <span className="px-3 py-1 rounded-full bg-[#0C504A] text-[11px] font-bold text-[#70F8E8] border border-[#2EC4B6]/30">
                  ⚡ کد تحویل رمزنگاری‌شده LQ
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-teal-200/70 gap-3">
            <span>© ۱۴۰۵ کلیه حقوق برای پلتفرم لقمه (loqme.shop) محفوظ است.</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">حریم خصوصی</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-white transition-colors">شرایط و قوانین</Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-white transition-colors">تماس با ما</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile-First Bottom Navigation Bar with Stitch Material 3 Styling */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-outline-variant/40 px-3 py-2 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around">
          {[
            { href: '/explore', label: 'کاوش غذا', icon: 'explore' },
            { href: '/orders', label: 'سفارش‌ها', icon: 'receipt_long' },
            { href: '/profile', label: 'ردپای سبز', icon: 'eco' },
            { href: user ? '/profile' : '/login', label: user ? 'پروفایل' : 'ورود', icon: 'account_circle' },
          ].map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 active:scale-95',
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-6 rounded-full flex items-center justify-center mb-0.5 transition-colors',
                    isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <span className="text-[11px] leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
