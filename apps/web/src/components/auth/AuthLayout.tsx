import { GuideNotice } from "@/components/how-it-works/GuideNotice";
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpLeft } from 'lucide-react';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';

export function AuthLayout({ children, business = false }: { children: React.ReactNode; business?: boolean }) {
  return <div className={`auth-split${business ? " auth-split--business" : ""}`}>
    <a className="skip-link" href="#auth-content">رفتن به فرم</a>
    <aside className="auth-split-photo" aria-label="لقمه؛ تازه، به‌صرفه، دوستدار زمین">
      <Image src="/lifestyle-1.jpg" alt="کشف خوراکی‌های تازه در کافه محلی" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      <div className="auth-split-scrim" />
      <Link href="/" aria-label="صفحه اصلی لقمه" className="auth-split-logo"><LoqmeLogo theme="white" size="xl" variant="horizontal" /></Link>
      <div className="auth-split-caption"><span>تازه، به‌صرفه، دوستدار زمین</span><p>{business ? 'فرصت تازه‌ای برای کسب‌وکار شما' : 'طعم‌های تازه، مهربانی با زمین، انتخابی هوشمندانه'}</p><span>{business ? 'خوراکی‌های خوب شما، کشف بعدی محله' : 'با هر لقمه، مانع هدررفت خوراکی‌های باکیفیت شوید و به زمین لبخند بزنید.'}</span></div>
    </aside>
    <main id="auth-content" className="auth-split-panel" tabIndex={-1}>
      <nav className="auth-split-nav" aria-label="ناوبری ورود">
        <Link href="/" className="auth-text-link"><ArrowRight size={18} aria-hidden="true" />بازگشت به خانه</Link>
        <Link href={business ? '/login' : '/business'} className="auth-text-link">{business ? 'ورود مشتری' : 'ورود کسب‌وکار'}<ArrowUpLeft size={16} aria-hidden="true" /></Link>
      </nav>
      <div className="auth-split-content">{!business && <GuideNotice/>}{children}</div>
      <p className="auth-split-footnote">لقمه | نجات طعم‌های تازه و دوستی با طبیعت</p>
    </main>
  </div>;
}
