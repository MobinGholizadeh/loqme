'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { toPersianDigits, formatToman } from '@/lib/utils/persian';

export default function HomePage() {
  const [sessionUser, setSessionUser] = useState<{
    id: string;
    mobile: string;
    role: string;
    fullName?: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  // Fetch session on load
  const loadSession = () => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setSessionUser(data.user);
        } else {
          setSessionUser(null);
        }
      })
      .catch(() => setSessionUser(null));
  };

  useEffect(() => {
    loadSession();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSessionUser(null);
  };

  return (
    <div className="min-h-screen bg-loqme-neutral-25 text-loqme-neutral-900 pb-20">
      {/* Top Banner Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-loqme-neutral-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-loqme-primary-600">لقمه</span>
            <Badge variant="brand" size="sm">
              نسخه پایه M01
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {sessionUser ? (
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    sessionUser.role === 'ADMIN'
                      ? 'danger'
                      : sessionUser.role.startsWith('MERCHANT')
                      ? 'brand'
                      : 'success'
                  }
                  size="md"
                >
                  {sessionUser.role}
                </Badge>
                <span className="text-xs font-medium text-loqme-neutral-700">
                  {sessionUser.fullName || sessionUser.mobile}
                </span>
                <Button size="sm" variant="ghost" onClick={handleLogout}>
                  خروج
                </Button>
              </div>
            ) : (
              <Badge variant="neutral" size="md">
                وضعیت: کاربر مهمان
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-6">
        <div className="bg-white border border-loqme-neutral-200 rounded-3xl p-6 md:p-10 shadow-card">
          <div className="max-w-2xl">
            <Badge variant="brand" size="md" className="mb-3">
              پایه‌گذاری زیرساخت نرم‌افزار — Milestone M01
            </Badge>
            <h1 className="text-2xl md:text-4xl font-extrabold text-loqme-neutral-950 leading-tight mb-4">
              بازارچه محلی کشف خوراکی‌های تازه و مازاد با ارزش فوق‌العاده
            </h1>
            <p className="text-sm md:text-base text-loqme-neutral-600 mb-6 leading-relaxed">
              این پلتفرم برای تجربه یک خرید هوشمندانه طراحی شده است؛ غذاهای سالم و بسته‌های شگفت‌انگیز را
              با تخفیف‌های جذاب و در بازه‌های زمانی مشخص به صورت حضوری تحویل بگیرید.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/explore">
                <Button size="lg" variant="primary">
                  🔍 ورود به نمای خریدار (Customer Shell)
                </Button>
              </Link>
              <Link href="/merchant">
                <Button size="lg" variant="secondary">
                  🏪 پنل فروشگاه (Merchant Shell)
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="ghost">
                  🛡️ کنسول مدیریت (Admin Shell)
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: Auth Test Bench & Shell Matrix */}
      <section className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Live OTP Auth Testing */}
        <div className="lg:col-span-5">
          <div className="sticky top-20">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span>🔐</span>
              <span>تست زنده احراز هویت پیامکی (OTP)</span>
            </h2>
            <React.Suspense
              fallback={
                <Card variant="elevated" className="p-8 flex items-center justify-center">
                  <span className="text-sm text-loqme-neutral-500">در حال بارگذاری...</span>
                </Card>
              }
            >
              <OtpLoginForm onSuccess={loadSession} />
            </React.Suspense>
          </div>
        </div>

        {/* Right Column (7 Cols): Foundation Highlights & UI Primitives Showcase */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shell Routes Showcase Card */}
          <Card variant="elevated">
            <h3 className="text-base font-bold text-loqme-neutral-900 mb-3 flex items-center gap-2">
              <span>🌐</span>
              <span>پوسته‌های نرم‌افزار و نقش‌های کاربری (RBAC)</span>
            </h3>
            <p className="text-xs text-loqme-neutral-600 mb-4">
              مسیرهای زیر بر اساس توکن امضا شده HttpOnly محافظت شده و به صورت خودکار کاربران را بر اساس نقش هدایت می‌کنند:
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-loqme-neutral-50 rounded-xl border border-loqme-neutral-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">🛍️ اپلیکیشن خریدار (Customer)</div>
                  <div className="text-xs text-loqme-neutral-500">مسیر: /explore و /orders • دسترسی: عمومی و خریدار</div>
                </div>
                <Link href="/explore">
                  <Button size="sm" variant="secondary">
                    مشاهده پوسته
                  </Button>
                </Link>
              </div>

              <div className="p-3 bg-loqme-neutral-50 rounded-xl border border-loqme-neutral-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">🥖 پرتال فروشندگان (Merchant)</div>
                  <div className="text-xs text-loqme-neutral-500">مسیر: /merchant/* • دسترسی: MERCHANT_OWNER, STAFF</div>
                </div>
                <Link href="/merchant">
                  <Button size="sm" variant="secondary">
                    مشاهده پوسته
                  </Button>
                </Link>
              </div>

              <div className="p-3 bg-loqme-neutral-50 rounded-xl border border-loqme-neutral-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">🛡️ کنسول مدیریت ارشد (Admin)</div>
                  <div className="text-xs text-loqme-neutral-500">مسیر: /admin/* • دسترسی: ADMIN</div>
                </div>
                <Link href="/admin">
                  <Button size="sm" variant="secondary">
                    مشاهده پوسته
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Design Engineering & UI Primitives Showcase */}
          <Card variant="elevated">
            <h3 className="text-base font-bold text-loqme-neutral-900 mb-3 flex items-center gap-2">
              <span>🎨</span>
              <span>المان‌های رابط کاربری و اصول مهندسی طراحی (Emil Kowalski)</span>
            </h3>

            {/* Buttons Showcase */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-loqme-neutral-500 block mb-2">
                دکمه‌ها (فیدبک لمسی مقیاس ۰.۹۷، ترنزیشن اختصاصی و اسپینر):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary">دکمه اصلی</Button>
                <Button variant="secondary">دکمه ثانویه</Button>
                <Button variant="ghost">دکمه متنی</Button>
                <Button variant="destructive">دکمه خطر</Button>
                <Button
                  variant="primary"
                  isLoading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 1500);
                  }}
                >
                  {btnLoading ? 'در حال پردازش' : 'تست لودینگ'}
                </Button>
              </div>
            </div>

            {/* Badges Showcase */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-loqme-neutral-500 block mb-2">
                نشان‌ها (Semantic Badges):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">برند لقمه</Badge>
                <Badge variant="success">تضمین سلامت و کیفیت</Badge>
                <Badge variant="warning">تنها ۲ عدد باقی‌مانده</Badge>
                <Badge variant="danger">منقضی شده</Badge>
                <Badge variant="neutral">سفارش شماره {toPersianDigits('10492')}</Badge>
              </div>
            </div>

            {/* Persian Formatter & Currency Showcase */}
            <div className="p-3 bg-loqme-primary-50 rounded-xl border border-loqme-primary-200">
              <div className="text-xs font-bold text-loqme-primary-800 mb-1">
                فرمت‌کننده تومان و اعداد فارسی:
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>قیمت اصلی: <s className="text-loqme-neutral-500">{formatToman(120000)}</s></span>
                <span className="font-bold text-loqme-primary-600 text-base">
                  قیمت لقمه: {formatToman(45000)}
                </span>
                <Badge variant="success" size="sm">
                  {toPersianDigits(62)}٪ تخفیف
                </Badge>
              </div>
            </div>

            {/* Modal Trigger */}
            <div className="mt-4 pt-3 border-t border-loqme-neutral-200 flex items-center justify-between">
              <span className="text-xs text-loqme-neutral-600">
                مودال با افکت بلور پس‌زمینه و انیمیشن مقیاس ۰.۹۵:
              </span>
              <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
                باز کردن مودال آزمایشی
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Interactive Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="مودال استاندارد لقمه"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              متوجه شدم
            </Button>
          </>
        }
      >
        <p className="text-sm text-loqme-neutral-700 leading-relaxed mb-3">
          این مودال از قوانین مهندسی طراحی پیروی می‌کند:
        </p>
        <ul className="text-xs text-loqme-neutral-600 space-y-2 list-disc list-inside">
          <li>ورود با ترنزیشن مقیاس ۰.۹۵ به ۱ (هیچ المانی در واقعیت از نقطه صفر ظاهر نمی‌شود).</li>
          <li>منحنی حرکتی شتاب‌دار <code>cubic-bezier(0.23, 1, 0.32, 1)</code> برای واکنش آنی و روان.</li>
          <li>افکت محوشدگی بلور روی پس‌زمینه بدون افت فریم.</li>
          <li>بستن سریع با کلید Escape یا کلیک خارج از کادر.</li>
        </ul>
      </Modal>
    </div>
  );
}
