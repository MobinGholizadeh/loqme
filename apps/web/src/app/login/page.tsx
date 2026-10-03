import { Suspense } from "react";
import { OtpLoginForm } from "@/components/auth/OtpLoginForm";
import { AuthLayout } from '@/components/auth/AuthLayout';
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ورود به حساب کاربری | لقمه",
  description: "ورود به حساب کاربری در سامانه کشف و خرید هوشمندانه خوراکی‌های لقمه",
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<HeartbeatLoading />}>
        <OtpLoginForm audience="customer" initialMode="login" />
      </Suspense>
    </AuthLayout>
  );
}
