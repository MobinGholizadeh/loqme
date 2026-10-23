import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, Store } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth/session';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { HeartbeatLoading } from '@/components/ui/HeartbeatLoading';

export default async function BusinessLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('loqme_session')?.value;
  if (token) {
    const session = await verifySessionToken(token);
    if (session?.role === 'MERCHANT_OWNER' || session?.role === 'MERCHANT_STAFF') {
      redirect('/merchant');
    } else if (session?.role === 'ADMIN') {
      redirect('/admin');
    }
  }

  return (
    <div className="business-login-content">
      <div className="business-login-emblem" aria-hidden="true"><Store size={28} strokeWidth={1.5} /></div>
      <Suspense fallback={<HeartbeatLoading />}><OtpLoginForm audience="business" initialMode="login" /></Suspense>
      <div className="business-register-invitation">
        <p>هنوز فروشگاهتان را در لقمه ثبت نکرده‌اید؟</p>
        <Link href="/business">ثبت کسب‌وکار<ArrowUpLeft size={18} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
