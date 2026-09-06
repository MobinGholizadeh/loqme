'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

interface ListingDetailData {
  id: string;
  merchantId: string;
  titleFa: string;
  descriptionFa: string | null;
  type: 'SURPRISE_BAG' | 'FLASH_DEAL';
  status: string;
  originalPriceToman: number;
  discountedPriceToman: number;
  savingsToman: number;
  discountPercent: number;
  pickupStart: string;
  pickupEnd: string;
  isExpired: boolean;
  isSoldOut: boolean;
  inventory: {
    totalQuantity: number;
    availableQuantity: number;
  };
  safety: {
    safetyStatus: string;
    allergens: string[];
    dietaryTags: string[];
    storageInstructionsFa: string | null;
    temperatureRequirement: string;
  };
  category: {
    id: string;
    nameFa: string;
    slug: string;
    iconUrl: string | null;
  };
  merchant: {
    id: string;
    businessNameFa: string;
    businessType: string;
    ratingAverage: number;
    ratingCount: number;
    isFavorited: boolean;
    location: {
      id: string;
      addressFa: string;
      latitude: number;
      longitude: number;
      phone: string | null;
      cityNameFa: string;
      neighborhoodNameFa: string;
      hours: any[];
    } | null;
  };
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params?.id as string;

  const [data, setData] = useState<ListingDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [isReserving, setIsReserving] = useState<boolean>(false);

  const handleReserve = async () => {
    if (!data || isReserving) return;
    setIsReserving(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: data.id, quantity: 1 }),
      });

      const json = await res.json();

      if (res.status === 401) {
        router.push(`/login?redirect=/listings/${data.id}`);
        return;
      }

      if (json.success && json.data) {
        router.push(`/checkout/${json.data.id}`);
      } else {
        alert(json.message || 'خطا در رزرو بسته');
      }
    } catch (err) {
      console.error('Reservation error:', err);
      alert('ارتباط با سرور برقرار نشد');
    } finally {
      setIsReserving(false);
    }
  };

  useEffect(() => {
    if (!listingId) return;

    async function fetchDetails() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setIsFavorited(json.data.merchant.isFavorited);
        } else {
          setErrorMsg(json.message || 'خطا در بارگذاری مشخصات آگهی');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('ارتباط با سرور برقرار نشد');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [listingId]);

  const handleToggleFavorite = async () => {
    if (!data?.merchantId || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch(`/api/merchants/${data.merchantId}/favorite`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setIsFavorited(json.isFavorited);
      } else if (res.status === 401) {
        alert('برای ثبت فروشگاه در علاقه‌مندی‌ها، لطفاً ابتدا وارد حساب کاربری خود شوید.');
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-loqme-neutral-500">
        <Spinner size="lg" />
        <span className="text-xs font-medium">در حال بارگذاری مشخصات بسته...</span>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-bold text-loqme-neutral-800">
          {errorMsg || 'آگهی مورد نظر یافت نشد'}
        </h2>
        <Button variant="primary" size="sm" onClick={() => router.push('/explore')}>
          بازگشت به صفحه کاوش
        </Button>
      </div>
    );
  }

  const startDate = new Date(data.pickupStart);
  const endDate = new Date(data.pickupEnd);
  const timeWindowStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')} تا ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

  const isSurpriseBag = data.type === 'SURPRISE_BAG';

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between text-xs text-loqme-neutral-500">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 hover:text-loqme-primary-700 font-bold transition-colors"
        >
          <span>←</span>
          <span>بازگشت</span>
        </button>
        <div className="flex items-center gap-1.5">
          <span>{data.merchant.location?.cityNameFa || 'ارومیه'}</span>
          <span>•</span>
          <span>{data.category.nameFa}</span>
        </div>
      </div>

      {/* Hero Card */}
      <Card variant="elevated" className="overflow-hidden p-6 relative">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isSurpriseBag ? 'brand' : 'neutral'} size="sm">
                {isSurpriseBag ? '🎁 بسته شگفت‌انگیز (Surprise Bag)' : '⚡ تخفیف ویژه (Flash Deal)'}
              </Badge>
              <Badge variant="success" size="sm">
                ✓ تضمین سلامت و بهداشت
              </Badge>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-loqme-neutral-900 leading-tight">
              {data.titleFa}
            </h1>

            <div className="flex items-center gap-2 text-xs text-loqme-neutral-600 pt-1">
              <Link
                href={`/merchants/${data.merchant.id}`}
                className="font-bold text-loqme-primary-700 hover:underline"
              >
                {data.merchant.businessNameFa}
              </Link>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="text-amber-500">★</span>
                <span className="font-bold">{toPersianDigits(data.merchant.ratingAverage.toFixed(1))}</span>
                <span className="text-loqme-neutral-400">
                  ({toPersianDigits(data.merchant.ratingCount)} نظر)
                </span>
              </span>
            </div>
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            className={`self-start p-3 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
              isFavorited
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-loqme-neutral-50 text-loqme-neutral-600 border-loqme-neutral-200 hover:bg-loqme-neutral-100'
            }`}
            title={isFavorited ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          >
            <span>{isFavorited ? '❤️' : '🤍'}</span>
            <span>{isFavorited ? 'علاقه‌مندی' : 'افزودن به محبوب‌ها'}</span>
          </button>
        </div>

        {/* Description */}
        {data.descriptionFa && (
          <div className="mt-4 p-4 rounded-2xl bg-loqme-neutral-50 border border-loqme-neutral-100 text-xs md:text-sm text-loqme-neutral-700 leading-relaxed">
            {data.descriptionFa}
          </div>
        )}

        {/* Pricing Breakdown Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-loqme-primary-50/60 border border-loqme-primary-100 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-loqme-neutral-400 line-through">
              ارزش واقعی: {formatToman(data.originalPriceToman)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-loqme-primary-800">
                {formatToman(data.discountedPriceToman)}
              </span>
              <Badge variant="brand" size="sm">
                {toPersianDigits(data.discountPercent)}٪ تخفیف
              </Badge>
            </div>
          </div>

          <div className="text-right sm:text-left">
            <div className="text-xs font-bold text-loqme-primary-700 bg-white px-3 py-1.5 rounded-xl border border-loqme-primary-200 shadow-xs inline-block">
              💰 سود شما: {formatToman(data.savingsToman)}
            </div>
          </div>
        </div>

        {/* Pickup Window and Inventory Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-white border border-loqme-neutral-200 flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <div className="text-[11px] text-loqme-neutral-500">زمان تحویل حضوری امروز</div>
              <div className="font-bold text-xs text-loqme-neutral-800">{timeWindowStr}</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-loqme-neutral-200 flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <div className="text-[11px] text-loqme-neutral-500">موجودی باقی‌مانده</div>
              <div className="font-bold text-xs text-loqme-primary-700">
                تنها {toPersianDigits(data.inventory.availableQuantity)} بسته در انبار
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Surprise Bag Logic / What's inside */}
      {isSurpriseBag ? (
        <Card variant="outlined" className="p-5 space-y-3 bg-white">
          <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
            <span>🎁</span>
            <h3>بسته شگفت‌انگیز چیست؟</h3>
          </div>
          <p className="text-xs text-loqme-neutral-600 leading-relaxed">
            این بسته شامل دستچینی از تازه‌ترین اقلام روز تولیدشده در این فروشگاه است که به پایان ساعت کاری نزدیک شده‌اند. محتویات دقیق بسته بر اساس موجودی روزانه متغیر است، اما ارزش محتوای آن تضمین‌شده و معادل حداقل {formatToman(data.originalPriceToman)} ارزش بازار خواهد بود.
          </p>
        </Card>
      ) : null}

      {/* Food Safety & Dietary Clearance */}
      <Card variant="outlined" className="p-5 space-y-4 bg-white">
        <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
          <span>🛡️</span>
          <h3>اطلاعات سلامت و رژیم غذایی</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-bold text-loqme-neutral-700 block mb-1">ویژگی‌های تغذیه‌ای:</span>
            <div className="flex flex-wrap gap-1.5">
              {data.safety.dietaryTags.length > 0 ? (
                data.safety.dietaryTags.map((tag) => (
                  <Badge key={tag} variant="success" size="sm">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-loqme-neutral-400">حلال و استاندارد عمومی</span>
              )}
            </div>
          </div>

          <div>
            <span className="font-bold text-loqme-neutral-700 block mb-1">هشدار حساسیت‌زایی (آلرژن‌ها):</span>
            <div className="flex flex-wrap gap-1.5">
              {data.safety.allergens.length > 0 ? (
                data.safety.allergens.map((alg) => (
                  <Badge key={alg} variant="warning" size="sm">
                    {alg}
                  </Badge>
                ))
              ) : (
                <span className="text-loqme-neutral-400">فاقد آلرژن شناخته‌شده</span>
              )}
            </div>
          </div>

          {data.safety.storageInstructionsFa && (
            <div className="col-span-full">
              <span className="font-bold text-loqme-neutral-700 block mb-1">دستورالعمل نگهداری:</span>
              <p className="text-loqme-neutral-600">{data.safety.storageInstructionsFa}</p>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
          <strong>تضمین اصالت سلامت لقمه:</strong> کلیه محصولات ثبت‌شده در لقمه دارای تاریخ مصرف معتبر، بهداشتی و مورد تایید استاندارد غذایی هستند. فروش هرگونه ماده غذایی تاریخ‌گذشته در لقمه اکیداً ممنوع است.
        </div>
      </Card>

      {/* Store Location Card */}
      {data.merchant.location && (
        <Card variant="outlined" className="p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
              <span>📍</span>
              <h3>محل تحویل حضوری</h3>
            </div>
            <Link
              href={`/merchants/${data.merchant.id}`}
              className="text-xs text-loqme-primary-700 font-bold hover:underline"
            >
              پروفایل فروشگاه ←
            </Link>
          </div>

          <div className="text-xs text-loqme-neutral-600 space-y-1">
            <p className="font-bold text-loqme-neutral-800">{data.merchant.businessNameFa}</p>
            <p>{data.merchant.location.addressFa}</p>
            {data.merchant.location.phone && (
              <p className="text-loqme-neutral-500">شماره تماس: {data.merchant.location.phone}</p>
            )}
          </div>
        </Card>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-loqme-neutral-200 p-4 shadow-float">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-loqme-neutral-400">مبلغ نهایی پرداختی:</div>
            <div className="font-black text-lg text-loqme-primary-700">
              {formatToman(data.discountedPriceToman)}
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            disabled={data.isSoldOut || data.isExpired}
            isLoading={isReserving}
            onClick={handleReserve}
            className="flex-1 max-w-xs"
          >
            {data.isSoldOut ? 'تکمیل موجودی' : data.isExpired ? 'زمان تحویل سپری شده' : 'رزرو ۱۰ دقیقه‌ای بسته'}
          </Button>
        </div>
      </div>
    </div>
  );
}
