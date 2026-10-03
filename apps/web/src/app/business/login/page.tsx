import { Suspense } from 'react';
import Link from 'next/link';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { HeartbeatLoading } from '@/components/ui/HeartbeatLoading';
export default function BusinessLoginPage() {
  return <div className="space-y-8"><Suspense fallback={<HeartbeatLoading />}><OtpLoginForm audience="business" initialMode="login" /></Suspense><p className="text-sm">هنوز در لقمه ثبت‌نام نکرده‌اید؟ <Link className="auth-inline-link" href="/business">ثبت کسب‌وکار</Link></p></div>;
}
