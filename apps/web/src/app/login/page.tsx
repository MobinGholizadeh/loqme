import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
export default function LoginPage() {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/">
          <LoqmeLogo size="md" variant="horizontal" />
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm">
          <ArrowRight size={18} />
          بازگشت به کاوش
        </Link>
      </header>
      <main className="auth-main">
        <div className="auth-form">
          <Suspense fallback={<HeartbeatLoading />}>
            <OtpLoginForm />
          </Suspense>
        </div>
        <div className="auth-photo">
          <Image
            src="/lifestyle-1.jpg"
            alt="کشف خوراکی‌های تازه در فروشگاه‌های محلی"
            fill
            priority
            sizes="(max-width: 767px) 0px, 45vw"
            className="object-cover"
          />
          <div className="auth-photo-caption">
            <span>تازه، محلی، به‌صرفه</span>
            <p>یک کشف خوشمزه در محله شما.</p>
          </div>
        </div>
      </main>
      <footer className="auth-footer">
        لقمه · کشف خوراکی‌های تازه با قیمت کمتر
      </footer>
    </div>
  );
}
