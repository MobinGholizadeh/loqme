"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

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
import { generateProductListingSchema } from "@/lib/seo/structured-data";

import { ListingImage } from "@/components/ui/ListingImage";
import { Heart } from "lucide-react";
import { foodLabelFa } from "@/lib/utils/food-labels";
import { MerchantRatings } from "@/components/reviews/MerchantRatings";
import type { MerchantRatingSummaryDto, PickupDetailsDto } from "@loqme/types";

interface ListingDetailData {
  pickupDetails?: PickupDetailsDto;
  canReserve?: boolean;
  availability?: string;
  images?: { imageUrl: string }[];
  id: string;
  merchantId: string;
  titleFa: string;
  descriptionFa: string | null;
  type: "SURPRISE_BAG" | "FLASH_DEAL";
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
    ratings?: MerchantRatingSummaryDto;
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
  const { showFeedback, feedbackDialog } = useFeedback();
  const params = useParams();
  const router = useRouter();
  const listingId = params?.id as string;

  const [data, setData] = useState<ListingDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false);
  const [isReserving, setIsReserving] = useState<boolean>(false);

  async function refreshAvailability() {
    try {
      const response = await fetch(`/api/listings/${listingId}`, { cache: "no-store" });
      const result = await response.json();
      if (response.ok && result.success) setData(result.data);
    } catch { /* Keep existing detail; reservation remains server-authoritative. */ }
  }
  useEffect(() => {
    if (!listingId) return;
    window.addEventListener("focus", refreshAvailability);
    return () => window.removeEventListener("focus", refreshAvailability);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);
  const handleReserve = async () => {
    if (!data || isReserving || data.canReserve === false) return;
    setIsReserving(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        await refreshAvailability();
        showFeedback(json.message || "خطا در رزرو بسته");
      }
    } catch (err) {
      console.error("Reservation error:", err);
      showFeedback("ارتباط با سرور برقرار نشد");
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
          setErrorMsg(json.message || "خطا در بارگذاری مشخصات آگهی");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("ارتباط با سرور برقرار نشد");
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
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setIsFavorited(json.isFavorited);
      } else if (res.status === 401) {
        showFeedback(
          "برای ثبت فروشگاه در علاقه‌مندی‌ها، لطفاً ابتدا وارد حساب کاربری خود شوید",
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
        <Skeleton height={20} width={120} />
        <div className="bg-white rounded-lg border border-loqme-neutral-200 p-6 space-y-4 shadow-card">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Skeleton height={20} width={180} />
              <Skeleton height={28} width="70%" />
              <Skeleton height={16} width={140} />
            </div>
            <Skeleton height={36} width={90} />
          </div>
          <Skeleton height={60} width="100%" />
          <Skeleton height={80} width="100%" />
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState
          title="آگهی مورد نظر یافت نشد"
          message={
            errorMsg ||
            "ممکن است این بسته حذف شده باشد یا آدرس اشتباه وارد شده باشد"
          }
          secondaryAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/explore")}
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
  const timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' } as const;
  const timeWindowStr = `${startDate.toLocaleTimeString('fa-IR', timeOptions)} تا ${endDate.toLocaleTimeString('fa-IR', timeOptions)}`;
  const pickupDay = startDate.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' });

  const isSurpriseBag = data.type === "SURPRISE_BAG";

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
    data.merchant,
  );

  return (
    <div className="detail-page">
      {/* Schema.org Product Structured Data for SEO */}
      {feedbackDialog}
      {data.canReserve === false && <p role="status" className="rounded-lg bg-loqme-neutral-100 p-4 text-sm">
        ناموجود · {data.availability === "RESERVED" ? "همه بسته‌ها فعلاً در حال رزرو هستند؛ ممکن است دوباره موجود شوند" : data.isExpired ? "زمان دریافت این بسته پایان یافته است" : "این بسته اکنون قابل رزرو نیست"}
      </p>}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <div className="detail-photo">
        <ListingImage src={data.images?.[0]?.imageUrl} alt={data.titleFa} priority sizes="(max-width: 767px) 100vw, (max-width: 1280px) calc(100vw - 64px), 1216px" />
        <div className="detail-photo-actions">
          <Link href="/explore" className="detail-round-button" aria-label="بازگشت به کاوش"><RedesignIcons.ArrowRight size={22}/></Link>
          <Link className="detail-photo-shop" href={`/merchants/${data.merchant.id}`}>{data.merchant.businessNameFa}</Link>
          <RippleButton type="button" className="detail-round-button" aria-label="اشتراک‌گذاری بسته" onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: data.titleFa, url: window.location.href });
              else { await navigator.clipboard.writeText(window.location.href); showFeedback('پیوند بسته کپی شد'); }
            } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) showFeedback('اشتراک‌گذاری ممکن نشد؛ پیوند صفحه را از نوار آدرس کپی کنید'); }
          }}><RedesignIcons.Share2 size={20}/></RippleButton>
          <RippleButton type="button" className="detail-round-button" onClick={handleToggleFavorite} disabled={favoriteLoading} aria-pressed={isFavorited} aria-label={isFavorited ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}><Heart size={22} fill={isFavorited ? "currentColor" : "none"}/></RippleButton>
        </div>
      </div>
      <Card
        variant="elevated"
        className="detail-overview overflow-hidden relative"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isSurpriseBag ? "brand" : "neutral"} size="sm">
                {isSurpriseBag
                  ? "بسته شگفت‌انگیز"
                  : "تخفیف ویژه"}
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
                <span className="text-amber-700">★</span>
                <span className="font-bold">
                  {toPersianDigits(data.merchant.ratingAverage.toFixed(1))}
                </span>
                <span className="text-loqme-neutral-500">
                  ({toPersianDigits(data.merchant.ratingCount)} نظر)
                </span>
              </span>
            </div>
          </div>

        </div>

        {/* Description */}
        {data.descriptionFa && (
          <div className="mt-4 p-4 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-100 text-xs md:text-sm text-loqme-neutral-700 leading-relaxed">
            {data.descriptionFa}
          </div>
        )}

        {/* Pricing Breakdown Banner */}
        <div className="mt-6 p-4 rounded-lg bg-loqme-primary-50/60 border border-loqme-primary-100 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-loqme-neutral-500 line-through">
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
            <div className="text-xs font-bold text-loqme-primary-700 bg-white px-3 py-1.5 rounded-lg border border-loqme-primary-200 shadow-xs inline-block">
              سود شما: {formatToman(data.savingsToman)}
            </div>
          </div>
        </div>

        {/* Pickup Window and Inventory Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white border border-loqme-neutral-200 flex items-center gap-3">
            <span className="text-2xl">
              <RedesignIcons.Clock3 size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="text-[11px] text-loqme-neutral-500">
                زمان دریافت حضوری · {pickupDay}
              </div>
              <div className="font-bold text-xs text-loqme-neutral-800">
                {timeWindowStr}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white border border-loqme-neutral-200 flex items-center gap-3">
            <span className="text-2xl">
              <RedesignIcons.Package size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="text-[11px] text-loqme-neutral-500">
                موجودی باقی‌مانده
              </div>
              <div className="font-bold text-xs text-loqme-primary-700">
                {toPersianDigits(data.inventory.availableQuantity)} بسته باقی مانده
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8"><MerchantRatings ratings={data.merchant.ratings} /></div>
      </Card>

      {/* Surprise Bag Logic / What's inside */}
      {isSurpriseBag ? (
        <Card variant="outlined" className="p-5 space-y-3 bg-white">
          <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
            <span>
              <RedesignIcons.Gift size={20} aria-hidden="true" />
            </span>
            <h3>بسته شگفت‌انگیز چیست؟</h3>
          </div>
          <p className="text-xs text-loqme-neutral-600 leading-relaxed">
            این بسته شامل دستچینی از تازه‌ترین اقلام روز تولیدشده در این فروشگاه
            است که به پایان ساعت کاری نزدیک شده‌اند؛ محتویات دقیق بسته بر اساس
            موجودی روزانه متغیر است، اما ارزش محتوای آن تضمین‌شده و معادل حداقل{" "}
            {formatToman(data.originalPriceToman)} ارزش بازار خواهد بود
          </p>
        </Card>
      ) : null}

      <Card variant="outlined" className="pickup-information">
        <section><h2>راهنمای دریافت</h2><p>در بازه دریافت به فروشگاه مراجعه کنید و کد QR یا رمز تحویل سفارش را به مسئول فروشگاه نشان دهید</p>
        {data.pickupDetails?.instructionsFa && <p>{data.pickupDetails.instructionsFa}</p>}</section>
        <section><h2>بسته‌بندی</h2><div className="packaging-options">
          {([{ key: 'containerProvided', label: 'ظرف غذا', Icon: RedesignIcons.Package }, { key: 'carrierBagProvided', label: 'کیسه حمل', Icon: RedesignIcons.ShoppingBag }] as const).map(({ key, label, Icon }) => {
            const provided = data.pickupDetails?.[key];
            return <div key={key} className="packaging-option" data-provided={provided == null ? 'unknown' : String(provided)}><Icon size={36} aria-hidden="true"/><h3>{label}</h3><p>{provided === true ? 'ارائه می‌شود' : provided === false ? 'ارائه نمی‌شود' : 'مشخص نشده'}</p></div>;
          })}
        </div><p className="packaging-advice"><RedesignIcons.Info size={18} aria-hidden="true"/>پیشنهاد می‌کنیم کیسه خودتان را همراه بیاورید</p></section>
      </Card>

      {/* Food Safety & Dietary Clearance */}
      <Card variant="outlined" className="p-5 space-y-4 bg-white">
        <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
          <span>
            <RedesignIcons.ShieldCheck size={20} aria-hidden="true" />
          </span>
          <h3>اطلاعات سلامت و رژیم غذایی</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-bold text-loqme-neutral-700 block mb-1">
              ویژگی‌های تغذیه‌ای:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {data.safety.dietaryTags.length > 0 ? (
                data.safety.dietaryTags.map((tag) => (
                  <Badge key={tag} variant="success" size="sm">
                    {foodLabelFa(tag, 'dietary')}
                  </Badge>
                ))
              ) : (
                <span className="text-loqme-neutral-500">
                  اطلاعاتی ثبت نشده است
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="font-bold text-loqme-neutral-700 block mb-1">
              هشدار حساسیت‌زایی (آلرژن‌ها):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {data.safety.allergens.length > 0 ? (
                data.safety.allergens.map((alg) => (
                  <Badge key={alg} variant="warning" size="sm">
                    {foodLabelFa(alg, 'allergen')}
                  </Badge>
                ))
              ) : (
                <span className="text-loqme-neutral-500">
                  اطلاعاتی ثبت نشده؛ از فروشگاه بپرسید
                </span>
              )}
            </div>
          </div>

          {data.safety.storageInstructionsFa && (
            <div className="col-span-full">
              <span className="font-bold text-loqme-neutral-700 block mb-1">
                دستورالعمل نگهداری:
              </span>
              <p className="text-loqme-neutral-600">
                {data.safety.storageInstructionsFa}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
          <strong>تضمین اصالت سلامت لقمه:</strong> کلیه محصولات ثبت‌شده در لقمه
          دارای تاریخ مصرف معتبر، بهداشتی و مورد تایید استاندارد غذایی هستند؛
          فروش هرگونه ماده غذایی تاریخ‌گذشته در لقمه اکیداً ممنوع است
        </div>
      </Card>

      {/* Store Location Card */}
      {data.merchant.location && (
        <Card variant="outlined" className="p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
              <span>
                <RedesignIcons.MapPin size={20} aria-hidden="true" />
              </span>
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
            <p className="font-bold text-loqme-neutral-800">
              {data.merchant.businessNameFa}
            </p>
            <p>{data.merchant.location.addressFa}</p>
            {data.merchant.location.phone && (
              <p className="text-loqme-neutral-500">
                شماره تماس: {data.merchant.location.phone}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="purchase-bar">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-loqme-neutral-500">
              مبلغ نهایی پرداختی:
            </div>
            <div className="font-black text-lg text-loqme-primary-700">
              {formatToman(data.discountedPriceToman)}
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            disabled={data.canReserve === false || data.isSoldOut || data.isExpired}
            isLoading={isReserving}
            onClick={handleReserve}
            className="flex-1 max-w-xs rounded-full"
          >
            {data.canReserve === false || data.isSoldOut
              ? "ناموجود"
              : data.isExpired
                ? "زمان تحویل سپری شده"
                : "رزرو ۱۰ دقیقه‌ای بسته"}
          </Button>
        </div>
      </div>
    </div>
  );
}
