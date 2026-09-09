'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ResponsiveHeroBanner } from '@/components/ui/responsive-hero-banner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
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

  const categories = [
    { name: 'نان و شیرینی‌پزی', slug: 'bakery', icon: '🥐' },
    { name: 'کافه و دسر', slug: 'cafe', icon: '☕' },
    { name: 'سالاد و غذای سبک', slug: 'healthy', icon: '🥗' },
    { name: 'پیتزا و فست‌فود', slug: 'restaurant', icon: '🍕' },
    { name: 'میوه و سبزیجات', slug: 'produce', icon: '🍎' },
    { name: 'سوپرمارکت و اغذیه', slug: 'supermarket', icon: '🛒' },
  ];

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
      desc: 'در بازه زمانی اعلام‌شده به فروشگاه مراجعه کرده و با ارائه رمز یکبارمصرف اختصاصی LQ، بسته خود را تحویل بگیرید.',
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
    <div className="min-h-screen bg-[#FAF7F5] text-[#222026] flex flex-col font-sans selection:bg-[#135E66] selection:text-white">
      {/* Sleek Hero Banner with Woman Holding Loqme Bags & Floating Pill Header */}
      <ResponsiveHeroBanner
        backgroundImageUrl="/hero-banner.jpg"
        badgeLabel="جدید"
        badgeText="تخفیف‌های ۵۰٪ تا ۷۰٪ روی خوراکی‌های تازه روزانه"
        title="نجات غذای تازه و باکیفیت"
        titleLine2="از دورریز روزانه محله‌تان"
        description="کشف بسته‌های شگفت‌انگیز و خریدهای لحظه‌ای از کافه‌ها، نانوایی‌ها و قنادی‌های برتر با همان کیفیت عالی و قیمتی باورنکردنی."
        primaryButtonText="مشاهده بسته‌های امروز"
        primaryButtonHref="#categories"
        secondaryButtonText="نحوه کارکرد سامانه"
        secondaryButtonHref="#how-it-works"
        ctaButtonText={sessionUser ? "سفارشات من" : "ورود / ثبت‌نام"}
        ctaButtonHref={sessionUser ? "/orders" : "/login"}
        navLinks={[
          { label: "صفحه اصلی", href: "/" },
          { label: "کاوش محله", href: "#categories" },
          { label: "دسته‌بندی‌ها", href: "#categories" },
          { label: "فلسفه لقمه", href: "#mission" },
          { label: "نحوه کارکرد", href: "#how-it-works" },
        ]}
        partnersTitle="با همکاری برترین کافه‌ها، نانوایی‌ها و قنادی‌های ارومیه و تهران"
      />

      {/* Category Navigation Ribbon (Signature Deep Teal Sticky Bar) */}
      <section id="categories" className="bg-[#135E66] border-y border-teal-700/60 py-3.5 px-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-extrabold text-teal-200 hidden sm:inline">دسته‌ها:</span>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/explore?category=${cat.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-800/80 hover:bg-teal-700 text-white text-xs font-bold transition-all border border-teal-600/60 shadow-xs shrink-0 active:scale-95 group"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>

          <Link href="/explore" className="shrink-0 hidden md:inline-flex items-center gap-1 text-xs font-bold text-[#65CF9B] hover:text-white transition-colors">
            <span>کاوش روی نقشه</span>
            <span className="rtl:rotate-180 inline-block">←</span>
          </Link>
        </div>
      </section>

      {/* Mission / Philosophy Card (Warm White Card Foundation) */}
      <section id="mission" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-white border border-stone-200/90 p-8 sm:p-12 text-center space-y-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#65CF9B]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F0FDFA] flex items-center justify-center text-[#135E66] border border-teal-100 shadow-xs">
              <LoqmeLogo size={32} variant="icon" theme="teal" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#222026] leading-snug">
              لقمه؛ بستری هوشمند برای نجات خوراکی‌های باکیفیت و تازه
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-stone-600 leading-relaxed max-w-2xl mx-auto font-normal">
              سامانه لقمه با الهام از پیشرفته‌ترین الگوهای پایدار جهانی طراحی شده تا شهروندان و کسب‌وکارهای محلی را در کنار یکدیگر توانمند سازد؛ خوراکی‌های خوشمزه و تازه‌ای که روزانه تولید می‌شوند، به جای هدررفت، با ارزش اقتصادی ملموس به دست شما برسند.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[#135E66]">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">🛡️ تضمین ۱۰۰٪ سلامت و بهداشت</span>
              <span className="hidden sm:inline text-stone-300">•</span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">🌱 مسئولیت اجتماعی و پایدار</span>
              <span className="hidden sm:inline text-stone-300">•</span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">💰 ۵۰٪ تا ۷۰٪ صرفه‌جویی اقتصادی</span>
            </div>
          </div>
        </div>
      </section>

      {/* Branded Lifestyle & Imagery Grid (4 Clean White Cards) */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <span>🌱</span>
              <span>تجربه اصیل لقمه</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#222026]">
              سفری آسان و لذت‌بخش از کشف تا تحویل
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
              ببینید چطور شهروندان و نانوایی‌ها در سراسر ارومیه و تهران با لقمه تجربه‌ای هوشمند می‌سازند
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Mobile Discovery */}
            <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src="/lifestyle-1.jpg"
                  alt="Customer Mobile Discovery"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-[#222026]">کشف هوشمند با موبایل</h4>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    بررسی بسته‌های شگفت‌انگیز در نقشه محله و رزرو سریع در ۱۰ دقیقه.
                  </p>
                </div>
                <Link href="/explore" className="text-xs font-bold text-[#135E66] pt-2 inline-flex items-center gap-1 group-hover:text-emerald-700">
                  <span>کاوش سریع محله</span>
                  <span className="rtl:rotate-180 inline-block">←</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Merchant Handover */}
            <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src="/lifestyle-2.jpg"
                  alt="Friendly Merchant Handover"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-[#222026]">تحویل حضوری با لبخند</h4>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    دریافت بسته تازه در فروشگاه با ارائه رمز یکبارمصرف اختصاصی LQ.
                  </p>
                </div>
                <Link href="/rules" className="text-xs font-bold text-[#135E66] pt-2 inline-flex items-center gap-1 group-hover:text-emerald-700">
                  <span>امنیت ۱۰۰٪ خرید</span>
                  <span className="rtl:rotate-180 inline-block">←</span>
                </Link>
              </div>
            </div>

            {/* Card 3: Mobile App */}
            <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src="/lifestyle-3.jpg"
                  alt="Mobile App Interface"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-[#222026]">رابط کاربری مدرن</h4>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    تجربه کاربری سریع و کاملاً فارسی با طراحی متناسب با وب‌اپلیکیشن و موبایل.
                  </p>
                </div>
                <Link href="/explore" className="text-xs font-bold text-[#135E66] pt-2 inline-flex items-center gap-1 group-hover:text-emerald-700">
                  <span>نصب آسان PWA</span>
                  <span className="rtl:rotate-180 inline-block">←</span>
                </Link>
              </div>
            </div>

            {/* Card 4: Branded Produce Bag */}
            <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src="/lifestyle-4.jpg"
                  alt="Fresh Loqme Produce Bag"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-base text-[#222026]">بسته‌های شگفت‌انگیز</h4>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    خوراکی‌های روزانه و تازه با چند برابر ارزش ریالی نسبت به قیمت پرداختی.
                  </p>
                </div>
                <Link href="#categories" className="text-xs font-bold text-[#135E66] pt-2 inline-flex items-center gap-1 group-hover:text-emerald-700">
                  <span>تخفیف واقعی منو</span>
                  <span className="rtl:rotate-180 inline-block">←</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Stats Highlight Strip */}
      <section className="border-y border-stone-200/80 bg-white py-10 px-4 my-6 shadow-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl md:text-4xl font-black text-[#135E66]">۵۰٪ تا ۷۰٪</div>
            <div className="text-xs text-stone-500 font-medium">تخفیف واقعی روی قیمت منو</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-4xl font-black text-[#222026]">۱۰ دقیقه</div>
            <div className="text-xs text-stone-500 font-medium">قفل قطعی موجودی در رزرو</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-4xl font-black text-emerald-600">۱۰۰٪</div>
            <div className="text-xs text-stone-500 font-medium">تضمین سلامت و تاریخ معتبر</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-4xl font-black text-[#135E66]">ارومیه و تهران</div>
            <div className="text-xs text-stone-500 font-medium">پوشش محله‌های برگزیده</div>
          </div>
        </div>
      </section>

      {/* How It Works Section (4-Step Loop) */}
      <section id="how-it-works" className="py-14 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2.5 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              چرخه هوشمند خرید
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-[#222026]">
              لقمه چگونه کار می‌کند؟
            </h2>
            <p className="text-xs md:text-sm text-stone-500">
              چهار گام ساده از کشف بسته تا تحویل حضوری خوراکی‌های تازه در محله شما
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((item) => (
              <div key={item.step} className="p-6 space-y-3 bg-white border border-stone-200/90 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.icon}</span>
                  <span className="w-8 h-8 rounded-full bg-[#FAF7F5] text-[#135E66] font-black text-xs flex items-center justify-center border border-teal-200">
                    {toPersianDigits(item.step)}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#222026]">{item.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick Neighborhood Jump Pills */}
          <div className="pt-6 text-center">
            <div className="text-xs text-stone-500 mb-3 font-medium">
              محله‌های فعال در ارومیه (تحویل حضوری امروز):
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {urmiaNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/explore`}
                  className="text-xs font-semibold px-4 py-2 rounded-full bg-white hover:bg-emerald-50 text-stone-700 hover:text-[#135E66] border border-stone-200 transition-colors shadow-xs"
                >
                  {n.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* App Download CTA Banner */}
      <section className="py-14 px-4 bg-[#F0FDFA] border-t border-teal-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-[#135E66]">
              اپلیکیشن لقمه را همیشه همراه داشته باشید
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
              بسته‌های شگفت‌انگیز هر روز در ساعات مشخصی از عصر باز می‌شوند؛ اپلیکیشن را نصب کنید تا هیچ تخفیفی را از دست ندهید.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-full bg-[#135E66] hover:bg-[#0F4E55] px-6 py-3 text-sm font-bold text-white transition-all shadow-md hover:scale-105"
            >
              <span>📲 نصب سریع وب‌اپلیکیشن (PWA)</span>
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-stone-50 px-5 py-3 text-sm font-medium text-[#135E66] border border-teal-200 transition-all shadow-xs"
            >
              <span>🍏 نسخه iOS در سیبچه و اناردونی</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-stone-50 px-5 py-3 text-sm font-medium text-[#135E66] border border-teal-200 transition-all shadow-xs"
            >
              <span>🤖 کافه بازار و مایکت</span>
            </button>
          </div>
        </div>
      </section>

      {/* Deep Teal Template Footer with Exact White Logo */}
      <footer className="mt-auto bg-[#135E66] text-white py-14 px-4 border-t border-teal-700/60">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-teal-700/50">
            {/* Column 1: Brand Logo & Description */}
            <div className="space-y-4 text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-800/80 flex items-center justify-center p-2 ring-1 ring-emerald-400/40 shadow-inner overflow-hidden shrink-0">
                  <LoqmeLogo variant="icon" size={24} theme="white" />
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-black text-xl text-white leading-none">لقمه</span>
                  <span className="text-[10px] text-emerald-300 font-sans tracking-wider uppercase font-medium mt-0.5">Loqme.shop</span>
                </div>
              </div>
              <p className="text-xs text-teal-100/90 leading-relaxed">
                سامانه لقمه پلتفرم اجتماعی و اقتصادی برای کشف خوراکی‌های روزانه و تازه با ۵۰٪ تا ۷۰٪ تخفیف واقعی است. با هم از هدررفت غذا جلوگیری می‌کنیم.
              </p>
            </div>

            {/* Column 2: Categories */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-teal-100">دسته‌بندی‌ها</h4>
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
              <h4 className="font-bold text-sm text-teal-100">فروشندگان و همکاران</h4>
              <ul className="space-y-2 text-xs text-teal-200">
                <li><Link href="/merchant/register" className="hover:text-white transition-colors">ثبت‌نام فروشگاه جدید</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">ورود به پنل فروشندگان</Link></li>
                <li><Link href="/rules" className="hover:text-white transition-colors">راهنمای ایمنی و بهداشت مواد غذایی</Link></li>
                <li><Link href="/rules#pricing" className="hover:text-white transition-colors">قوانین بسته‌های شگفت‌انگیز</Link></li>
              </ul>
            </div>

            {/* Column 4: Trust & Safety */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-teal-100">اصالت و قانونمندی</h4>
              <p className="text-xs text-teal-100/90 leading-relaxed">
                کلیه محصولات دارای مجوز بهداشتی، تاریخ مصرف معتبر و مورد تایید اصناف هستند. فروش غذای مانده، تاریخ‌گذشته یا دست‌خورده در لقمه اکیداً ممنوع است.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-teal-800/90 text-[11px] font-bold text-teal-100 border border-teal-600">
                  🛡️ تضمین سلامت ۱۰۰٪
                </span>
                <span className="px-3 py-1 rounded-full bg-teal-800/90 text-[11px] font-bold text-teal-100 border border-teal-600">
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
    </div>
  );
}
