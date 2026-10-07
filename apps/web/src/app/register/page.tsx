import { Suspense } from "react";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { AuthLayout } from '@/components/auth/AuthLayout';
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ثبت‌نام در لقمه | کشف طعم‌های تازه و دوستی با طبیعت",
  description: "ایجاد حساب کاربری در لقمه برای نجات و خرید خوراکی‌های باکیفیت و تازه محلی با تخفیف‌های شگفت‌انگیز و همراهی با طبیعت",
};

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<HeartbeatLoading />}>
        <OtpLoginForm audience="customer" initialMode="register" />
      </Suspense>
    </AuthLayout>
  );
}
