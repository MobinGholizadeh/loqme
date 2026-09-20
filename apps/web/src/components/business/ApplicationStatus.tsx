'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, FilePenLine } from 'lucide-react';
import { apiClient } from '@loqme/api';
import type { MerchantApplicationDto } from '@loqme/types';
import { BUSINESS_TYPES_FA, WEEKDAYS_FA } from '@loqme/types';
import { useSession } from '@/components/auth/SessionProvider';
import { Button } from '@/components/ui/Button';
import { HeartbeatLoading } from '@/components/ui/HeartbeatLoading';
import { clearBusinessDraft } from '@/lib/business/draft';
import { toPersianDigits } from '@/lib/utils/persian';

export function ApplicationStatus() {
  const session = useSession(); const [app, setApp] = useState<MerchantApplicationDto | null>(null);
  const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const result = await apiClient.business.application(); setApp(result.data || null); if (result.data?.status !== 'REJECTED') clearBusinessDraft(); }
    catch (e) { setError(e instanceof Error ? e.message : 'دریافت وضعیت ممکن نشد'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { if (session.status === 'authenticated') void load(); else if (session.status !== 'loading') setBusy(false); }, [session.status, load]);
  if (busy || session.status === 'loading') return <HeartbeatLoading />;
  if (session.status !== 'authenticated') return <div className="space-y-5"><h1 className="text-2xl font-bold">پیگیری درخواست کسب‌وکار</h1><p>برای دیدن وضعیت درخواست، با شماره ثبت‌شده وارد شوید.</p><Link href="/business/login" className="action-link">ورود کسب‌وکار</Link></div>;
  if (error) return <div className="space-y-5"><h1 className="text-2xl font-bold">وضعیت درخواست</h1><p role="alert">{error}</p><Button onClick={load}>تلاش دوباره</Button></div>;
  if (!app) return <div className="space-y-5"><h1 className="text-2xl font-bold">هنوز درخواستی ثبت نشده است</h1><p>برای پیوستن به لقمه، اطلاعات فروشگاهتان را ثبت کنید.</p><Link href={session.user?.role === 'CUSTOMER' ? '/business' : '/business/login'} className="action-link">{session.user?.role === 'CUSTOMER' ? 'ثبت کسب‌وکار' : 'ورود به پنل فروشگاه'}</Link></div>;
  const Icon = app.status === 'APPROVED' ? CheckCircle2 : app.status === 'REJECTED' ? FilePenLine : Clock3;
  return <div className="space-y-7">
    <div className="business-status-icon"><Icon size={30} aria-hidden="true" /></div>
    <div className="space-y-3"><h1 className="text-2xl font-extrabold">{app.status === 'PENDING' ? 'درخواست شما در انتظار بررسی است' : app.status === 'APPROVED' ? 'به جمع کسب‌وکارهای لقمه خوش آمدید' : 'درخواست شما نیاز به اصلاح دارد'}</h1><p className="text-sm text-loqme-neutral-600">{app.status === 'PENDING' ? 'اطلاعات فروشگاه دریافت شد. پس از بررسی و تأیید، دسترسی پنل کسب‌وکار فعال می‌شود.' : app.status === 'APPROVED' ? 'کسب‌وکار شما تأیید شد. برای فعال‌شدن دسترسی تازه، دوباره با کد پیامکی وارد شوید.' : 'توضیحات بررسی را بخوانید و درخواست اصلاح‌شده را دوباره ارسال کنید.'}</p></div>
    {app.status === 'REJECTED' && <div className="business-info"><strong>توضیحات بررسی</strong><p className="mt-2">{app.reviewReason}</p></div>}
    <section className="business-store-summary" aria-label="خلاصه درخواست"><h2 className="font-bold text-lg">{app.businessNameFa}</h2><p>{BUSINESS_TYPES_FA[app.businessType]} · {app.cityNameFa}</p><p>{app.addressFa}</p><p>مالک: {app.ownerName}</p><ul className="text-sm">{app.hours.filter(h => h.isOpen).map(h => <li key={h.dayOfWeek}>{WEEKDAYS_FA[h.dayOfWeek]}: <bdi>{toPersianDigits(h.storeOpenTime)} – {toPersianDigits(h.storeCloseTime)}</bdi></li>)}</ul></section>
    {app.status === 'APPROVED' ? <Link href="/business/login" className="action-link w-full justify-center">ورود به پنل کسب‌وکار</Link> : app.status === 'REJECTED' ? <Link href="/business" className="action-link w-full justify-center">اصلاح و ارسال دوباره</Link> : <Button className="w-full" variant="outline" onClick={load}>بررسی دوباره وضعیت</Button>}
    <Link href="/explore" className="auth-text-link justify-center">بازگشت به کاوش لقمه</Link>
  </div>;
}
