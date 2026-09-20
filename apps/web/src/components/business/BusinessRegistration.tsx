'use client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, MapPin, Search, Store, Coffee, Croissant, Utensils, ShoppingBasket, Carrot } from 'lucide-react';
import { apiClient } from '@loqme/api';
import { BUSINESS_TYPES_FA, WEEKDAYS_FA, type BusinessCityDto, type BusinessPlaceDto, type BusinessType } from '@loqme/types';
import { BusinessDetailsSchema, BusinessHoursSchema, MerchantApplicationSchema } from '@loqme/validation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { HeartbeatLoading } from '@/components/ui/HeartbeatLoading';
import { OtpLoginForm } from '@/components/auth/OtpLoginForm';
import { useSession } from '@/components/auth/SessionProvider';
import { toPersianDigits } from '@/lib/utils/persian';
import { clearBusinessDraft, emptyBusinessDraft, readBusinessDraft, saveBusinessDraft, type BusinessDraft } from '@/lib/business/draft';

const LocationMap = dynamic(() => import('./StoreLocationMap'), { ssr: false, loading: () => <div className="business-map animate-shimmer" aria-label="در حال بارگذاری نقشه" /> });
const titles = ['کسب‌وکارتان را پیدا کنید', 'نوع کسب‌وکارتان چیست؟', 'اطلاعات فروشگاه را بررسی کنید', 'روزها و ساعت‌های کاری', 'حساب مالک کسب‌وکار'];
const icons = { BAKERY: Croissant, CAFE: Coffee, RESTAURANT: Utensils, SUPERMARKET: ShoppingBasket, DELI: Store, PRODUCE: Carrot };

export function BusinessRegistration() {
  const router = useRouter(); const session = useSession();
  const [draft, setDraft] = useState<BusinessDraft>(emptyBusinessDraft);
  const [step, setStep] = useState(0); const [ready, setReady] = useState(false);
  const [cities, setCities] = useState<BusinessCityDto[]>([]); const [cityError, setCityError] = useState('');
  const [query, setQuery] = useState(''); const [results, setResults] = useState<BusinessPlaceDto[]>([]);
  const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState('');
  const [ownerName, setOwnerName] = useState(''); const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [message, setMessage] = useState('');
  const [reverseBusy, setReverseBusy] = useState(false);
  const [suggestedAddress, setSuggestedAddress] = useState('');
  const heading = useRef<HTMLHeadingElement>(null); const summary = useRef<HTMLDivElement>(null);
  const locationRevision = useRef(0);
  const patch = useCallback((values: Partial<BusinessDraft>) => setDraft(d => ({ ...d, ...values })), []);
  const loadCities = useCallback(async () => {
    setCityError('');
    try { const response = await apiClient.business.cities(); const items = response.data || []; setCities(items);
      if (!items.length) setCityError('هنوز شهری برای ثبت کسب‌وکار فعال نشده است.');
      setDraft(d => {
        if (items.some(c => c.id === d.cityId)) return d;
        const city = items.find(c => c.slug === 'urmia' || c.nameFa === 'ارومیه') || items[0];
        return city ? { ...d, cityId: city.id, ...(city.center || {}), locationConfirmed: false } : d;
      });
    } catch { setCityError('دریافت شهرها ممکن نشد. دوباره تلاش کنید.'); }
  }, []);
  useEffect(() => { const saved = readBusinessDraft(); if (saved) { setDraft(saved.draft); setStep(saved.step); } setReady(true); void loadCities(); }, [loadCities]);
  useEffect(() => { if (ready) saveBusinessDraft(draft, step); }, [draft, step, ready]);
  useEffect(() => { if (ready) heading.current?.focus(); }, [step, ready]);
  useEffect(() => { if (Object.keys(errors).length || message) summary.current?.focus(); }, [errors, message]);
  useEffect(() => {
    if (session.status !== 'authenticated') return;
    let cancelled = false;
    void apiClient.business.application().then(result => {
      if (cancelled) return;
      const app = result.data;
      if (app && app.status !== 'REJECTED') { clearBusinessDraft(); router.replace('/business/status'); }
      else if (app && step === 0) {
        const { ownerName: name, businessNameFa, businessType, cityId, addressFa, latitude, longitude, phone, licenseNumber, mapirPlaceId, hours } = app;
        setDraft({ businessNameFa, businessType, cityId, addressFa, latitude, longitude, phone, licenseNumber, mapirPlaceId, hours, locationConfirmed: true }); setOwnerName(name);
      }
    }).catch(() => { /* Final submission remains guarded by the server. */ });
    return () => { cancelled = true; };
    // Fetch once per authenticated identity; never overwrite edited fields after OTP verification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, session.user?.mobile, router]);
  useEffect(() => {
    setResults([]); setSearchError('');
    if (query.trim().length < 2 || !draft.cityId || step !== 0) { setSearching(false); return; }
    const controller = new AbortController(); setSearching(true);
    const timer = setTimeout(() => {
      void apiClient.business.searchPlaces(query.trim(), draft.cityId, controller.signal).then(r => { if (!controller.signal.aborted) setResults(r.data || []); })
        .catch(e => { if (!controller.signal.aborted) setSearchError(e.message); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, draft.cityId, step]);
  function moveStep(next: number) { setErrors({}); setMessage(''); setStep(next); }
  function selectPlace(place: BusinessPlaceDto) {
    patch({ businessNameFa: place.name, addressFa: place.address, latitude: place.latitude, longitude: place.longitude, mapirPlaceId: place.providerId, locationConfirmed: true }); moveStep(1);
  }
  function changeLocation(latitude: number, longitude: number) {
    locationRevision.current++; setSuggestedAddress(''); patch({ latitude, longitude, locationConfirmed: true });
  }
  async function suggestAddress() {
    setMessage(''); setReverseBusy(true); const revision = locationRevision.current;
    try { const r = await apiClient.business.reversePlace(draft.latitude, draft.longitude); if (revision === locationRevision.current) setSuggestedAddress(r.data?.address || ''); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'آدرس را دستی وارد کنید'); }
    finally { setReverseBusy(false); }
  }
  function next() {
    if (step === 1 && !draft.businessType) { setErrors({ businessType: 'نوع کسب‌وکار را انتخاب کنید' }); return; }
    if (step === 2) {
      const { hours: _hours, locationConfirmed, ...details } = draft;
      const parsed = BusinessDetailsSchema.safeParse(details);
      if (!parsed.success || !locationConfirmed) {
        const fieldErrors: Record<string, string> = {};
        if (!parsed.success) parsed.error.issues.forEach(issue => { fieldErrors[String(issue.path[0])] = issue.message; });
        if (!locationConfirmed) fieldErrors.latitude = 'موقعیت دقیق فروشگاه را روی نقشه یا با مختصات مشخص کنید';
        setErrors(fieldErrors); return;
      }
    }
    if (step === 3) { const parsed = BusinessHoursSchema.safeParse(draft.hours); if (!parsed.success) { setErrors({ hours: parsed.error.issues[0].message }); return; } }
    moveStep(step + 1);
  }
  async function submit() {
    setErrors({}); setMessage('');
    const { locationConfirmed: _confirmed, ...fields } = draft;
    const parsed = MerchantApplicationSchema.safeParse({ ...fields, ownerName });
    if (!parsed.success) { setErrors({ ownerName: parsed.error.issues[0].message }); return; }
    setSaving(true);
    try { await apiClient.business.submit(parsed.data); clearBusinessDraft(); router.push('/business/status'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'ثبت درخواست انجام نشد'); }
    finally { setSaving(false); }
  }
  const selectedCity = cities.find(c => c.id === draft.cityId);
  if (!ready) return <HeartbeatLoading />;
  if (session.status === 'authenticated' && session.user?.role !== 'CUSTOMER') return <div className="space-y-6"><h1 className="text-2xl font-bold">حساب کسب‌وکار شما آماده است</h1><p>برای مدیریت فروشگاه، وارد پنل خود شوید.</p><Link className="action-link" href={session.user?.role === 'ADMIN' ? '/admin' : '/business/login'}>ورود به پنل</Link></div>;
  return <div className="business-registration space-y-7">
    <div className="flex items-center justify-between gap-3"><span className="text-xs text-loqme-neutral-600">مرحله {toPersianDigits(step + 1)} از ۵</span><Link href="/business/login" className="auth-inline-link text-sm">قبلاً ثبت‌نام کرده‌اید؟ ورود</Link></div>
    <div className="business-progress" role="progressbar" aria-label="پیشرفت ثبت‌نام" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1}>{titles.map((title, i) => <span key={title} data-complete={i <= step} />)}</div>
    <div className="space-y-3">{step > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => moveStep(step - 1)} rightIcon={<ArrowRight size={18} />}>مرحله قبل</Button>}<h1 ref={heading} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold outline-none">{titles[step]}</h1><p className="text-sm text-loqme-neutral-600">{['نام فروشگاه را جست‌وجو کنید یا اطلاعات آن را دستی وارد کنید.', 'دسته‌ای را انتخاب کنید که به فعالیت فروشگاه نزدیک‌تر است.', 'نشانی و نقطه روی نقشه را با محل دقیق ورودی فروشگاه تطبیق دهید.', 'ساعت‌ها را خودتان وارد و تأیید کنید؛ این اطلاعات از نقشه دریافت نشده‌اند.', 'شماره موبایل تأییدشده، راه ورود شما به پنل فروشگاه خواهد بود.'][step]}</p></div>
    {(Object.keys(errors).length > 0 || message) && <div ref={summary} tabIndex={-1} role="alert" className="business-error"><strong>اطلاعات را بررسی کنید</strong>{message && <p>{message}</p>}{Object.entries(errors).map(([key, value]) => <a key={key} href={`#business-${key}`} onClick={() => document.getElementById(`business-${key}`)?.focus()}>{value}</a>)}</div>}
    {step === 0 && <div className="space-y-5">
      <Select id="business-cityId" label="شهر کسب‌وکار" value={draft.cityId} options={cities.map(c => ({ value: c.id, label: `${c.nameFa} — ${c.provinceNameFa}` }))} onChange={e => { const city = cities.find(c => c.id === e.target.value); patch({ cityId: e.target.value, ...(city?.center || {}), locationConfirmed: false, mapirPlaceId: null }); }} />
      {cityError && <div role="alert" className="business-error"><p>{cityError}</p><Button variant="ghost" onClick={loadCities}>تلاش دوباره</Button></div>}
      <Input label="نام کسب‌وکار" placeholder="مثلاً نانوایی یا کافه شما" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} prefixElement={<Search size={18} aria-hidden="true" />} />
      <div aria-live="polite" className="text-sm text-loqme-neutral-600">{searching ? 'در حال جست‌وجو…' : searchError || (query.trim().length >= 2 && !results.length ? 'نتیجه‌ای پیدا نشد. می‌توانید اطلاعات را دستی وارد کنید.' : '')}</div>
      {results.length > 0 && <><LocationMap latitude={draft.latitude} longitude={draft.longitude} places={results} onSelect={selectPlace} /><ul aria-label="نتایج جست‌وجوی کسب‌وکار" className="business-results">{results.map(p => <li key={p.id}><button type="button" onClick={() => selectPlace(p)}><MapPin size={20} aria-hidden="true" /><span><strong>{p.name}</strong><small>{p.address}</small></span><ArrowRight size={18} className="rotate-180" aria-hidden="true" /></button></li>)}</ul></>}
      <Button variant="outline" className="w-full" disabled={!draft.cityId || !!cityError} onClick={() => { patch({ businessNameFa: query.trim(), mapirPlaceId: null, locationConfirmed: false }); moveStep(1); }}>کسب‌وکارم را پیدا نکردم</Button>
    </div>}
    {step === 1 && <fieldset id="business-businessType" tabIndex={-1} className="business-types" aria-describedby={errors.businessType ? 'business-type-error' : undefined}><legend className="sr-only">نوع کسب‌وکار</legend>{Object.entries(BUSINESS_TYPES_FA).map(([key, label]) => { const Icon = icons[key as BusinessType]; return <label key={key} className="business-type" data-selected={draft.businessType === key}><input type="radio" name="businessType" value={key} checked={draft.businessType === key} onChange={() => patch({ businessType: key as BusinessType })} /><Icon size={22} aria-hidden="true" /><span>{label}</span><Check size={18} className={draft.businessType === key ? '' : 'invisible'} aria-hidden="true" /></label>; })}{errors.businessType && <p id="business-type-error" className="text-sm text-red-700">{errors.businessType}</p>}</fieldset>}
    {step === 2 && <div className="space-y-5">
      <LocationMap latitude={draft.latitude} longitude={draft.longitude} editable onChange={changeLocation} />
      <details className="business-coordinate-editor" open={!draft.locationConfirmed}><summary>ویرایش مختصات با صفحه‌کلید</summary><div className="grid grid-cols-2 gap-3 py-3"><Input id="business-latitude" label="عرض جغرافیایی" type="number" min={24} max={40} step="0.00001" dir="ltr" value={draft.latitude} onChange={e => changeLocation(Number(e.target.value), draft.longitude)} error={errors.latitude} /><Input id="business-longitude" label="طول جغرافیایی" type="number" min={44} max={64} step="0.00001" dir="ltr" value={draft.longitude} onChange={e => changeLocation(draft.latitude, Number(e.target.value))} error={errors.longitude} /></div></details>
      <Button variant="ghost" size="sm" isLoading={reverseBusy} onClick={suggestAddress}>پیشنهاد آدرس از روی نقشه</Button>
      {suggestedAddress && <div className="business-info"><p>{suggestedAddress}</p><Button variant="ghost" onClick={() => { patch({ addressFa: suggestedAddress }); setSuggestedAddress(''); }}>استفاده از این آدرس</Button></div>}
      <Input id="business-businessNameFa" label="نام فروشگاه" value={draft.businessNameFa} onChange={e => patch({ businessNameFa: e.target.value })} error={errors.businessNameFa} maxLength={100} />
      <p className="text-sm text-loqme-neutral-600">{selectedCity?.nameFa} · {draft.businessType && BUSINESS_TYPES_FA[draft.businessType]}</p>
      <Input id="business-addressFa" label="آدرس کامل" value={draft.addressFa} onChange={e => patch({ addressFa: e.target.value })} error={errors.addressFa} maxLength={255} />
      <Input id="business-phone" label="تلفن فروشگاه (اختیاری)" type="tel" dir="ltr" value={draft.phone || ''} onChange={e => patch({ phone: e.target.value })} error={errors.phone} maxLength={30} />
      <Input id="business-licenseNumber" label="شماره پروانه کسب (اختیاری)" value={draft.licenseNumber || ''} onChange={e => patch({ licenseNumber: e.target.value })} error={errors.licenseNumber} maxLength={100} />
    </div>}
    {step === 3 && <div id="business-hours" tabIndex={-1} className="space-y-3">
      {errors.hours && <p role="alert" className="text-sm text-red-700">{errors.hours}</p>}
      {draft.hours.map((day, index) => <div key={day.dayOfWeek} className="business-hours-row"><div className="flex items-center justify-between gap-3"><span className="font-medium">{WEEKDAYS_FA[day.dayOfWeek]}</span><button type="button" className="business-toggle" role="switch" aria-checked={day.isOpen} aria-label={`${WEEKDAYS_FA[day.dayOfWeek]} باز است`} onClick={() => patch({ hours: draft.hours.map((d, i) => i === index ? { ...d, isOpen: !d.isOpen } : d) })}><span>{day.isOpen ? 'باز' : 'بسته'}</span><span className="business-toggle-track"><span /></span></button></div>{day.isOpen && <div className="space-y-2 pt-3"><div className="grid grid-cols-2 gap-3"><Input label={`شروع ${WEEKDAYS_FA[day.dayOfWeek]}`} type="time" dir="ltr" value={day.storeOpenTime} onChange={e => patch({ hours: draft.hours.map((d, i) => i === index ? { ...d, storeOpenTime: e.target.value } : d) })} /><Input label={`پایان ${WEEKDAYS_FA[day.dayOfWeek]}`} type="time" dir="ltr" value={day.storeCloseTime} onChange={e => patch({ hours: draft.hours.map((d, i) => i === index ? { ...d, storeCloseTime: e.target.value } : d) })} /></div><Button variant="ghost" size="sm" disabled={!day.storeOpenTime || !day.storeCloseTime} onClick={() => patch({ hours: draft.hours.map(d => d.isOpen ? { ...d, storeOpenTime: day.storeOpenTime, storeCloseTime: day.storeCloseTime } : d) })}>کپی ساعت به روزهای باز دیگر</Button></div>}</div>)}
    </div>}
    {step === 4 && <div className="space-y-6">
      <Input id="business-ownerName" label="نام و نام خانوادگی مالک" autoComplete="name" value={ownerName} onChange={e => setOwnerName(e.target.value)} error={errors.ownerName} maxLength={100} />
      {session.status === 'loading' ? <HeartbeatLoading /> : session.status === 'authenticated' ? <div className="business-info"><p>شماره تأییدشده: <bdi>{toPersianDigits(session.user?.mobile || '')}</bdi></p><p className="text-sm mt-2">درخواست با همین حساب ثبت می‌شود. پس از بررسی و تأیید لقمه، دسترسی فروشگاه فعال خواهد شد.</p></div> : <Suspense fallback={<HeartbeatLoading />}><OtpLoginForm audience="business" embedded preventRedirect /></Suspense>}
      {session.status === 'authenticated' && <Button className="w-full" size="lg" isLoading={saving} onClick={submit}>تأیید و ارسال درخواست</Button>}
    </div>}
    {step > 0 && step < 4 && <Button className="w-full" size="lg" onClick={next}>{step === 3 ? 'تأیید ساعت‌های کاری و ادامه' : 'تأیید و ادامه'}</Button>}
  </div>;
}
