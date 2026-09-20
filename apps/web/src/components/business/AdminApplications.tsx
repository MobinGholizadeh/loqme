'use client';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@loqme/api';
import { BUSINESS_TYPES_FA, WEEKDAYS_FA, type AdminMerchantApplicationDto } from '@loqme/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DialogSurface } from '@/components/ui/DialogSurface';
import { HeartbeatLoading } from '@/components/ui/HeartbeatLoading';
import { toPersianDigits } from '@/lib/utils/persian';
const LocationMap = dynamic(() => import('./StoreLocationMap'), { ssr: false });
const labels = { PENDING: 'در انتظار بررسی', APPROVED: 'تأییدشده', REJECTED: 'ردشده' };
export function AdminApplications() {
  const [items, setItems] = useState<AdminMerchantApplicationDto[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminMerchantApplicationDto | null>(null);
  const [reason, setReason] = useState(''); const [reviewError, setReviewError] = useState(''); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await apiClient.business.applications(page); setItems(result.data?.items || []); setTotal(result.data?.total || 0); }
    catch (e) { setError(e instanceof Error ? e.message : 'دریافت درخواست‌ها انجام نشد'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  async function review(decision: 'APPROVED' | 'REJECTED') {
    if (!selected) return;
    if (reason.trim().length < 5) { setReviewError('دلیل بررسی را با حداقل ۵ نویسه وارد کنید'); return; }
    setSaving(true); setReviewError('');
    try { await apiClient.business.review(selected.id, { decision, reasonFa: reason, expectedRevision: selected.revision }); setSelected(null); await load(); }
    catch (e) { setReviewError(e instanceof Error ? e.message : 'ثبت بررسی انجام نشد'); }
    finally { setSaving(false); }
  }
  return <section className="space-y-5" aria-label="درخواست‌های عضویت کسب‌وکار">
    <div className="flex justify-between items-center gap-3"><h2 className="text-xl font-bold">درخواست‌های عضویت</h2><Button variant="outline" onClick={load}>تازه‌سازی</Button></div>
    {error && <p role="alert" className="business-error">{error}</p>}
    {loading ? <HeartbeatLoading /> : !items.length ? <p className="business-info">درخواستی ثبت نشده است.</p> : <ul className="space-y-3">{items.map(app => <li key={app.id} className="business-application-row"><div><strong>{app.businessNameFa}</strong><p className="text-sm text-loqme-neutral-600">{app.cityNameFa} · {app.ownerName} · {labels[app.status]}</p></div><Button variant="outline" onClick={() => { setSelected(app); setReason(''); setReviewError(''); }}>بررسی درخواست</Button></li>)}</ul>}
    <div className="flex gap-3 items-center"><Button variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>قبلی</Button><span className="text-sm">صفحه {toPersianDigits(page)}</span><Button variant="ghost" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>بعدی</Button></div>
    {selected && <DialogSurface onClose={() => { if (!saving) setSelected(null); }} label="بررسی درخواست کسب‌وکار">
      <div className="space-y-5 bg-white rounded-lg p-6 w-full max-w-xl mx-auto"><div className="flex justify-between items-center"><h3 className="font-bold">{selected.businessNameFa}</h3><Button variant="ghost" disabled={saving} onClick={() => setSelected(null)}>بستن</Button></div><p>{BUSINESS_TYPES_FA[selected.businessType]} · {selected.cityNameFa}</p><p>مالک: {selected.ownerName} · <bdi>{toPersianDigits(selected.applicantMobile)}</bdi></p><p>{selected.addressFa}</p><p>تلفن فروشگاه: {selected.phone || 'ثبت نشده'} · پروانه: {selected.licenseNumber || 'ثبت نشده'}</p><LocationMap latitude={selected.latitude} longitude={selected.longitude} /><ul>{selected.hours.map(h => <li key={h.dayOfWeek}>{WEEKDAYS_FA[h.dayOfWeek]}: {h.isOpen ? `${toPersianDigits(h.storeOpenTime)} تا ${toPersianDigits(h.storeCloseTime)}` : 'بسته'}</li>)}</ul>
        {selected.duplicates.length > 0 && <div className="business-error"><strong>احتمال ثبت تکراری یا تداخل مالکیت</strong>{selected.duplicates.map(d => <p key={d.id}>{d.businessNameFa}{d.exact ? ' — شناسه نقشه یکسان' : ' — نام و موقعیت مشابه'}</p>)}<p>تأیید تا رفع تداخل امکان‌پذیر نیست. انتخاب نتیجه نقشه، مالکیت فروشگاه را اثبات نمی‌کند.</p></div>}
        {selected.status === 'PENDING' ? <><Input label="دلیل بررسی" value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} error={reviewError || undefined} /><div className="flex flex-wrap gap-3"><Button disabled={saving || selected.duplicates.length > 0} isLoading={saving} onClick={() => review('APPROVED')}>تأیید و فعال‌سازی فروشگاه</Button><Button variant="outline" disabled={saving} onClick={() => review('REJECTED')}>رد درخواست با توضیح</Button></div></> : <p className="business-info">{labels[selected.status]}: {selected.reviewReason}</p>}
      </div>
    </DialogSurface>}
  </section>;
}
