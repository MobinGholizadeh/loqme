import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, Store } from 'lucide-react';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { HeartbeatLoading } from '@/components/ui/HeartbeatLoading';
export default function BusinessLoginPage() {
  return <div className="business-login-content">
    <div className="business-login-emblem" aria-hidden="true"><Store size={28} strokeWidth={1.5} /></div>
    <Suspense fallback={<HeartbeatLoading />}><OtpLoginForm audience="business" initialMode="login" /></Suspense>
    <div className="business-register-invitation">
      <p>هنوز فروشگاهتان را در لقمه ثبت نکرده‌اید؟</p>
      <Link href="/business">ثبت کسب‌وکار<ArrowUpLeft size={18} aria-hidden="true" /></Link>
    </div>
  </div>;
}
