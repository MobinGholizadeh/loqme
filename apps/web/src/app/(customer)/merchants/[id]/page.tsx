"use client";
import { ListingCard } from "@/components/discovery/ListingCard";
import { useFeedback } from "@/components/ui/useFeedback";
import * as RedesignIcons from "lucide-react";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { generateLocalBusinessSchema } from "@/lib/seo/structured-data";

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
      defaultPickupStart: string | null;
      defaultPickupEnd: string | null;
    }>;
  } | null;
  activeListings: Array<{
    imageUrl?: string | null;
    safetyVerified: boolean;
    id: string;
    titleFa: string;
    type: "SURPRISE_BAG" | "FLASH_DEAL";
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

const DAY_NAMES = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
  "شنبه",
];

export default function MerchantProfilePage() {
  const { showFeedback, feedbackDialog } = useFeedback();
  const params = useParams();
  const router = useRouter();
  const merchantId = params?.id as string;

  const [data, setData] = useState<MerchantDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);

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
          setErrorMsg(json.message || "خطا در دریافت اطلاعات فروشگاه");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("ارتباط با سرور برقرار نشد");
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchReviews() {
      setReviewsLoading(true);
      try {
        const res = await fetch(`/api/reviews?merchantId=${merchantId}`);
        const json = await res.json();
        if (json.success) {
          setReviews(json.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setReviewsLoading(false);
      }
    }

    fetchMerchant();
    fetchReviews();
  }, [merchantId]);

  const handleToggleFavorite = async () => {
    if (!merchantId || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch(`/api/merchants/${merchantId}/favorite`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setIsFavorited(json.isFavorited);
      } else if (res.status === 401) {
        showFeedback(
          "برای ثبت فروشگاه در علاقه‌مندی‌ها، لطفاً ابتدا وارد حساب کاربری خود شوید.",
        );
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto py-4">
        <Skeleton height={20} width={100} />
        <div className="bg-white rounded-lg border border-loqme-neutral-200 p-6 space-y-3 shadow-card">
          <Skeleton height={22} width={160} />
          <Skeleton height={32} width={240} />
          <Skeleton height={18} width={180} />
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState
          title="فروشگاه مورد نظر یافت نشد"
          message={errorMsg || "اطلاعات این فروشگاه در دسترس نیست."}
          secondaryAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/explore")}
            >
              بازگشت به کاوش
            </Button>
          }
        />
      </div>
    );
  }

  const businessSchema = generateLocalBusinessSchema({
    id: data.id,
    businessNameFa: data.businessNameFa,
    businessType: data.businessType,
    ratingAverage: data.ratingAverage,
    ratingCount: data.ratingCount,
    phone: data.location?.phone,
    locations: data.location
      ? [
          {
            addressFa: data.location.addressFa,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            city: { nameFa: data.location.cityNameFa },
          },
        ]
      : [],
  });

  return (
    <div className="store-page space-y-8 max-w-6xl mx-auto pb-16">
      {/* Schema.org LocalBusiness Structured Data for SEO */}
      {feedbackDialog}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />

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
      <Card variant="elevated" className="store-overview overflow-hidden p-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                ✓ شریک تجاری تاییدشده لقمه
              </Badge>
              {data.location?.neighborhoodNameFa && (
                <Badge variant="neutral" size="sm">
                  {data.location.cityNameFa} —{" "}
                  {data.location.neighborhoodNameFa}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-loqme-neutral-900">
              {data.businessNameFa}
            </h1>

            <div className="flex items-center gap-3 text-xs text-loqme-neutral-600 pt-1">
              <span className="flex items-center gap-1 font-bold">
                <span className="text-amber-700">★</span>
                <span>{toPersianDigits(data.ratingAverage.toFixed(1))}</span>
                <span className="text-loqme-neutral-500 font-normal">
                  ({toPersianDigits(data.ratingCount)} نظر ثبت‌شده)
                </span>
              </span>
            </div>

            {data.location?.addressFa && (
              <p className="text-xs text-loqme-neutral-600 flex items-start gap-1 pt-1">
                <span>
                  <RedesignIcons.MapPin size={20} aria-hidden="true" />
                </span>
                <span>{data.location.addressFa}</span>
              </p>
            )}

            {data.location?.phone && (
              <p className="text-xs text-loqme-neutral-500 flex items-center gap-1">
                <span>
                  <RedesignIcons.Phone size={20} aria-hidden="true" />
                </span>
                <span>تلفن تماس: {toPersianDigits(data.location.phone)}</span>
              </p>
            )}
          </div>

          {/* Favorite Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            className={`self-start p-3 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${
              isFavorited
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : "bg-loqme-neutral-50 text-loqme-neutral-600 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
            }`}
          >
            <RedesignIcons.Heart
              size={18}
              fill={isFavorited ? "currentColor" : "none"}
            />
            <span>
              {isFavorited ? "در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            </span>
          </button>
        </div>
      </Card>

      {/* Operating Hours & Surplus Schedule */}
      {data.location?.hours && data.location.hours.length > 0 && (
        <Card variant="outlined" className="p-5 space-y-3 bg-white">
          <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
            <span>
              <RedesignIcons.Clock3 size={20} aria-hidden="true" />
            </span>
            <h3>ساعات کاری و بازه تحویل بسته‌های مازاد</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {data.location.hours.map((h) => (
              <div
                key={h.dayOfWeek}
                className="flex items-center justify-between p-2 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-100"
              >
                <span className="font-bold text-loqme-neutral-800">
                  {DAY_NAMES[h.dayOfWeek]}:
                </span>
                {h.isOpen ? (
                  <span className="text-loqme-neutral-600">
                    {h.storeOpenTime} تا {h.storeCloseTime}{' '}
                    {h.defaultPickupStart && h.defaultPickupEnd ? `(تحویل: ${h.defaultPickupStart} تا ${h.defaultPickupEnd})` : '(بازه تحویل هنوز تنظیم نشده)'}
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
          <Card
            variant="outlined"
            className="p-8 text-center space-y-3 bg-white"
          >
            <div className="text-3xl">🧺</div>
            <h3 className="font-bold text-sm text-loqme-neutral-800">
              در حال حاضر بسته‌ای برای این فروشگاه موجود نیست
            </h3>
            <p className="text-xs text-loqme-neutral-500 max-w-sm mx-auto leading-relaxed">
              بسته‌های این فروشگاه را در زمان دیگری بررسی کنید.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleToggleFavorite}
              >
                {isFavorited
                  ? "❤️ در لیست علاقه‌مندی شماست"
                  : "🤍 افزودن به علاقه‌مندی‌ها"}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="listing-grid">
            {data.activeListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  merchantId: data.id,
                  storeNameFa: data.businessNameFa,
                  businessType: data.businessType,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Verified Customer Reviews Section */}
      <div className="space-y-4 pt-4 border-t border-loqme-neutral-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-loqme-neutral-900 flex items-center gap-2">
              <span>★</span>
              <span>نظرات و تجربیات خریداران تایید شده</span>
            </h2>
            <p className="text-xs text-loqme-neutral-500 mt-0.5">
              تنها کاربرانی که بسته را شخصاً تحویل گرفته‌اند مجاز به ثبت نظر
              هستند
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
            <span className="text-amber-700 text-sm font-bold">
              ★ {toPersianDigits(data.ratingAverage.toFixed(1))}
            </span>
            <span className="text-[11px] text-amber-800">
              ({toPersianDigits(data.ratingCount)} نظر)
            </span>
          </div>
        </div>

        {reviewsLoading ? (
          <div className="space-y-3">
            <Skeleton height={90} width="100%" />
            <Skeleton height={90} width="100%" />
          </div>
        ) : reviews.length === 0 ? (
          <Card
            variant="outlined"
            className="p-6 text-center space-y-2 bg-white"
          >
            <div className="text-2xl">💬</div>
            <h3 className="font-bold text-xs text-loqme-neutral-800">
              هنوز نظری برای این فروشگاه ثبت نشده است
            </h3>
            <p className="text-[11px] text-loqme-neutral-500 max-w-sm mx-auto">
              پس از خرید و تحویل حضوری بسته، نظر شما با نشان «خریدار تایید شده»
              در این بخش نمایش داده خواهد شد.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => {
              const customerName =
                rev.customer?.fullName ||
                (rev.customer?.user?.mobile
                  ? `خریدار ${rev.customer.user.mobile.slice(0, 4)}***${rev.customer.user.mobile.slice(-3)}`
                  : "خریدار لقمه");
              const itemTitle = rev.order?.items?.[0]?.listing?.titleFa;

              return (
                <Card
                  key={rev.id}
                  variant="elevated"
                  className="p-4 space-y-3 bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-loqme-neutral-900">
                          {customerName}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <span>✓</span>
                          <span>خریدار تایید شده</span>
                        </span>
                      </div>
                      {itemTitle && (
                        <p className="text-[11px] text-loqme-neutral-500">
                          سفارش: {itemTitle}
                        </p>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 direction-ltr text-amber-400 text-sm"
                      dir="ltr"
                    >
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={
                            s <= rev.overallRating
                              ? "text-amber-400"
                              : "text-gray-200"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  {rev.commentFa && (
                    <p className="text-xs text-loqme-neutral-700 leading-relaxed bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                      {rev.commentFa}
                    </p>
                  )}

                  {/* Merchant official reply */}
                  {rev.merchantReplyFa && (
                    <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-lg space-y-1 mr-4 border-r-2 border-r-teal-600">
                      <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
                        <span>پاسخ فروشگاه {data.businessNameFa}:</span>
                        <span className="text-teal-600 font-normal">
                          رسمی ✓
                        </span>
                      </div>
                      <p className="text-xs text-teal-800 leading-relaxed">
                        {rev.merchantReplyFa}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
