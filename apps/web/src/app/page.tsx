'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toPersianDigits } from '@/lib/utils/persian';

export default function HomePage() {
  const [sessionUser, setSessionUser] = useState<{
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
          setSessionUser(data.user);
        } else {
          setSessionUser(null);
        }
      })
      .catch(() => setSessionUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSessionUser(null);
  };

  const steps = [
    {
      step: '۱',
      icon: '🔍',
      title: 'کشف بسته‌ها در محله',
      desc: 'نانوایی‌ها، کافه‌ها و قنادی‌های معتبر اطراف خود در ارومیه و تهران را با بسته‌های شگفت‌انگیز بررسی کنید.',
    },
    {
      step: '۲',
      icon: '⏱️',
      title: 'رزرو ۱۰ دقیقه‌ای',
      desc: 'بسته مورد نظر را رزرو کنید؛ موجودی بلافاصله به مدت ۱۰ دقیقه قفل شده و به فرد دیگری فروخته نمی‌شود.',
    },
    {
      step: '۳',
      icon: '💳',
      title: 'پرداخت امن آنلاین',
      desc: 'مبلغ نهایی را با ۵۰٪ تا ۷۰٪ تخفیف واقعی از طریق درگاه رسمی شاپرک پرداخت نمایید.',
    },
    {
      step: '۴',
      icon: '🛍️',
      title: 'تحویل حضوری تازه',
      desc: 'در بازه زمانی اعلام‌شده به فروشگاه مراجعه کرده و با ارائه کد اختصاصی LQ، بسته خود را تحویل بگیرید.',
    },
  ];

  const features = [
    {
      icon: '✨',
      title: 'هیجان کشف و شگفتی',
      desc: 'تجربه خرید بسته‌های هیجان‌انگیز از بهترین خوراکی‌های روز با ارزش چندبرابر قیمت پرداختی.',
    },
    {
      icon: '💰',
      title: 'ارزش اقتصادی ملموس',
      desc: 'صرفه‌جویی مستقیم ۵۰٪ تا ۷۰٪ روی قیمت واقعی منو، بدون هیچ‌گونه تخفیف ساختگی یا فریبنده.',
    },
    {
      icon: '🛡️',
      title: 'تضمین ۱۰۰٪ ایمنی مواد غذایی',
      desc: 'فروش هرگونه کالای تاریخ‌گذشته، فاسد یا دست‌خورده در لقمه اکیداً ممنوع و غیرقابل گذشت است.',
    },
    {
      icon: '🌱',
      title: 'ارزش پایدار محلی',
      desc: 'کمک به بقای پایدار مشاغل محلی محله و جلوگیری از دورریز خوراکی‌های تازه و خوشمزه.',
    },
  ];

  const urmiaNeighborhoods = [
    { name: 'دانشکده', slug: 'daneshkadeh' },
    { name: 'شیخ‌تپه', slug: 'sheykh-tappeh' },
    { name: 'استادان', slug: 'ostadan' },
    { name: 'خیام', slug: 'khayyam' },
    { name: 'کاشانی', slug: 'kashani' },
    { name: 'بهداری', slug: 'behdari' },
    { name: 'خیابان امام', slug: 'emam' },
  ];

  return (
    <div className="min-h-screen bg-loqme-neutral-25 text-loqme-neutral-900 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-loqme-neutral-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-loqme-primary-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
                ل
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-loqme-neutral-900 leading-none">لقمه</span>
                <span className="text-[10px] font-semibold text-loqme-primary-600 leading-tight">کشف هوشمند</span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-loqme-neutral-600 bg-loqme-neutral-100 px-3 py-1 rounded-full border border-loqme-neutral-200">
              <span className="text-loqme-primary-600">📍</span>
              <span>ارومیه (شهر لانچ) • تهران (توسعه)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/explore">
              <Button size="sm" variant="ghost" className="hidden sm:inline-flex text-xs font-bold">
                کاوش محله
              </Button>
            </Link>

            {sessionUser ? (
              <div className="flex items-center gap-2">
                <Link href="/orders">
                  <Button size="sm" variant="secondary" className="text-xs">
                    سفارشات من
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={handleLogout} className="text-xs text-loqme-neutral-500">
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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative z-10 text-center max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 bg-loqme-primary-50 text-loqme-primary-800 border border-loqme-primary-200 px-3.5 py-1.5 rounded-full text-xs font-bold">
              <span>✨</span>
              <span>کشف هوشمندانه خوراکی‌های تازه و خوشمزه در محله</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-loqme-neutral-950 leading-tight tracking-tight">
              طعم تازه خوراکی‌های روز با{' '}
              <span className="text-loqme-primary-600 underline decoration-loqme-primary-200 underline-offset-8">
                تخفیف‌های واقعی ۵۰٪ تا ۷۰٪
              </span>
            </h1>

            <p className="text-sm md:text-base text-loqme-neutral-600 leading-relaxed max-w-2xl mx-auto">
              نانوایی‌ها، شیرینی‌پزی‌های اصیل و کافه‌های معتبر شهر، مازاد روزانه و تازه‌شان را به جای دورریز،
              با قیمت‌های فوق‌العاده در قالب بسته‌های شگفت‌انگیز در اختیار شما قرار می‌دهند.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Link href="/explore">
                <Button size="lg" variant="primary" className="text-sm md:text-base px-8 font-bold shadow-md">
                  🔍 کاوش بسته‌های شگفت‌انگیز محله
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="text-sm md:text-base px-6">
                  ورود با شماره موبایل
                </Button>
              </Link>
            </div>

            {/* Quick Neighborhood Jump Pills */}
            <div className="pt-6">
              <div className="text-xs text-loqme-neutral-500 mb-2 font-medium">
                محله‌های فعال در ارومیه (تحویل حضوری امروز):
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {urmiaNeighborhoods.map((n) => (
                  <Link
                    key={n.slug}
                    href={`/explore`}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-white hover:bg-loqme-primary-50 text-loqme-neutral-700 hover:text-loqme-primary-700 border border-loqme-neutral-200 transition-colors shadow-xs"
                  >
                    {n.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle decorative background gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-loqme-primary-100/40 via-teal-50/20 to-emerald-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />
      </section>

      {/* Value Stats Highlight */}
      <section className="border-y border-loqme-neutral-200 bg-white py-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black text-loqme-primary-600">۵۰٪ تا ۷۰٪</div>
            <div className="text-xs text-loqme-neutral-500 font-medium">تخفیف واقعی روی قیمت منو</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black text-loqme-neutral-900">۱۰ دقیقه</div>
            <div className="text-xs text-loqme-neutral-500 font-medium">قفل قطعی موجودی در checkout</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black text-emerald-600">۱۰۰٪</div>
            <div className="text-xs text-loqme-neutral-500 font-medium">تضمین سلامت و تاریخ معتبر</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-black text-loqme-primary-700">ارومیه و تهران</div>
            <div className="text-xs text-loqme-neutral-500 font-medium">پوشش محله‌های برگزیده</div>
          </div>
        </div>
      </section>

      {/* How It Works Section (4-Step Loop) */}
      <section className="py-16 px-4 bg-loqme-neutral-50 border-b border-loqme-neutral-200">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Badge variant="brand" size="sm">
              چرخه تجربه کاربری
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black text-loqme-neutral-950">
              لقمه چگونه کار می‌کند؟
            </h2>
            <p className="text-xs md:text-sm text-loqme-neutral-500">
              چهار گام ساده از کشف بسته تا تحویل حضوری خوراکی‌های تازه در محله شما
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((item) => (
              <Card key={item.step} variant="elevated" className="p-5 space-y-3 bg-white relative">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="w-7 h-7 rounded-full bg-loqme-primary-50 text-loqme-primary-700 font-black text-xs flex items-center justify-center border border-loqme-primary-200">
                    {toPersianDigits(item.step)}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-loqme-neutral-900">{item.title}</h3>
                <p className="text-xs text-loqme-neutral-500 leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Core Principles & Trust Pillars */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <Badge variant="success" size="sm">
              ارزش‌ها و استانداردهای لقمه
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black text-loqme-neutral-950">
              چرا می‌توانید به لقمه اعتماد کنید؟
            </h2>
            <p className="text-xs md:text-sm text-loqme-neutral-500">
              تعهد اخلاقی و فنی ما در ایجاد یک بازارچه پایدار و شفاف
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feat, idx) => (
              <Card key={idx} variant="outlined" className="p-5 flex items-start gap-4 bg-loqme-neutral-25">
                <div className="text-2xl p-2.5 rounded-2xl bg-white border border-loqme-neutral-200 shadow-xs">
                  {feat.icon}
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-sm text-loqme-neutral-900">{feat.title}</h3>
                  <p className="text-xs text-loqme-neutral-600 leading-relaxed">{feat.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Merchant Value Proposition Banner */}
      <section className="py-12 px-4 bg-loqme-primary-900 text-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-loqme-primary-800/80 border border-loqme-primary-700 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <Badge variant="brand" size="sm" className="bg-white/20 text-white border-none">
              ویژه فروشگاه‌ها و کسب‌وکارهای محلی
            </Badge>
            <h3 className="text-xl md:text-2xl font-black">
              صاحب نانوایی، کافه یا قنادی در ارومیه یا تهران هستید؟
            </h3>
            <p className="text-xs md:text-sm text-loqme-primary-100/90 leading-relaxed">
              مازاد روزانه خود را بدون هیچ هزینه اولیه به درآمد و جریان نقدینگی تبدیل کنید و پای همسایگان جدیدی را به فروشگاه خود باز کنید.
            </p>
          </div>

          <Link href="/merchant" className="shrink-0">
            <Button size="lg" variant="secondary" className="bg-white text-loqme-primary-800 hover:bg-loqme-primary-50 font-bold">
              ورود به پنل فروشندگان
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-loqme-neutral-200 bg-white text-loqme-neutral-600 text-xs py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-loqme-neutral-100">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-loqme-primary-600">لقمه (Loqme)</span>
            </div>
            <p className="text-xs text-loqme-neutral-500 leading-relaxed">
              بازارچه محلی کشف هوشمندانه خوراکی‌های تازه و مازاد روزانه با ۵۰٪ تا ۷۰٪ تخفیف و ارزش اقتصادی ملموس.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-loqme-neutral-800">دسته‌بندی‌ها</h4>
            <ul className="space-y-1.5 text-xs text-loqme-neutral-500">
              <li>نان و شیرینی سنتی ارومیه</li>
              <li>کافه و دسر</li>
              <li>رستوران و غذای گرم</li>
              <li>سوپرمارکت و مواد غذایی</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-loqme-neutral-800">ایمنی مواد غذایی</h4>
            <p className="text-xs text-loqme-neutral-500 leading-relaxed">
              محصولات دارای تاریخ مصرف معتبر، بهداشتی و مورد تایید اصناف هستند. کالای تاریخ‌گذشته تحت هر شرایطی ممنوع است.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-loqme-neutral-800">شهرهای تحت پوشش</h4>
            <p className="text-xs text-loqme-neutral-500 leading-relaxed">
              فاز ۱ (لانچ بازار): ارومیه (دانشکده، شیخ‌تپه، استادان، خیام...)<br />
              فاز ۲ (توسعه کلانشهر): تهران
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-loqme-neutral-400">
          <span>© ۱۴۰۵ لقمه. کلیه حقوق محفوظ است. loqme.shop</span>
          <div className="flex items-center gap-3">
            <span>🛡️ خرید با ضمانت سلامت</span>
            <span>•</span>
            <span>📱 تحویل با QR کد و OTP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
