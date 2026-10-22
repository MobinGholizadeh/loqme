"use client";

import Link from "next/link";
import { ArrowDown, ArrowLeft, Compass, ShoppingBag, Store, MapPin, CreditCard, QrCode } from "lucide-react";
import { ContainerScroll, CardsContainer, CardTransformed } from "@/components/ui/animated-cards-stack";

const steps = [
  { number: "۰۱", Icon: Compass, title: "یک کشف خوشمزه", text: "پیشنهادهای نزدیکت را ببین و بسته‌ی دلخواهت را پیدا کن", Detail: MapPin, detail: "جزئیات بسته، قیمت و زمان دریافت را پیش از انتخاب بخوان", label: "کشف کن" },
  { number: "۰۲", Icon: ShoppingBag, title: "این لقمه برای تو", text: "بسته را رزرو کن و پرداخت آنلاین را پیش از پایان زمان رزرو انجام بده", Detail: CreditCard, detail: "پس از پرداخت موفق، اطلاعات سفارش و کد دریافتت را ببین", label: "رزرو و پرداخت کن" },
  { number: "۰۳", Icon: Store, title: "از محله، به دست تو", text: "در بازه‌ی دریافت به فروشگاه برو و بسته‌ات را حضوری تحویل بگیر", Detail: QrCode, detail: "کد یا QR دریافت سفارش را به فروشگاه نشان بده", label: "تحویل بگیر" },
];

export function PickupSteps() {
  return <section className="pickup-story" aria-labelledby="pickup-story-title">
    <ContainerScroll>
      <div className="pickup-sticky">
        <picture className="pickup-backdrop">
          <source media="(max-width: 767px)" srcSet="/images/home/pickup-counter-mobile-480.webp 480w, /images/home/pickup-counter-mobile-941.webp 941w" sizes="100vw" />
          <img src="/images/home/pickup-counter-desktop-1672.webp" srcSet="/images/home/pickup-counter-desktop-960.webp 960w, /images/home/pickup-counter-desktop-1672.webp 1672w" sizes="100vw" alt="" width={1672} height={941} loading="lazy" decoding="async" />
        </picture>
        <header className="pickup-heading">
          <span className="landing-kicker">از کشف تا دریافت</span>
          <h2 id="pickup-story-title">سه قدم تا <span>لقمه‌ی بعدی تو</span></h2>
          <p>انتخاب با تو، خوشمزگی از محله</p>
        </header>
        <div className="pickup-stage">
          <CardsContainer>
            {steps.map(({ number, Icon, title, text, Detail, detail, label }, index) => <CardTransformed key={number} index={index} arrayLength={steps.length} aria-labelledby={`pickup-step-${index}`}>
              <div className="pickup-card-top"><span>قدم {number}</span><span>{label}</span></div>
              <div className="pickup-icon"><Icon size={52} strokeWidth={1.3} aria-hidden="true" /></div>
              <h3 id={`pickup-step-${index}`}>{title}</h3>
              <p className="pickup-description">{text}</p>
              <div className="pickup-detail"><Detail size={20} aria-hidden="true" /><p>{detail}</p></div>
            </CardTransformed>)}
          </CardsContainer>
        </div>
        <div className="pickup-story-actions">
          <span className="pickup-scroll-hint"><ArrowDown size={16} aria-hidden="true" />برای قدم بعدی، پایین برو</span>
          <Link href="/discover" className="action-link">بسته‌ها را ببین <ArrowLeft size={18} aria-hidden="true" /></Link>
        </div>
      </div>
    </ContainerScroll>
  </section>;
}
