"use client";
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

interface ReservationData {
  id: string;
  listingId: string;
  quantity: number;
  status: string;
  expiresAt: string;
  remainingSeconds: number;
  isExpired: boolean;
  listing: {
    id: string;
    titleFa: string;
    storeNameFa: string;
    addressFa?: string;
    originalPriceToman: number;
    discountedPriceToman: number;
    totalPriceToman: number;
    savingsToman: number;
    pickupWindowFa: string;
    pickupEndIso: string;
  };
}

export default function CheckoutPage() {
  const { showFeedback, feedbackDialog } = useFeedback();
  const params = useParams();
  const router = useRouter();
  const reservationId = params?.reservationId as string;

  const [data, setData] = useState<ReservationData | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [selectedGateway, setSelectedGateway] = useState<"MOCK" | "ZARINPAL">(
    "MOCK",
  );
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [notesFa, setNotesFa] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch reservation data
  useEffect(() => {
    if (!reservationId) return;

    async function fetchReservation() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/reservations/${reservationId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setRemainingSeconds(json.data.remainingSeconds);
        } else {
          setErrorMsg(json.message || "رزرو یافت نشد یا منقضی شده است");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("ارتباط با سرور برقرار نشد");
      } finally {
        setIsLoading(false);
      }
    }

    fetchReservation();
  }, [reservationId]);

  // 2. Countdown Timer tick every second
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  // Format seconds to mm:ss in Persian
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const mStr = m.toString().padStart(2, "0");
    const sStr = s.toString().padStart(2, "0");
    return `${toPersianDigits(mStr)}:${toPersianDigits(sStr)}`;
  };

  // 3. Handle checkout submission
  const handlePay = async () => {
    if (!termsAccepted) {
      showFeedback(
        "لطفاً پیش از پرداخت، تایید تعهد تحویل حضوری را علامت بزنید.",
      );
      return;
    }

    if (remainingSeconds <= 0) {
      showFeedback(
        "مهلت ۱۰ دقیقه‌ای این رزرو منقضی شده است. لطفاً بسته را مجدداً رزرو نمایید.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          gateway: selectedGateway,
          termsAccepted: true,
          notesFa: notesFa.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (json.success && json.data?.paymentUrl) {
        // Redirect browser to payment gateway URL (Mock or Zarinpal)
        window.location.href = json.data.paymentUrl;
      } else {
        showFeedback(json.message || "خطا در هدایت به درگاه پرداخت");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showFeedback("خطا در برقراری ارتباط با درگاه پرداخت");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-6">
        <Skeleton height={20} width={100} />
        <Skeleton height={70} width="100%" />
        <div className="bg-white rounded-lg border border-loqme-neutral-200 p-6 space-y-4 shadow-card">
          <Skeleton height={22} width={140} />
          <Skeleton height={50} width="100%" />
          <Skeleton height={80} width="100%" />
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState
          title="مهلت رزرو به پایان رسیده است"
          message={
            errorMsg ||
            "مهلت ۱۰ دقیقه‌ای برای ثبت سفارش منقضی شده و موجودی این بسته جهت حفظ عدالت در دسترس سایر خریداران قرار گرفته است."
          }
          secondaryAction={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/explore")}
            >
              بازگشت به کاوش بسته‌ها
            </Button>
          }
        />
      </div>
    );
  }

  const isUrgent = remainingSeconds < 120 && remainingSeconds > 0;
  const isExpired = data.isExpired || remainingSeconds <= 0;

  return (
    <div className="checkout-layout">
      {feedbackDialog}
      <h1 className="text-2xl font-extrabold checkout-title">تکمیل سفارش</h1>
      {/* Header & Back */}
      <div className="checkout-title flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs text-loqme-neutral-500 hover:text-loqme-primary-700 font-bold transition-colors flex items-center gap-1"
        >
          <span>←</span>
          <span>انصراف و بازگشت</span>
        </button>
        <Badge variant="brand" size="sm">
          {isExpired ? "رزرو منقضی شده" : "رزرو فعال"}
        </Badge>
      </div>

      {/* 10-Minute Live Countdown Timer Banner */}
      <div
        className={`checkout-title p-4 rounded-lg border transition-all flex items-center justify-between shadow-xs ${
          isExpired
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : isUrgent
              ? "bg-amber-50 border-amber-300 text-amber-900 animate-pulse"
              : "bg-loqme-primary-50 border-loqme-primary-200 text-loqme-primary-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isExpired ? "⌛" : "⏳"}</span>
          <div>
            <div className="text-xs font-bold">
              {isExpired
                ? "مهلت رزرو به پایان رسید"
                : isUrgent
                  ? "فرصت پایانی برای نهایی‌سازی پرداخت!"
                  : "زمان باقیمانده برای تکمیل پرداخت آنلاین:"}
            </div>
            <div className="text-[11px] text-loqme-neutral-500 mt-0.5">
              {isExpired
                ? "موجودی این بسته آزاد شد."
                : "در این مدت این بسته برای شخص دیگری رزرو نخواهد شد."}
            </div>
          </div>
        </div>

        <div className="font-mono font-black text-xl tracking-wider px-3 py-1.5 rounded-lg bg-white shadow-xs border border-loqme-neutral-200">
          {formatCountdown(remainingSeconds)}
        </div>
      </div>

      {/* Order Item Summary Card */}
      <Card variant="elevated" className="checkout-summary p-5 space-y-4">
        <h2 className="font-bold text-base text-loqme-neutral-900 border-b border-loqme-neutral-100 pb-3">
          خلاصه فاکتور سفارش
        </h2>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-loqme-neutral-900">
              {data.listing.titleFa}
            </h3>
            <p className="text-xs text-loqme-neutral-600 font-medium">
              {data.listing.storeNameFa}
            </p>
            {data.listing.addressFa && (
              <p className="text-[11px] text-loqme-neutral-500 line-clamp-1">
                📍 {data.listing.addressFa}
              </p>
            )}
            <div className="text-xs text-loqme-primary-700 font-semibold pt-1">
              ⏰ تحویل حضوری: {data.listing.pickupWindowFa}
            </div>
          </div>

          <div className="text-left whitespace-nowrap">
            <Badge variant="neutral" size="sm">
              تعداد: {toPersianDigits(data.quantity)} بسته
            </Badge>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-2 pt-3 border-t border-loqme-neutral-100 text-xs">
          <div className="flex items-center justify-between text-loqme-neutral-500">
            <span>ارزش واقعی منو (قیمت اصلی):</span>
            <span className="line-through">
              {formatToman(data.listing.originalPriceToman * data.quantity)}
            </span>
          </div>

          <div className="flex items-center justify-between text-loqme-primary-700 font-bold">
            <span>سود و صرفه‌جویی اقتصادی شما:</span>
            <span>{formatToman(data.listing.savingsToman)} -</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-dashed border-loqme-neutral-200 text-sm font-black text-loqme-neutral-900">
            <span>مبلغ قابل پرداخت:</span>
            <span className="text-base text-loqme-primary-800">
              {formatToman(data.listing.totalPriceToman)}
            </span>
          </div>
        </div>
      </Card>

      {/* Gateway Selection Card */}
      <Card variant="outlined" className="p-5 space-y-3 bg-white">
        <h3 className="font-bold text-xs text-loqme-neutral-900">
          انتخاب درگاه پرداخت شاپرک:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label
            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
              selectedGateway === "MOCK"
                ? "bg-loqme-primary-50/70 border-loqme-primary-600 shadow-xs"
                : "bg-white border-loqme-neutral-200 hover:bg-loqme-neutral-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="gateway"
                checked={selectedGateway === "MOCK"}
                onChange={() => setSelectedGateway("MOCK")}
                className="text-loqme-primary-600 focus:ring-loqme-primary-500"
              />
              <span className="font-bold text-loqme-neutral-800">
                شبیه‌ساز شاپرک (تست فوری)
              </span>
            </div>
            <span className="text-base">
              <RedesignIcons.CreditCard size={20} aria-hidden="true" />
            </span>
          </label>

          <label
            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
              selectedGateway === "ZARINPAL"
                ? "bg-loqme-primary-50/70 border-loqme-primary-600 shadow-xs"
                : "bg-white border-loqme-neutral-200 hover:bg-loqme-neutral-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="gateway"
                checked={selectedGateway === "ZARINPAL"}
                onChange={() => setSelectedGateway("ZARINPAL")}
                className="text-loqme-primary-600 focus:ring-loqme-primary-500"
              />
              <span className="font-bold text-loqme-neutral-800">
                درگاه پرداخت زرین‌پال
              </span>
            </div>
            <span className="text-base">🟡</span>
          </label>
        </div>
      </Card>

      {/* Notes to Store */}
      <Card variant="outlined" className="p-4 space-y-2 bg-white">
        <label
          htmlFor="checkout-notes"
          className="block text-xs font-bold text-loqme-neutral-800"
        >
          یادداشت برای فروشگاه (اختیاری):
        </label>
        <input
          type="text"
          id="checkout-notes"
          value={notesFa}
          onChange={(e) => setNotesFa(e.target.value)}
          placeholder="مثال: ترجیحاً نان تیره‌تر یا بدون کنجد در صورت امکان"
          maxLength={200}
          className="w-full text-xs p-2.5 rounded-lg border border-loqme-neutral-200 outline-none focus:border-loqme-primary-500 bg-loqme-neutral-50"
        />
      </Card>

      {/* Terms Acceptance */}
      <div className="p-3.5 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-200">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-loqme-neutral-300 text-loqme-primary-600 focus:ring-loqme-primary-500"
          />
          <span className="text-xs text-loqme-neutral-700 leading-relaxed">
            متعهد می‌شوم در بازه زمانی تعیین‌شده ({data.listing.pickupWindowFa})
            جهت دریافت حضوری به فروشگاه مراجعه نمایم و از شرایط نگهداری مواد
            فاسدشدنی مطلع هستم.
          </span>
        </label>
      </div>

      {/* Bottom Sticky Payment Bar */}
      <div className="purchase-bar">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-loqme-neutral-500">
              مبلغ قابل پرداخت:
            </div>
            <div className="font-black text-lg text-loqme-primary-800">
              {formatToman(data.listing.totalPriceToman)}
            </div>
          </div>

          <Button
            size="lg"
            variant="primary"
            disabled={!termsAccepted || isExpired || isSubmitting}
            isLoading={isSubmitting}
            onClick={handlePay}
            className="flex-1 max-w-xs"
          >
            {isExpired ? "مهلت منقضی شد" : "پرداخت آنلاین و نهایی‌سازی"}
          </Button>
        </div>
      </div>
    </div>
  );
}
