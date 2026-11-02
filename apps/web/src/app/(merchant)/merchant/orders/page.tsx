"use client";
import { RippleButton } from "@/components/magicui/ripple-button";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Camera,
  RefreshCw,
  TriangleAlert,
  CircleX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  X,
  AlertTriangle,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { QRCameraScanner } from "@/components/pickup/QRCameraScanner";
import { playSuccessChime, playErrorBuzzer } from "@/lib/utils/audio";
import {
  formatToman,
  toPersianDigits,
  toEnglishDigits,
} from "@/lib/utils/persian";
import {
  MerchantPickupQueueItemDto,
  VerifyPickupResponseDto,
  OrderStatus,
} from "@loqme/types";

export default function MerchantOrdersPage() {
  const [loadError, setLoadError] = useState("");
  const [queue, setQueue] = useState<MerchantPickupQueueItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<
    "AWAITING_CONFIRMATION" | "READY" | "COMPLETED" | "NO_SHOW" | "ALL"
  >("AWAITING_CONFIRMATION");

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Manual code input
  const [pickupCode, setPickupCode] = useState<string>("");
  const [orderNumberInput, setOrderNumberInput] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Alerts & Celebration state
  const [lastVerified, setLastVerified] =
    useState<VerifyPickupResponseDto | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictAlert, setConflictAlert] = useState<{
    orderNumber: string;
    verifiedAt: string;
    customerNameFa: string;
  } | null>(null);

  // Confirmation modal state
  const [confirmOrder, setConfirmOrder] =
    useState<MerchantPickupQueueItemDto | null>(null);
  const [prepMinutes, setPrepMinutes] = useState<number>(30);
  const [useListingDefaultWindow, setUseListingDefaultWindow] =
    useState<boolean>(true);
  const [confirmNote, setConfirmNote] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Delay modal state
  const [delayOrder, setDelayOrder] =
    useState<MerchantPickupQueueItemDto | null>(null);
  const [delayMinutes, setDelayMinutes] = useState<number>(15);
  const [delayReason, setDelayReason] = useState<string>("");
  const [isDelaying, setIsDelaying] = useState<boolean>(false);

  // Fetch live queue
  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/merchant/pickup/queue");
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success) {
        const data: MerchantPickupQueueItemDto[] = json.data || [];
        setQueue(data);

        if (typeof window !== "undefined") {
          const ready = data.filter(
            (o) => o.status === "READY_FOR_PICKUP" || o.status === "PAID"
          ).length;
          window.dispatchEvent(
            new CustomEvent("loqme:orders-count", { detail: ready })
          );
        }
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد؛ دوباره تلاش کنید");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => {
      fetchQueue(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Execute verification handshake
  const submitVerification = async (params: {
    qrToken?: string;
    otpCode?: string;
    orderNumber?: string;
  }) => {
    setIsVerifying(true);
    setErrorMessage(null);
    setConflictAlert(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch("/api/pickup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const json = await res.json();

      if (res.status === 200 && json.success) {
        playSuccessChime();
        setLastVerified(json);
        setPickupCode("");
        setOrderNumberInput("");
        fetchQueue(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("loqme:order-updated"));
        }
      } else if (res.status === 409) {
        playErrorBuzzer();
        setConflictAlert({
          orderNumber:
            json.orderNumber || params.orderNumber || "سفارش انتخابی",
          verifiedAt: json.verifiedAt,
          customerNameFa: json.customerNameFa || "مشتری لقمه",
        });
      } else {
        playErrorBuzzer();
        setErrorMessage(json.message || "خطا در تایید تحویل سفارش");
      }
    } catch {
      playErrorBuzzer();
      setErrorMessage("ارتباط با سرور برقرار نشد");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupCode.length === 4 || orderNumberInput.trim()) {
      submitVerification({
        otpCode: pickupCode ? toEnglishDigits(pickupCode).trim() : undefined,
        orderNumber: orderNumberInput
          ? toEnglishDigits(orderNumberInput).trim().toUpperCase()
          : undefined,
      });
    }
  };

  const handleQrScan = (token: string) => {
    setIsScannerOpen(false);
    submitVerification({ qrToken: token });
  };

  // Submit Restaurant Order Confirmation
  const submitOrderConfirmation = async () => {
    if (!confirmOrder) return;
    setIsConfirming(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);

    try {
      const body: any = {
        noteFa: confirmNote.trim() || undefined,
      };

      if (!useListingDefaultWindow) {
        body.estimatedPreparationMinutes = prepMinutes;
      }

      const res = await fetch(
        `/api/merchant/orders/${confirmOrder.orderId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "خطا در تایید سفارش");
      }

      playSuccessChime();
      setActionSuccessMsg(
        `سفارش #${confirmOrder.orderNumber} با موفقیت تایید شد و بازه تحویل به مشتری اطلاع‌رسانی گردید.`
      );
      setConfirmOrder(null);
      setConfirmNote("");
      fetchQueue(true);
    } catch (err: any) {
      playErrorBuzzer();
      setErrorMessage(err.message || "خطا در برقراری ارتباط با سرور");
    } finally {
      setIsConfirming(false);
    }
  };

  // Submit Delay Notice & Window Update
  const submitDelayUpdate = async () => {
    if (!delayOrder) return;
    setIsDelaying(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);

    try {
      const res = await fetch(
        `/api/merchant/orders/${delayOrder.orderId}/delay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delayMinutes,
            reasonFa: delayReason.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "خطا در ثبت تاخیر");
      }

      playSuccessChime();
      setActionSuccessMsg(
        `تاخیر سفارش #${delayOrder.orderNumber} با موفقیت ثبت شد و پیامک/نوتیفیکیشن بازه جدید به مشتری ارسال گردید.`
      );
      setDelayOrder(null);
      setDelayReason("");
      fetchQueue(true);
    } catch (err: any) {
      playErrorBuzzer();
      setErrorMessage(err.message || "خطا در ثبت تاخیر");
    } finally {
      setIsDelaying(false);
    }
  };

  // KPI Metrics
  const awaitingCount = queue.filter(
    (o) =>
      (o.status === "READY_FOR_PICKUP" || o.status === "PAID") &&
      !o.isConfirmedByMerchant
  ).length;

  const readyCount = queue.filter(
    (o) =>
      (o.status === "READY_FOR_PICKUP" || o.status === "PAID") &&
      o.isConfirmedByMerchant
  ).length;

  const completedCount = queue.filter((o) => o.status === "COMPLETED").length;
  const noShowCount = queue.filter((o) => o.status === "NO_SHOW").length;

  // Filtered queue items
  const filteredQueue = queue.filter((item) => {
    const isLive = item.status === "READY_FOR_PICKUP" || item.status === "PAID";
    if (filterTab === "AWAITING_CONFIRMATION") {
      return isLive && !item.isConfirmedByMerchant;
    }
    if (filterTab === "READY") {
      return isLive && item.isConfirmedByMerchant;
    }
    if (filterTab === "COMPLETED") {
      return item.status === "COMPLETED";
    }
    if (filterTab === "NO_SHOW") {
      return item.status === "NO_SHOW";
    }
    return true;
  });

  const getStatusBadge = (item: MerchantPickupQueueItemDto) => {
    const isLive = item.status === "READY_FOR_PICKUP" || item.status === "PAID";
    if (isLive) {
      if (!item.isConfirmedByMerchant) {
        return (
          <Badge variant="warning" size="sm" className="gap-1">
            <Clock3 size={13} />
            در انتظار تایید شما
          </Badge>
        );
      }
      return (
        <Badge variant="success" size="sm" className="gap-1">
          <CheckCircle2 size={13} />
          تایید شده و آماده تحویل
        </Badge>
      );
    }
    if (item.status === "COMPLETED") {
      return (
        <Badge variant="brand" size="sm">
          ✓ تحویل داده شد
        </Badge>
      );
    }
    if (item.status === "NO_SHOW") {
      return (
        <Badge variant="danger" size="sm">
          عدم مراجعه مشتری
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" size="sm">
        {item.status}
      </Badge>
    );
  };

  if (loadError)
    return (
      <ErrorState
        title="دریافت اطلاعات انجام نشد"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Page Header & Scanner Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-loqme-neutral-900">
              مدیریت سفارش‌ها و تحویل حضوری
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              ● زنده
            </span>
          </div>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            تایید سفارش‌های جدید خریداران، ثبت و ویرایش بازه تحویل و اسکن بارکد QR
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="primary"
            className="gap-2 shadow-sm"
            onClick={() => setIsScannerOpen(true)}
          >
            <Camera size={20} aria-hidden="true" />
            <span>اسکن بارکد QR با دوربین</span>
          </Button>
          <Button
            size="md"
            variant="outline"
            className="gap-1.5"
            onClick={() => fetchQueue()}
            title="بروزرسانی صف"
          >
            <RefreshCw size={20} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterTab("AWAITING_CONFIRMATION")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterTab === "AWAITING_CONFIRMATION"
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
              : "bg-white border-amber-200 hover:border-amber-300"
          }`}
        >
          <span className="text-xs text-amber-800 font-bold flex items-center justify-between">
            <span>در انتظار تایید</span>
            {awaitingCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {toPersianDigits(awaitingCount)}
          </div>
        </div>

        <div
          onClick={() => setFilterTab("READY")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterTab === "READY"
              ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300"
              : "bg-white border-loqme-neutral-200 hover:border-emerald-300"
          }`}
        >
          <span className="text-xs text-emerald-800 font-bold block">
            آماده تحویل حضوری
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {toPersianDigits(readyCount)}
          </div>
        </div>

        <div
          onClick={() => setFilterTab("COMPLETED")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterTab === "COMPLETED"
              ? "bg-teal-50 border-teal-400 ring-2 ring-teal-300"
              : "bg-white border-loqme-neutral-200 hover:border-teal-300"
          }`}
        >
          <span className="text-xs text-loqme-neutral-600 font-medium block">
            تحویل داده شده
          </span>
          <div className="text-2xl font-black text-loqme-primary-800 mt-1">
            {toPersianDigits(completedCount)}
          </div>
        </div>

        <div
          onClick={() => setFilterTab("NO_SHOW")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterTab === "NO_SHOW"
              ? "bg-rose-50 border-rose-400 ring-2 ring-rose-300"
              : "bg-white border-loqme-neutral-200 hover:border-rose-300"
          }`}
        >
          <span className="text-xs text-rose-800 font-medium block">
            عدم مراجعه
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {toPersianDigits(noShowCount)}
          </div>
        </div>
      </div>

      {/* Action Success Alert Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Double-Pickup Rejection Alert Banner */}
      {conflictAlert && (
        <div className="p-4 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2 animate-scale-up shadow-card">
          <div className="flex items-center gap-2 font-black text-sm text-rose-700">
            <TriangleAlert size={20} aria-hidden="true" />
            <h3>هشدار امنیتی: این سفارش قبلاً تحویل داده شده است!</h3>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            سفارش شماره{" "}
            <span className="font-bold px-1.5 py-0.5 bg-white rounded border border-rose-200">
              {conflictAlert.orderNumber}
            </span>{" "}
            متعلق به{" "}
            <span className="font-bold">{conflictAlert.customerNameFa}</span>{" "}
            قبلاً در تاریخ و ساعت زیر تایید و تحویل شده است:
          </p>
          <div className="p-2 rounded-lg bg-white/80 border border-rose-200 text-xs font-bold text-rose-900 inline-block">
            {conflictAlert.verifiedAt
              ? new Date(conflictAlert.verifiedAt).toLocaleString("fa-IR")
              : "پیش‌تر ثبت گردیده است"}
          </div>
          <p className="text-[11px] text-rose-600">
            تحویل مجدد امکان‌پذیر نیست و از تکرار تحویل بسته جلوگیری به عمل آمد
          </p>
        </div>
      )}

      {/* Success Celebration Alert Banner */}
      {lastVerified && (
        <div className="p-4 rounded-lg bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-2 animate-scale-up shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
              <span className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-sm">
                ✓
              </span>
              <h3>تحویل با موفقیت ثبت شد!</h3>
            </div>
            <RippleButton
              onClick={() => setLastVerified(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs"
            >
              بستن
            </RippleButton>
          </div>
          <div className="text-xs text-emerald-800 flex flex-wrap gap-4 pt-1 border-t border-emerald-200/60">
            <span>
              مشتری: <strong>{lastVerified.customerNameFa}</strong>
            </span>
            <span>
              کد سفارش:{" "}
              <strong className="text-emerald-900 font-bold">
                {lastVerified.orderNumber}
              </strong>
            </span>
            <span>
              بسته:{" "}
              <strong>
                {toPersianDigits(lastVerified.quantity)} ×{" "}
                {lastVerified.listingTitleFa}
              </strong>
            </span>
            <span>
              مبلغ:{" "}
              <strong>{formatToman(lastVerified.totalAmountToman)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CircleX size={20} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <RippleButton
            aria-label="بستن"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800"
          >
            ✕
          </RippleButton>
        </div>
      )}

      {/* Quick Manual Verification Form */}
      <Card
        variant="elevated"
        className="p-5 bg-white border border-loqme-neutral-200 space-y-3"
      >
        <h3 className="font-bold text-xs text-loqme-neutral-900 flex items-center gap-2">
          <span>ثبت دستی کد ۴ رقمی تحویل حضوری مشتری:</span>
        </h3>

        <form
          onSubmit={handleManualSubmit}
          className="flex flex-col sm:flex-row items-end gap-3"
        >
          <div className="w-full sm:w-48">
            <Input
              label="کد ۴ رقمی تحویل:"
              placeholder="مثال: ۸۴۹۱"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value)}
              maxLength={4}
              className="text-center font-mono text-2xl font-black tracking-widest text-loqme-primary-800"
            />
          </div>

          <div className="w-full sm:flex-1">
            <Input
              label="کد سفارش (اختیاری):"
              placeholder="مثال: LQ-10492"
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              className="font-mono text-sm uppercase"
            />
          </div>

          <Button
            type="submit"
            size="md"
            variant="primary"
            disabled={isVerifying || (!pickupCode && !orderNumberInput)}
            className="w-full sm:w-auto px-6 font-bold shadow-xs"
          >
            {isVerifying ? (
              <Spinner size="sm" variant="white" />
            ) : (
              "✓ تایید و تحویل"
            )}
          </Button>

          <Button
            type="button"
            size="md"
            variant="secondary"
            onClick={() => setIsScannerOpen(true)}
            className="w-full sm:w-auto"
          >
            دوربین
          </Button>
        </form>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-loqme-neutral-200 pb-2 text-xs overflow-x-auto">
        <RippleButton
          onClick={() => setFilterTab("AWAITING_CONFIRMATION")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === "AWAITING_CONFIRMATION"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-amber-800 hover:bg-amber-50"
          }`}
        >
          <span>در انتظار تایید سفارش</span>
          <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[11px]">
            {toPersianDigits(awaitingCount)}
          </span>
        </RippleButton>

        <RippleButton
          onClick={() => setFilterTab("READY")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            filterTab === "READY"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          <span>آماده تحویل حضوری</span>
          <span className="px-1.5 py-0.2 bg-black/10 rounded-full text-[11px]">
            {toPersianDigits(readyCount)}
          </span>
        </RippleButton>

        <RippleButton
          onClick={() => setFilterTab("COMPLETED")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
            filterTab === "COMPLETED"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          تحویل داده شده ({toPersianDigits(completedCount)})
        </RippleButton>

        <RippleButton
          onClick={() => setFilterTab("NO_SHOW")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
            filterTab === "NO_SHOW"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          عدم مراجعه ({toPersianDigits(noShowCount)})
        </RippleButton>

        <RippleButton
          onClick={() => setFilterTab("ALL")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
            filterTab === "ALL"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          همه سفارش‌ها ({toPersianDigits(queue.length)})
        </RippleButton>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Spinner size="lg" variant="primary" className="mx-auto" />
            <p className="text-xs text-loqme-neutral-500">
              در حال دریافت صف سفارشات…
            </p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <EmptyState
            title="سفارشی در این وضعیت موجود نیست"
            description="سفارش‌های جدید ثبت‌شده توسط مشتریان بلافاصله در این بخش نمایان می‌شوند"
          />
        ) : (
          filteredQueue.map((item) => {
            const isLive =
              item.status === "READY_FOR_PICKUP" || item.status === "PAID";
            const isAwaiting = isLive && !item.isConfirmedByMerchant;
            const isReadyForPickup = isLive && item.isConfirmedByMerchant;

            return (
              <Card
                key={item.orderId}
                variant="elevated"
                className={`p-4 bg-white transition-all ${
                  isAwaiting
                    ? "border-r-4 border-r-amber-500 bg-amber-50/20"
                    : isReadyForPickup
                      ? "border-r-4 border-r-emerald-600"
                      : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Item and customer info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-loqme-neutral-900">
                        {item.customerNameFa}
                      </span>
                      <bdi
                        dir="ltr"
                        className="text-[11px] text-loqme-neutral-500 font-medium inline-block"
                      >
                        ({toPersianDigits(item.customerMobileMasked)})
                      </bdi>
                      <span className="text-xs font-bold text-loqme-primary-800 bg-loqme-primary-50 px-2 py-0.5 rounded-md border border-loqme-primary-200">
                        {item.orderNumber}
                      </span>
                      <div>{getStatusBadge(item)}</div>
                    </div>

                    <p className="text-xs text-loqme-neutral-700">
                      {toPersianDigits(item.quantity)} ×{" "}
                      <strong>{item.listingTitleFa}</strong> —{" "}
                      <span className="font-bold text-loqme-primary-700">
                        {formatToman(item.totalAmountToman)}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-loqme-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-loqme-neutral-400" />
                        <span>بازه تحویل:</span>{" "}
                        <strong className="text-loqme-neutral-800">
                          {item.pickupWindowFa}
                        </strong>
                      </span>

                      {item.pickupWindowModifiedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          <AlertTriangle size={11} />
                          <span>
                            تاخیر خورده (
                            {toPersianDigits(item.pickupWindowModifiedCount)}{" "}
                            بار)
                          </span>
                          {item.delayReasonFa && (
                            <span className="text-[10px] text-amber-900 font-normal">
                              — {item.delayReasonFa}
                            </span>
                          )}
                        </span>
                      )}

                      {item.isPastPickupEnd && isLive && (
                        <span className="text-rose-600 font-bold">
                          بازه تحویل گذشته است
                        </span>
                      )}
                      {item.verifiedAt && (
                        <span className="text-emerald-700 font-medium">
                          تحویل در ساعت:{" "}
                          {new Date(item.verifiedAt).toLocaleTimeString(
                            "fa-IR"
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions / OTP code badge */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    {/* Awaiting Confirmation Actions */}
                    {isAwaiting && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setConfirmOrder(item);
                          setUseListingDefaultWindow(true);
                          setPrepMinutes(30);
                          setConfirmNote("");
                        }}
                        className="bg-amber-600 hover:bg-amber-700 border-amber-600 text-white font-bold gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 size={16} />
                        <span>تایید سفارش و ثبت بازه تحویل</span>
                      </Button>
                    )}

                    {/* Confirmed Orders Actions */}
                    {isReadyForPickup && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDelayOrder(item);
                            setDelayMinutes(15);
                            setDelayReason("");
                          }}
                          className="text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 text-xs"
                          title="اعلام تاخیر در تحویل به مشتری"
                        >
                          <Clock3 size={15} />
                          <span>اعلام تاخیر / ویرایش بازه</span>
                        </Button>

                        <RippleButton
                          onClick={() => {
                            setPickupCode(item.otpCode);
                            setOrderNumberInput(item.orderNumber);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-loqme-neutral-200 bg-loqme-neutral-50 hover:bg-loqme-neutral-100 text-xs font-bold text-loqme-neutral-700 transition-colors"
                          title="کد ۴ رقمی ثبت شده"
                        >
                          کد: {toPersianDigits(item.otpCode)}
                        </RippleButton>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            submitVerification({
                              orderNumber: item.orderNumber,
                              otpCode: item.otpCode,
                            })
                          }
                          disabled={isVerifying}
                          className="shadow-xs"
                        >
                          ✓ تایید تحویل
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-loqme-neutral-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-loqme-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <h3 className="font-black text-base text-loqme-neutral-900">
                    تایید سفارش و زمان تحویل
                  </h3>
                  <p className="text-xs text-loqme-neutral-500">
                    سفارش #{confirmOrder.orderNumber} — {confirmOrder.customerNameFa}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmOrder(null)}
                className="text-loqme-neutral-400 hover:text-loqme-neutral-700 p-1.5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-loqme-neutral-50 border border-loqme-neutral-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">بسته سفارش داده شده:</span>
                <span className="font-bold text-loqme-neutral-800">
                  {toPersianDigits(confirmOrder.quantity)} × {confirmOrder.listingTitleFa}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">مبلغ پرداخت شده:</span>
                <span className="font-bold text-loqme-primary-700">
                  {formatToman(confirmOrder.totalAmountToman)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">بازه پیش‌فرض آگهی:</span>
                <span className="font-bold text-loqme-neutral-700">
                  {confirmOrder.pickupWindowFa}
                </span>
              </div>
            </div>

            {/* Preparation time selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-loqme-neutral-800">
                تعیین زمان آماده‌سازی و بازه تحویل حضوری:
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUseListingDefaultWindow(true)}
                  className={`p-3 rounded-xl border text-right transition-all font-bold ${
                    useListingDefaultWindow
                      ? "border-loqme-primary-600 bg-loqme-primary-50 text-loqme-primary-900 ring-2 ring-loqme-primary-300"
                      : "border-loqme-neutral-200 text-loqme-neutral-700 hover:bg-loqme-neutral-50"
                  }`}
                >
                  <div>استفاده از بازه آگهی</div>
                  <div className="text-[11px] font-normal text-loqme-neutral-500 mt-1">
                    {confirmOrder.pickupWindowFa}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUseListingDefaultWindow(false)}
                  className={`p-3 rounded-xl border text-right transition-all font-bold ${
                    !useListingDefaultWindow
                      ? "border-loqme-primary-600 bg-loqme-primary-50 text-loqme-primary-900 ring-2 ring-loqme-primary-300"
                      : "border-loqme-neutral-200 text-loqme-neutral-700 hover:bg-loqme-neutral-50"
                  }`}
                >
                  <div>آماده‌سازی از همین الان</div>
                  <div className="text-[11px] font-normal text-loqme-neutral-500 mt-1">
                    محاسبه بر اساس دقیقه
                  </div>
                </button>
              </div>

              {!useListingDefaultWindow && (
                <div className="p-3 bg-loqme-neutral-50 rounded-xl space-y-2 border border-loqme-neutral-200">
                  <span className="text-[11px] font-bold text-loqme-neutral-700 block">
                    مدت زمان آماده‌سازی تا تحویل:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[15, 20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setPrepMinutes(mins)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          prepMinutes === mins
                            ? "bg-loqme-primary-600 text-white shadow-xs"
                            : "bg-white border border-loqme-neutral-200 text-loqme-neutral-700 hover:bg-loqme-neutral-100"
                        }`}
                      >
                        {toPersianDigits(mins)} دقیقه دیگر
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-loqme-neutral-600 mb-1">
                  یادداشت فروشگاه برای مشتری (اختیاری):
                </label>
                <Input
                  placeholder="مثال: بسته شما در حال بسته‌بندی است، لطفاً به صندوق مراجعه نمایید."
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-800 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                <span>
                  با کلیک روی تایید، نوتیفیکیشن درون‌برنامه‌ای، وب‌پوش و پیامک بازه تحویل به شماره مشتری ارسال خواهد شد.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-loqme-neutral-100">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setConfirmOrder(null)}
                disabled={isConfirming}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={submitOrderConfirmation}
                disabled={isConfirming}
                className="gap-2 bg-amber-600 hover:bg-amber-700 font-bold"
              >
                {isConfirming ? (
                  <Spinner size="sm" variant="white" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>تایید سفارش و ارسال نوتیفیکیشن</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delay Modal */}
      {delayOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-loqme-neutral-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-loqme-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Clock3 size={22} />
                </span>
                <div>
                  <h3 className="font-black text-base text-loqme-neutral-900">
                    اعلام تاخیر و تمدید بازه تحویل
                  </h3>
                  <p className="text-xs text-loqme-neutral-500">
                    سفارش #{delayOrder.orderNumber} — {delayOrder.customerNameFa}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDelayOrder(null)}
                className="text-loqme-neutral-400 hover:text-loqme-neutral-700 p-1.5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-loqme-neutral-50 border border-loqme-neutral-100 text-xs">
              <span className="text-loqme-neutral-500">بازه تحویل فعلی: </span>
              <strong className="text-loqme-neutral-800">
                {delayOrder.pickupWindowFa}
              </strong>
            </div>

            {/* Delay presets */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-loqme-neutral-800">
                میزان افزایش زمان تحویل (تمدید بازه):
              </label>

              <div className="flex flex-wrap gap-2">
                {[15, 20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDelayMinutes(mins)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      delayMinutes === mins
                        ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
                        : "bg-white border border-loqme-neutral-200 text-loqme-neutral-700 hover:bg-loqme-neutral-100"
                    }`}
                  >
                    +{toPersianDigits(mins)} دقیقه
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-loqme-neutral-800 mb-1.5">
                  علت تاخیر (جهت نمایش و ارسال پیامک به خریدار):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    "ترافیک بالای سفارشات در ساعات اوج",
                    "آماده‌سازی پخت و بسته‌بندی تازه",
                    "تاخیر در تامین مواد اولیه",
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setDelayReason(reason)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                        delayReason === reason
                          ? "bg-amber-100 border-amber-300 text-amber-900 font-bold"
                          : "bg-loqme-neutral-50 border-loqme-neutral-200 text-loqme-neutral-600 hover:bg-loqme-neutral-100"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="علت تاخیر را بنویسید یا از گزینه‌های بالا انتخاب کنید"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-amber-700 shrink-0" />
                <span>
                  به‌محض ثبت تاخیر، بازه تحویل به‌روز شده و پیامک و نوتیفیکیشن با ذکر علت برای خریدار ارسال خواهد شد.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-loqme-neutral-100">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDelayOrder(null)}
                disabled={isDelaying}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={submitDelayUpdate}
                disabled={isDelaying}
                className="gap-2 bg-amber-600 hover:bg-amber-700 font-bold"
              >
                {isDelaying ? (
                  <Spinner size="sm" variant="white" />
                ) : (
                  <>
                    <Clock3 size={18} />
                    <span>ثبت تاخیر و اطلاع‌رسانی به خریدار</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HTML5 Camera Scanner Modal */}
      <QRCameraScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrScan}
        onFallbackToManual={() => {
          setIsScannerOpen(false);
          const el = document.querySelector(
            'input[placeholder="مثال: ۸۴۹۱"]'
          ) as HTMLInputElement;
          if (el) el.focus();
        }}
      />
    </div>
  );
}
