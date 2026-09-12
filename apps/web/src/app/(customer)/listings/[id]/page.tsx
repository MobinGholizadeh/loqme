'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { generateProductListingSchema } from '@/lib/seo/structured-data';

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
  imageUrl?: string | null;
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
      <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
        <Skeleton height={20} width={140} />
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-6 space-y-4 shadow-sm">
          <Skeleton height={280} width="100%" />
          <Skeleton height={28} width="70%" />
          <Skeleton height={60} width="100%" />
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="py-12 max-w-md mx-auto px-4">
        <ErrorState
          title="آگهی مورد نظر یافت نشد"
          message={errorMsg || 'ممکن است این بسته به اتمام رسیده یا آدرس تغییر کرده باشد.'}
          secondaryAction={
            <Button
              variant="primary"
              size="sm"
              className="bg-primary text-on-primary"
              onClick={() => router.push('/explore')}
            >
              بازگشت به صفحه کاوش
            </Button>
          }
        />
      </div>
    );
  }

  const startDate = new Date(data.pickupStart);
  const endDate = new Date(data.pickupEnd);
  const timeWindowStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')} تا ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  const isSurpriseBag = data.type === 'SURPRISE_BAG';
  const isLowStock = data.inventory.availableQuantity <= 3;

  const productSchema = generateProductListingSchema(
    {
      id: data.id,
      titleFa: data.titleFa,
      descriptionFa: data.descriptionFa,
      originalPriceToman: data.originalPriceToman,
      discountedPriceToman: data.discountedPriceToman,
      status: data.status,
      pickupEnd: data.pickupEnd,
    },
    data.merchant
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28 px-4">
      {/* Schema.org Product Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 hover:text-primary font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          <span>بازگشت به لیست غذاها</span>
        </button>
        <div className="flex items-center gap-2">
          <span>{data.merchant.location?.cityNameFa || 'ارومیه'}</span>
          <span>•</span>
          <span>{data.category.nameFa}</span>
        </div>
      </div>

      {/* Hero Showcase Card matching Stitch Store & Bag Details */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
        {/* Visual Hero Photographic Header */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-surface-container">
          <Image
            src={data.imageUrl || '/hero-banner.jpg'}
            alt={data.titleFa}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Floating Pill Badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-container-lowest/95 backdrop-blur-md text-primary font-black text-xs shadow-md">
              ٪{toPersianDigits(data.discountPercent)} تخفیف ویژه
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 ${
                isLowStock
                  ? 'bg-tertiary-container text-on-tertiary animate-pulse'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
              <span>تنها {toPersianDigits(data.inventory.availableQuantity)} بسته مانده</span>
            </span>
          </div>

          <div className="absolute top-4 left-4">
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className="p-2.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface hover:text-error transition-all shadow-md active:scale-90"
              title="نشان‌کردن فروشگاه"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isFavorited ? 'favorite' : 'favorite_border'}
              </span>
            </button>
          </div>

          {/* Overlay Title & Merchant Header */}
          <div className="absolute bottom-4 right-4 left-4 text-white space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary text-[11px] font-bold">
                {isSurpriseBag ? '🎁 بسته شگفت‌انگیز (Surprise Bag)' : '⚡ تخفیف ویژه (Flash Deal)'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>تضمین بهداشت اصناف</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white drop-shadow-md">
              {data.titleFa}
            </h1>

            <div className="flex items-center gap-2 text-xs text-white/90">
              <Link
                href={`/merchants/${data.merchant.id}`}
                className="font-bold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">storefront</span>
                <span>{data.merchant.businessNameFa}</span>
              </Link>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-amber-300 font-bold">
                <span className="material-symbols-outlined text-[16px]">star</span>
                <span>{toPersianDigits(data.merchant.ratingAverage.toFixed(1))}</span>
                <span className="text-white/70 text-[11px]">({toPersianDigits(data.merchant.ratingCount)})</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Price Breakdown Banner */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs text-outline line-through">
                ارزش واقعی بازار: {formatToman(data.originalPriceToman)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-primary">
                  {formatToman(data.discountedPriceToman)}
                </span>
                <span className="text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-full">
                  ٪{toPersianDigits(data.discountPercent)} صرفه‌جویی
                </span>
              </div>
            </div>

            <div className="text-left">
              <div className="text-xs font-bold text-on-tertiary-container bg-tertiary-fixed px-3 py-1.5 rounded-xl border border-tertiary-container/30 shadow-xs">
                💰 سود مستقیم شما: {formatToman(data.savingsToman)}
              </div>
            </div>
          </div>

          {/* Description */}
          {data.descriptionFa && (
            <div className="p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/20 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              {data.descriptionFa}
            </div>
          )}

          {/* Pickup Window and Inventory Quick Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">schedule</span>
              </div>
              <div>
                <div className="text-[11px] text-on-surface-variant font-medium">بازه تحویل حضوری امروز</div>
                <div className="font-bold text-xs sm:text-sm text-on-surface mt-0.5">{timeWindowStr}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">pin_drop</span>
              </div>
              <div>
                <div className="text-[11px] text-on-surface-variant font-medium">آدرس تحویل</div>
                <div className="font-bold text-xs sm:text-sm text-on-surface mt-0.5 truncate max-w-[200px]">
                  {data.merchant.location?.addressFa || 'مراجعه به فروشگاه'}
                </div>
              </div>
            </div>
          </div>

          {/* Surprise Bag Educational Notice */}
          {isSurpriseBag && (
            <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-primary">
                <span className="material-symbols-outlined text-[20px]">help_outline</span>
                <h3>بسته شگفت‌انگیز چیست؟</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                این بسته شامل دستچینی از تازه‌ترین اقلام روز تولیدشده در این واحد صنفی است. اقلام تا لحظه آماده‌سازی با توجه به فروش روزانه متغیر است، اما حداقل ارزش تضمینی آن {formatToman(data.originalPriceToman)} خواهد بود.
              </p>
            </div>
          )}

          {/* Health, Safety & Allergy Tags */}
          <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-secondary">
              <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
              <h3>ایمنی، بهداشت و رژیم غذایی</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-on-surface-variant block mb-1">ویژگی‌های تغذیه‌ای:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.safety.dietaryTags.length > 0 ? (
                    data.safety.dietaryTags.map((tag) => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold text-[11px]">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-outline">حلال و استاندارد عمومی</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-on-surface-variant block mb-1">هشدار حساسیت (آلرژن‌ها):</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.safety.allergens.length > 0 ? (
                    data.safety.allergens.map((alg) => (
                      <span key={alg} className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-semibold text-[11px]">
                        {alg}
                      </span>
                    ))
                  ) : (
                    <span className="text-outline">فاقد آلرژن اعلام‌شده</span>
                  )}
                </div>
              </div>

              {data.safety.storageInstructionsFa && (
                <div className="col-span-full pt-1">
                  <span className="text-on-surface-variant block mb-1 font-medium">شرایط نگهداری:</span>
                  <p className="text-on-surface text-xs">{data.safety.storageInstructionsFa}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Reservation Action Bar matching Stitch Specs */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/40 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-on-surface-variant">مبلغ نهایی قابل پرداخت:</div>
            <div className="font-black text-xl text-primary leading-none">
              {formatToman(data.discountedPriceToman)}
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            rounded="pill"
            disabled={data.isSoldOut || data.isExpired}
            isLoading={isReserving}
            onClick={handleReserve}
            className="flex-1 max-w-sm bg-primary hover:bg-primary-container text-white py-3.5 text-sm font-bold shadow-md active:scale-98"
          >
            {data.isSoldOut ? 'تکمیل ظرفیت' : data.isExpired ? 'پایان زمان تحویل' : 'رزرو ۱۰ دقیقه‌ای لقمه'}
          </Button>
        </div>
      </div>
    </div>
  );
}
