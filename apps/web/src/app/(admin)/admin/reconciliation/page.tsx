"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
type Case = { id: string; orderId: string; reason?: string; state?: string; createdAt: string };
const labels: Record<string, string> = { UNALLOCATED_PAYMENT: 'پرداخت تأییدشده بدون تخصیص', INITIATION_UNKNOWN: 'نتیجه درخواست بانک نامشخص', VERIFICATION_UNKNOWN: 'تأیید بانک نامشخص', REFUND_UNKNOWN: 'نتیجه استرداد نامشخص', RESERVATION_EXPIRED: 'پرداخت پس از پایان رزرو', DUPLICATE_PAYMENT: 'پرداخت اضافه', AMOUNT_MISMATCH: 'مغایرت مبلغ', ORDER_NOT_PAYABLE: 'سفارش غیرقابل پرداخت', REFUND_PENDING: 'استرداد در جریان', LEGACY_ALLOCATION_UNKNOWN: 'تخصیص قدیمی نامشخص', COMPLETION_FAILED: 'تکمیل سفارش ناموفق', SUBMITTING: 'ارسال معلق؛ نتیجه نامشخص' };
export default function ReconciliationPage() {
  const [rows, setRows] = useState<Case[] | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function recheck(id: string) {
    setBusy(id); setMessage('');
    try {
      const response = await fetch(`/api/admin/reconciliation/${id}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'RECHECK' }) });
      const body = await response.json(); setMessage(body.message || 'بررسی انجام نشد');
      if (response.ok) setRefresh(v => v+1);
    } catch { setMessage('ارتباط برقرار نشد؛ پرونده را دوباره بررسی کنید'); }
    finally { setBusy(null); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/reconciliation', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const body = await response.json();
      setRows([...body.data.cases, ...body.data.stalled, ...(body.data.pendingRefunds ?? []), ...(body.data.unallocated ?? [])]); setError(false);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [refresh]);
  return <div className="space-y-6" dir="rtl"><header className="flex justify-between gap-4"><div><h1 className="text-2xl font-bold">پیگیری پرداخت‌ها</h1><p className="text-sm text-slate-600 mt-2">تا ۱۰۰ مورد قدیمی از هر گروه: پرونده، ارسال معلق، استرداد و پرداخت تخصیص‌نیافته</p></div><Button variant="outline" onClick={() => { setRows(null); setRefresh(v => v+1); }}>تازه‌سازی</Button></header>
    <Card><p className="text-sm leading-7">این فهرست برای بررسی شواهد بانک و سفارش است؛ درخواست نامشخص را دوباره ارسال نکنید؛ ثبت استرداد و تعیین تکلیف پرونده باید طبق رویه پیگیری پرداخت انجام شود</p></Card>
    {message && <Card role="status">{message}</Card>}
    {error ? <Card role="alert">دریافت پرونده‌ها انجام نشد؛ دسترسی خود را بررسی و دوباره تلاش کنید</Card> : rows === null ? <Card role="status">در حال دریافت پرونده‌ها…</Card> : rows.length === 0 ? <Card>پرونده باز یا ارسال معلقی ثبت نشده است</Card> : <div className="grid gap-4 md:grid-cols-2">{rows.map(row => <Card key={row.id}><h2 className="font-bold text-teal-800">{labels[row.reason ?? row.state ?? ''] ?? 'نیازمند بررسی'}</h2><p className="text-sm text-slate-600 mt-2">{new Date(row.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p><p className="text-sm mt-3">شناسه سفارش</p><p dir="ltr" className="break-all text-sm mt-1 select-all">{row.orderId}</p>{row.reason && <Button className="mt-4" variant="outline" disabled={busy !== null} isLoading={busy === row.id} onClick={() => recheck(row.id)}>بررسی مجدد نتیجه پرداخت</Button>}</Card>)}</div>}
  </div>;
}
