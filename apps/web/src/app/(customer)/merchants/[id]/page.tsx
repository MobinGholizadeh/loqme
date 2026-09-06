'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

interface MerchantDetailData {
  id: string;
  businessNameFa: string;
  businessType: string;
  ratingAverage: number;
  ratingCount: number;
  verificationStatus: string;
  isFavorited: boolean;
  location: {
    id: string;
    addressFa: string;
    latitude: number;
    longitude: number;
    phone: string | null;
    cityNameFa: string;
    neighborhoodNameFa: string;
    hours: Array<{
      dayOfWeek: number;
      isOpen: boolean;
      storeOpenTime: string;
      storeCloseTime: string;
      defaultPickupStart: string;
      defaultPickupEnd: string;
    }>;
  } | null;
  activeListings: Array<{
    id: string;
    titleFa: string;
    type: 'SURPRISE_BAG' | 'FLASH_DEAL';
    originalPriceToman: number;
    discountedPriceToman: number;
    discountPercent: number;
    remainingQuantity: number;
    pickupWindowFa: string;
    pickupEndIso: string;
    categoryNameFa: string;
    categorySlug: string;
  }>;
}

const DAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

export default function MerchantProfilePage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params?.id as string;

  const [data, setData] = useState<MerchantDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!merchantId) return;

    async function fetchMerchant() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/merchants/${merchantId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setIsFavorited(json.data.isFavorited);
        } else {
          setErrorMsg(json.message || 'خطا در دریافت اطلاعات فروشگاه');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('ارتباط با سرور برقرار نشد');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMerchant();
  }, [merchantId]);

  const handleToggleFavorite = async () => {
    if (!merchantId || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch(`/api/merchants/${merchantId}/favorite`, {
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
        <span className="text-xs font-medium">در حال دریافت مشخصات فروشگاه...</span>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="text-4xl">🏬</div>
        <h2 className="text-lg font-bold text-loqme-neutral-800">
          {errorMsg || 'فروشگاه مورد نظر یافت نشد'}
        </h2>
        <Button variant="primary" size="sm" onClick={() => router.push('/explore')}>
          بازگشت به کاوش
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-xs text-loqme-neutral-500 hover:text-loqme-primary-700 font-bold transition-colors"
      >
        <span>←</span>
        <span>بازگشت به لیست</span>
      </button>

      {/* Store Header Banner */}
      <Card variant="elevated" className="overflow-hidden p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                ✓ شریک تجاری تاییدشده لقمه
              </Badge>
              {data.location?.neighborhoodNameFa && (
                <Badge variant="neutral" size="sm">
                  {data.location.cityNameFa} — {data.location.neighborhoodNameFa}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-loqme-neutral-900">
              {data.businessNameFa}
            </h1>

            <div className="flex items-center gap-3 text-xs text-loqme-neutral-600 pt-1">
              <span className="flex items-center gap-1 font-bold">
                <span className="text-amber-500">★</span>
                <span>{toPersianDigits(data.ratingAverage.toFixed(1))}</span>
                <span className="text-loqme-neutral-400 font-normal">
                  ({toPersianDigits(data.ratingCount)} نظر ثبت‌شده)
                </span>
              </span>
            </div>

            {data.location?.addressFa && (
              <p className="text-xs text-loqme-neutral-600 flex items-start gap-1 pt-1">
                <span>📍</span>
                <span>{data.location.addressFa}</span>
              </p>
            )}

            {data.location?.phone && (
              <p className="text-xs text-loqme-neutral-500 flex items-center gap-1">
                <span>📞</span>
                <span>تلفن تماس: {data.location.phone}</span>
              </p>
            )}
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            className={`self-start p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
              isFavorited
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-loqme-neutral-50 text-loqme-neutral-600 border-loqme-neutral-200 hover:bg-loqme-neutral-100'
            }`}
          >
            <span>{isFavorited ? '❤️' : '🤍'}</span>
            <span>{isFavorited ? 'در علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}</span>
          </button>
        </div>
      </Card>

      {/* Operating Hours & Surplus Schedule */}
      {data.location?.hours && data.location.hours.length > 0 && (
        <Card variant="outlined" className="p-5 space-y-3 bg-white">
          <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
            <span>⏰</span>
            <h3>ساعات کاری و بازه تحویل بسته‌های مازاد</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {data.location.hours.map((h) => (
              <div
                key={h.dayOfWeek}
                className="flex items-center justify-between p-2 rounded-xl bg-loqme-neutral-50 border border-loqme-neutral-100"
              >
                <span className="font-bold text-loqme-neutral-800">{DAY_NAMES[h.dayOfWeek]}:</span>
                {h.isOpen ? (
                  <span className="text-loqme-neutral-600">
                    {h.storeOpenTime} تا {h.storeCloseTime} (تحویل: {h.defaultPickupStart} تا {h.defaultPickupEnd})
                  </span>
                ) : (
                  <span className="text-rose-500 font-medium">تعطیل</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Listings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-loqme-neutral-900">
              بسته‌های فعال و آماده تحویل
            </h2>
            <p className="text-xs text-loqme-neutral-500 mt-0.5">
              اقلام مازاد باکیفیت و تازه امروز این فروشگاه
            </p>
          </div>
          <Badge variant="brand" size="sm">
            {toPersianDigits(data.activeListings.length)} موجود
          </Badge>
        </div>

        {data.activeListings.length === 0 ? (
          <Card variant="outlined" className="p-8 text-center space-y-3 bg-white">
            <div className="text-3xl">🧺</div>
            <h3 className="font-bold text-sm text-loqme-neutral-800">
              در حال حاضر بسته‌ای برای این فروشگاه موجود نیست
            </h3>
            <p className="text-xs text-loqme-neutral-500 max-w-sm mx-auto leading-relaxed">
              با افزودن این فروشگاه به علاقه‌مندی‌های خود، به محض ثبت بسته شگفت‌انگیز جدید، مطلع خواهید شد.
            </p>
            <div className="pt-2">
              <Button size="sm" variant="secondary" onClick={handleToggleFavorite}>
                {isFavorited ? '❤️ در لیست علاقه‌مندی شماست' : '🤍 افزودن به علاقه‌مندی‌ها'}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.activeListings.map((listing) => (
              <Card key={listing.id} variant="elevated" isInteractive className="p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={listing.type === 'SURPRISE_BAG' ? 'brand' : 'neutral'} size="sm">
                      {listing.type === 'SURPRISE_BAG' ? '🎁 سورپرایز' : '⚡ تخفیف'}
                    </Badge>
                    <span className="text-xs font-bold text-loqme-primary-700">
                      تنها {toPersianDigits(listing.remainingQuantity)} عدد
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-loqme-neutral-900 mb-2">
                    {listing.titleFa}
                  </h3>

                  <div className="bg-loqme-primary-50 text-loqme-primary-800 text-xs px-2.5 py-1 rounded-lg mb-3 flex items-center justify-between">
                    <span>⏰ زمان تحویل:</span>
                    <span className="font-bold">{listing.pickupWindowFa}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-loqme-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-loqme-neutral-400 line-through">
                      {formatToman(listing.originalPriceToman)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-base text-loqme-primary-800">
                        {formatToman(listing.discountedPriceToman)}
                      </span>
                      <Badge variant="brand" size="sm">
                        {toPersianDigits(listing.discountPercent)}٪
                      </Badge>
                    </div>
                  </div>

                  <Link href={`/listings/${listing.id}`}>
                    <Button size="sm" variant="primary">
                      مشاهده
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
