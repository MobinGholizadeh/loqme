import Link from "next/link";
import { ArrowLeft, MapPin, Compass, ShoppingBag, Store, Heart, BadgeCheck, Wallet } from "lucide-react";
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

    <section className="landing-section landing-how" aria-labelledby="how-title">
      <div><span className="landing-kicker">از کشف تا دریافت</span><h2 id="how-title">سه قدم تا<br />لقمه‌ی بعدی تو</h2><Link href="/discover" className="landing-text-link">بسته‌ها را ببین <ArrowLeft size={18} aria-hidden="true" /></Link></div>
      <div className="landing-steps">
        {[
          { Icon: Compass, number: "۰۱", title: "کشف کن", text: "پیشنهادهای اطرافت را پیدا کن و جزئیات بسته را بخوان" },
          { Icon: ShoppingBag, number: "۰۲", title: "رزرو کن", text: "بسته دلخواهت را انتخاب کن و پرداخت آنلاین را انجام بده" },
          { Icon: Store, number: "۰۳", title: "تحویل بگیر", text: "در بازه مشخص به فروشگاه برو و کد دریافتت را نشان بده" },
        ].map(({ Icon, number, title, text }) => <article key={number}><span>{number}</span><Icon size={24} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}
      </div>
    </section>

    <section className="landing-coverage landing-section" aria-labelledby="coverage-title">
      <div className="landing-coverage-mark" aria-hidden="true"><MapPin size={64} /><span>ارومیه</span><small>از همین نزدیکی</small></div>
      <div><span className="landing-kicker">لقمه کجاست؟</span><h2 id="coverage-title">شروع از ارومیه،<br />از محله‌ی خودمان</h2><p>شروع مسیر لقمه از ارومیه است؛ برای دیدن فروشگاه‌ها، محدوده‌ها و بسته‌های موجود، به نقشه و بخش کشف سر بزن؛ موجودی و زمان دریافت هر پیشنهاد همان‌جا مشخص است</p><Link href="/explore?view=map" className="action-link">دیدن اطراف من <ArrowLeft size={18} aria-hidden="true" /></Link></div>
    </section>

    <section className="landing-business landing-section" aria-labelledby="business-title"><div><span className="landing-kicker">برای کسب‌وکارهای محله</span><h2 id="business-title">خوبی‌های فروشگاهت<br />را به محله معرفی کن</h2><p>موجودی سالمِ مازاد را به فرصتی برای فروش و آشنایی با مشتری‌های تازه تبدیل کن</p></div><Link href="/business" className="action-link">ثبت کسب‌وکار <ArrowLeft size={18} aria-hidden="true" /></Link></section>
  </div>;
}
