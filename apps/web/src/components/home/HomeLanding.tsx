import Link from "next/link";
import { ArrowLeft, MapPin, Compass, Heart, BadgeCheck, Wallet } from "lucide-react";
import { PickupSteps } from "./PickupSteps";
import { CategoryTicker } from "./CategoryTicker";
import { SplitText, ShinyText, SpotlightCard, Magnet } from "react-bits";
import "./home-landing.css";

export function HomeLanding() {
  return <div className="home-landing">
    <section className="landing-hero" aria-labelledby="home-title">
      <picture className="landing-hero-media">
        <source
          media="(max-width: 767px)"
          srcSet="/images/auth/loqme-mobile-480.webp 480w, /images/auth/loqme-mobile-960.webp 960w, /images/auth/loqme-mobile-2160.webp 2160w"
          sizes="100vw"
        />
        <img
          src="/images/auth/loqme-desktop-1920.webp"
          srcSet="/images/auth/loqme-desktop-1280.webp 1280w, /images/auth/loqme-desktop-1920.webp 1920w, /images/auth/loqme-desktop-2560.webp 2560w, /images/auth/loqme-desktop-3840.webp 3840w"
          sizes="100vw"
          width={3840}
          height={2160}
          alt="دریافت بسته خوراکی لقمه از یک فروشگاه محلی"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="landing-hero-shade" />
      <div className="landing-hero-copy">
        <span className="landing-eyebrow">
          <MapPin size={17} aria-hidden="true" />
          <ShinyText text="از محله‌های ارومیه شروع می‌کنیم" color="#C7E5DC" shineColor="#FFFFFF" speed={3.5} />
        </span>
        <h1 id="home-title">
          <SplitText tag="span" className="landing-title-line" text="یک کشف خوشمزه" splitBy="words" delay={100} duration={0.8} />
          <br />
          <SplitText tag="span" className="landing-title-line" text="یک خرید هوشمندانه" splitBy="words" delay={350} duration={0.8} />
        </h1>
        <p>خوراکی‌های خوبِ فروشگاه‌های محله، با قیمتی بهتر<br />با لقمه کشف کن، رزرو کن و حضوری تحویل بگیر</p>
        <div className="landing-actions">
          <Magnet padding={30} magnetStrength={3}>
            <Link href="/discover" className="action-link">کشف خوراکی‌ها <ArrowLeft size={20} aria-hidden="true" /></Link>
          </Magnet>
          <Magnet padding={30} magnetStrength={3}>
            <Link href="#why-loqme" className="action-link secondary">چرا لقمه؟</Link>
          </Magnet>
        </div>
      </div>
      <span className="landing-photo-note">از فروشگاه محله، به دست تو</span>
    </section>

    <section className="landing-intro landing-section" id="why-loqme" aria-labelledby="why-title">
      <span className="landing-kicker">خوب بخور؛ هوشمندانه خرید کن</span>
      <h2 id="why-title">هنوز کلی خوبی<br /><em>برای کشف کردن هست</em></h2>
      <p>هر روز خوراکی‌های باکیفیتی در نانوایی‌ها، کافه‌ها و فروشگاه‌ها باقی می‌ماند؛ لقمه کمک می‌کند پیشنهادهای روز محله‌ات را پیدا کنی؛ با قیمت کمتر، اطلاعات روشن و زمان دریافت مشخص</p>
      <div className="landing-benefits">
        {[
          { Icon: Wallet, title: "ارزش بیشتر برای خریدت", text: "قیمت اصلی و قیمت پیشنهاد را ببین و آگاهانه انتخاب کن" },
          { Icon: Compass, title: "کشف طعم‌های نزدیک", text: "از نانوایی آشنا تا کافه‌ای که هنوز امتحانش نکرده‌ای" },
          { Icon: BadgeCheck, title: "خرید با خیال روشن", text: "جزئیات بسته، شرایط نگهداری و بازه دریافت را پیش از خرید ببین" },
          { Icon: Heart, title: "یک انتخاب، اثر بهتر", text: "با خرید خوراکی‌های سالمِ مازاد، به کمتر شدن هدررفت کمک کن" },
        ].map(({ Icon, title, text }) => (
          <SpotlightCard key={title} className="benefit-card" spotlightColor="rgba(29, 97, 106, 0.12)">
            <Icon size={30} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </SpotlightCard>
        ))}
      </div>
    </section>

    <CategoryTicker />

    <PickupSteps />
  </div>;
}
