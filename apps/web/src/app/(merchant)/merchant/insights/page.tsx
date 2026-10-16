"use client";
import { useEffect, useState } from 'react';
import { ChartNoAxesCombined, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { MerchantContextDto, MerchantDataReportDto } from '@loqme/types';

const money = (value: string) => `${BigInt(value).toLocaleString('fa-IR')} تومان`;
const date = (value: string) => new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium' }).format(new Date(value));
function evidenceLabel(report: MerchantDataReportDto, key: string) {
  const counts: Record<string, [string, number]> = {
    paidOrderCount: ['تعداد سفارش پرداخت‌شده', report.paidOrderCount], previousPaidOrderCount: ['سفارش‌های بازه قبلی', report.previousPaidOrderCount],
    'quality.openReconciliations': ['پرونده باز فروشگاه', report.quality.openReconciliations],
    'quality.unknownPaymentTimes': ['پرداخت با زمان نامشخص', report.quality.unknownPaymentTimes],
    'quality.unknownRefundTimes': ['استرداد با زمان نامشخص', report.quality.unknownRefundTimes],
  };
  if (counts[key]) return `${counts[key][0]}: ${counts[key][1].toLocaleString('fa-IR')}`;
  if (key === 'refundsToman') return `استرداد تسویه‌شده: ${money(report.refundsToman)}`;
  if (key === 'startIso') return `از ${date(report.startIso)}`;
  if (key === 'endExclusiveIso') return `تا ${date(new Date(new Date(report.endExclusiveIso).getTime()-1).toISOString())}`;
  return 'داده ثبت‌شده در گزارش';
}
export default function MerchantInsightsPage() {
  const [contexts, setContexts] = useState<MerchantContextDto[]>([]);
  const [merchantId, setMerchant] = useState('');
  const [locationId, setLocation] = useState('');
  const [days, setDays] = useState('7');
  const [report, setReport] = useState<MerchantDataReportDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/merchant/contexts', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('دسترسی به فروشگاه فعال نیست');
      const body = await response.json();
      setContexts(body.data);
      if (body.data.length === 1) setMerchant(body.data[0].id);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!merchantId) return;
    const controller = new AbortController();
    const load = async () => {
      setReport(null); setError(''); setLoading(true);
      try {
        const query = new URLSearchParams({ merchantId, days, ...(locationId ? { locationId } : {}) });
        const response = await fetch(`/api/merchant/reports?${query}`, { cache: 'no-store', signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'گزارش دریافت نشد');
        if (!controller.signal.aborted) setReport(body.data);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'گزارش دریافت نشد'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [merchantId, locationId, days, refresh]);
  const selected = contexts.find(c => c.id === merchantId);
  return <div className="space-y-6" dir="rtl">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-teal-700 mb-2">عملکرد فروشگاه در لقمه</p><h1 className="text-2xl font-bold">گزارش و بینش فروش</h1>
        <p className="text-sm text-slate-600 mt-2">اعداد قابل پیگیری، برای تصمیم‌های روزمره فروشگاه شما</p></div>
      <Button variant="outline" onClick={() => setRefresh(v => v+1)} disabled={loading} rightIcon={<RefreshCw size={17}/>}>تازه‌سازی</Button>
    </header>
    <Card><div className="grid gap-4 md:grid-cols-3">
      <Select label="فروشگاه" value={merchantId} onChange={e => { setReport(null); setMerchant(e.target.value); setLocation(''); }} options={[{ value: '', label: 'فروشگاه را انتخاب کنید' }, ...contexts.map(c => ({ value: c.id, label: c.nameFa }))]}/>
      <Select label="شعبه" value={locationId} disabled={!selected} onChange={e => { setReport(null); setLocation(e.target.value); }} options={[{ value: '', label: 'تمام شعبه‌ها' }, ...(selected?.locations ?? []).map(l => ({ value: l.id, label: l.nameFa }))]}/>
      <Select label="بازه گزارش" value={days} onChange={e => { setReport(null); setDays(e.target.value); }} options={[{ value: '7', label: '۷ روز کامل گذشته' }, { value: '30', label: '۳۰ روز کامل گذشته' }]}/>
    </div></Card>
    {error && <Card role="alert"><p className="text-red-700">{error}</p><Button className="mt-4" onClick={() => setRefresh(v => v+1)}>تلاش دوباره</Button></Card>}
    {loading && <Card role="status" aria-live="polite"><p>در حال دریافت گزارش…</p><div className="h-24 mt-4 rounded-lg bg-teal-50 animate-pulse"/></Card>}
    {!loading && !error && !merchantId && <Card className="text-center py-12"><ChartNoAxesCombined className="mx-auto text-teal-700 mb-4"/><h2 className="font-bold">گزارش فروشگاه خود را ببینید</h2><p className="mt-2 text-slate-600">برای شروع، یک فروشگاه را انتخاب کنید.</p></Card>}
    {report && !loading && !error && <>
      <p className="text-sm text-slate-600">{date(report.startIso)} تا {date(new Date(new Date(report.endExclusiveIso).getTime()-1).toISOString())} · روزهای کامل به وقت تهران · به‌روز در {new Date(report.computedAtIso).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['وجوه تأییدشده', money(report.collectionsToman), 'بر اساس زمان تأیید بانک'],
          ['استرداد تسویه‌شده', money(report.refundsToman), 'بر اساس زمان تسویه استرداد'],
          ['خالص دریافت وجه', money(report.netCollectionsToman), 'دریافت وجه منهای استرداد این بازه'],
          ['سفارش پرداخت‌شده', report.paidOrderCount.toLocaleString('fa-IR'), 'پرداخت تخصیص‌یافته به سفارش'],
        ].map(([label, value, note]) => <Card key={label}><p className="text-sm text-slate-600">{label}</p><p className="text-xl font-bold my-3 text-teal-800">{value}</p><p className="text-xs text-slate-500">{note}</p></Card>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-bold text-lg mb-4">از این داده‌ها چه می‌دانیم؟</h2><p className="text-sm text-slate-600 mb-4">جمع‌بندی با قواعد ثابت و داده ثبت‌شده؛ بدون پیش‌بینی یا تغییر خودکار قیمت.</p>
          <ul className="space-y-4">{report.insights.map(insight => <li key={insight.code} className="border-r-2 border-teal-600 pr-3"><p className="text-sm leading-7">{insight.textFa}</p><details className="text-xs text-slate-500 mt-1"><summary className="cursor-pointer p-1">مبنای این نکته</summary><p className="mt-2">{insight.evidence.map(key => evidenceLabel(report, key)).join(' · ')}</p></details></li>)}</ul>
        </Card>
        <Card><h2 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-teal-700"/>دامنه و کیفیت داده</h2>
          <p className="text-sm leading-7 text-slate-600">فقط معاملات لقمه در این گزارش محاسبه شده‌اند. این اعداد نشان‌دهنده کل فروش حضوری، سود خالص یا میزان دورریز فروشگاه نیستند.</p>
          <p className="text-sm text-slate-600 mt-3">شروع ثبت سابقه بسته‌ها: {report.historyCoverageStartIso ? date(report.historyCoverageStartIso) : 'هنوز سابقه‌ای ثبت نشده است'}</p>
          <dl className="text-sm space-y-3 mt-4">{[
            ['پرداخت با زمان نامشخص (تمام سابقه)', report.quality.unknownPaymentTimes], ['استرداد با زمان نامشخص (تمام سابقه)', report.quality.unknownRefundTimes],
            ['سفارش با شعبه نامشخص (کل فروشگاه)', report.quality.unknownLocations], ['پرونده باز پرداخت (کل فروشگاه)', report.quality.openReconciliations], ['تحویل تأییدشده در بازه', report.pickupCount],
          ].map(([label, value]) => <div className="flex justify-between gap-3" key={label}><dt>{label}</dt><dd className="font-bold">{Number(value).toLocaleString('fa-IR')}</dd></div>)}</dl>
          {report.quality.baselineOnly && <p className="text-sm mt-4 text-slate-600">هنوز سابقه تغییر جدیدی برای بسته‌ها ثبت نشده است؛ روند موجودی قابل نتیجه‌گیری نیست.</p>}
        </Card>
      </div>
      <Card><h2 className="font-bold mb-3">ارزش سفارش‌های تخصیص‌یافته</h2><dl className="grid gap-5 md:grid-cols-3">{[
        ['فروش ثبت‌شده', report.bookedSalesToman], ['کارمزد ثبت‌شده در خرید', report.bookedCommissionToman], ['سهم ثبت‌شده فروشگاه', report.bookedMerchantPayableToman],
      ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 font-bold">{money(value)}</dd></div>)}</dl><p className="text-xs text-slate-500 mt-4">مبالغ ثبت‌شده هنگام خرید، پیش از استرداد؛ این بخش مانده قابل تسویه یا واریز بانکی نیست.</p></Card>
    </>}
  </div>;
}
