"use client";
import { ErrorState } from "@/components/ui/ErrorState";
import * as RedesignIcons from "lucide-react";

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
    "ALL" | "READY" | "COMPLETED" | "NO_SHOW"
  >("READY");

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Manual code input
  const [pickupCode, setPickupCode] = useState<string>("");
  const [orderNumberInput, setOrderNumberInput] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Alerts & Celebration state
  const [lastVerified, setLastVerified] =
    useState<VerifyPickupResponseDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictAlert, setConflictAlert] = useState<{
    orderNumber: string;
    verifiedAt: string;
    customerNameFa: string;
  } | null>(null);

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
        setQueue(json.data || []);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // Poll every 10 seconds for real-time order updates
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

    try {
      const res = await fetch("/api/pickup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const json = await res.json();

      if (res.status === 200 && json.success) {
        // Success celebration!
        playSuccessChime();
        setLastVerified(json);
        setPickupCode("");
        setOrderNumberInput("");
        fetchQueue(true);
      } else if (res.status === 409) {
        // DOUBLE-PICKUP CONFLICT DETECTED!
        playErrorBuzzer();
        setConflictAlert({
          orderNumber:
            json.orderNumber || params.orderNumber || "سفارش انتخابی",
          verifiedAt: json.verifiedAt,
          customerNameFa: json.customerNameFa || "مشتری لقمه",
        });
      } else {
        // Validation or other error
        playErrorBuzzer();
        setErrorMessage(json.message || "خطا در تایید سفارش");
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

  // KPI Metrics
  const readyCount = queue.filter(
    (o) => o.status === "READY_FOR_PICKUP" || o.status === "PAID",
  ).length;
  const completedCount = queue.filter((o) => o.status === "COMPLETED").length;
  const noShowCount = queue.filter((o) => o.status === "NO_SHOW").length;

  // Filtered queue items
  const filteredQueue = queue.filter((item) => {
    if (filterTab === "READY") {
      return item.status === "READY_FOR_PICKUP" || item.status === "PAID";
    }
    if (filterTab === "COMPLETED") {
      return item.status === "COMPLETED";
    }
    if (filterTab === "NO_SHOW") {
      return item.status === "NO_SHOW";
    }
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "READY_FOR_PICKUP":
      case "PAID":
        return (
          <Badge variant="success" size="sm">
            ✓ آماده تحویل حضوری
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="brand" size="sm">
            ✓ تحویل داده شد
          </Badge>
        );
      case "NO_SHOW":
        return (
          <Badge variant="danger" size="sm">
            عدم مراجعه مشتری
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
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
              صف تحویل حضوری و اسکن QR
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              ● زنده
            </span>
          </div>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            اسکن سریع بارکد مشتری با دوربین یا ثبت کد ۴ رقمی اختصاصی جهت تکمیل
            سفارش
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="primary"
            className="gap-2 shadow-sm"
            onClick={() => setIsScannerOpen(true)}
          >
            <span>
              <RedesignIcons.Camera size={20} aria-hidden="true" />
            </span>
            <span>اسکن بارکد QR با دوربین</span>
          </Button>
          <Button
            size="md"
            variant="outline"
            className="gap-1.5"
            onClick={() => fetchQueue()}
            title="بروزرسانی صف"
          >
            <span>
              <RedesignIcons.RefreshCw size={20} aria-hidden="true" />
            </span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div
          onClick={() => setFilterTab("READY")}
          className={`cursor-pointer p-4 rounded-lg border transition-all ${
            filterTab === "READY"
              ? "bg-loqme-primary-50 border-loqme-primary-300 ring-2 ring-loqme-primary-400/20"
              : "bg-white border-loqme-neutral-200 hover:border-loqme-neutral-300"
          }`}
        >
          <span className="text-xs text-loqme-neutral-500 font-medium block">
            آماده تحویل
          </span>
          <div className="text-2xl font-black text-loqme-primary-800 mt-1">
            {toPersianDigits(readyCount)}
          </div>
        </div>

        <div
          onClick={() => setFilterTab("COMPLETED")}
          className={`cursor-pointer p-4 rounded-lg border transition-all ${
            filterTab === "COMPLETED"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20"
              : "bg-white border-loqme-neutral-200 hover:border-loqme-neutral-300"
          }`}
        >
          <span className="text-xs text-loqme-neutral-500 font-medium block">
            تحویل شده امروز
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {toPersianDigits(completedCount)}
          </div>
        </div>

        <div
          onClick={() => setFilterTab("NO_SHOW")}
          className={`cursor-pointer p-4 rounded-lg border transition-all ${
            filterTab === "NO_SHOW"
              ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/20"
              : "bg-white border-loqme-neutral-200 hover:border-loqme-neutral-300"
          }`}
        >
          <span className="text-xs text-loqme-neutral-500 font-medium block">
            عدم مراجعه
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {toPersianDigits(noShowCount)}
          </div>
        </div>
      </div>

      {/* Double-Pickup Rejection Alert Banner */}
      {conflictAlert && (
        <div className="p-4 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2 animate-scale-up shadow-card">
          <div className="flex items-center gap-2 font-black text-sm text-rose-700">
            <span className="text-xl">
              <RedesignIcons.TriangleAlert size={20} aria-hidden="true" />
            </span>
            <h3>هشدار امنیتی: این سفارش قبلاً تحویل داده شده است!</h3>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            سفارش شماره{" "}
            <span className="font-mono font-bold px-1.5 py-0.5 bg-white rounded border border-rose-200">
              {conflictAlert.orderNumber}
            </span>{" "}
            متعلق به{" "}
            <span className="font-bold">{conflictAlert.customerNameFa}</span>{" "}
            قبلاً در تاریخ و ساعت زیر تایید و تحویل شده است:
          </p>
          <div className="p-2 rounded-lg bg-white/80 border border-rose-200 text-xs font-mono font-bold text-rose-900 inline-block">
            {conflictAlert.verifiedAt
              ? new Date(conflictAlert.verifiedAt).toLocaleString("fa-IR")
              : "پیش‌تر ثبت گردیده است"}
          </div>
          <p className="text-[11px] text-rose-600">
            تحویل مجدد امکان‌پذیر نیست و از تکرار تحویل بسته جلوگیری به عمل آمد.
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
              <h3>تحویل با موفقیت ثبت شد! نوش جان خریدار.</h3>
            </div>
            <button
              onClick={() => setLastVerified(null)}
              className="text-emerald-600 hover:text-emerald-900 text-xs"
            >
              بستن
            </button>
          </div>
          <div className="text-xs text-emerald-800 flex flex-wrap gap-4 pt-1 border-t border-emerald-200/60">
            <span>
              مشتری: <strong>{lastVerified.customerNameFa}</strong>
            </span>
            <span>
              کد سفارش:{" "}
              <strong className="font-mono text-emerald-900">
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
            <span>
              <RedesignIcons.CircleX size={20} aria-hidden="true" />
            </span>
            <span>{errorMessage}</span>
          </div>
          <button
            aria-label="بستن"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Manual Verification Form */}
      <Card
        variant="elevated"
        className="p-5 bg-white border border-loqme-neutral-200 space-y-3"
      >
        <h3 className="font-bold text-xs text-loqme-neutral-900 flex items-center gap-2">
          <span>🔢</span>
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
            📷 دوربین
          </Button>
        </form>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-loqme-neutral-200 pb-2 text-xs">
        <button
          onClick={() => setFilterTab("READY")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "READY"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          در انتظار تحویل ({toPersianDigits(readyCount)})
        </button>
        <button
          onClick={() => setFilterTab("COMPLETED")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "COMPLETED"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          تحویل داده شده ({toPersianDigits(completedCount)})
        </button>
        <button
          onClick={() => setFilterTab("NO_SHOW")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "NO_SHOW"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          عدم مراجعه ({toPersianDigits(noShowCount)})
        </button>
        <button
          onClick={() => setFilterTab("ALL")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "ALL"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          همه سفارش‌ها ({toPersianDigits(queue.length)})
        </button>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Spinner size="lg" variant="primary" className="mx-auto" />
            <p className="text-xs text-loqme-neutral-500">
              در حال دریافت صف سفارشات...
            </p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title="سفارشی در این وضعیت موجود نیست"
            description="سفارش‌های جدید ثبت‌شده توسط مشتریان بلافاصله در این بخش نمایان می‌شوند."
          />
        ) : (
          filteredQueue.map((item) => {
            const isReady =
              item.status === "READY_FOR_PICKUP" || item.status === "PAID";
            return (
              <Card
                key={item.orderId}
                variant="elevated"
                className={`p-4 bg-white transition-all ${
                  isReady ? "border-r-4 border-r-loqme-primary-600" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Item and customer info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-loqme-neutral-900">
                        {item.customerNameFa}
                      </span>
                      <span className="text-[11px] text-loqme-neutral-500 font-mono">
                        ({item.customerMobileMasked})
                      </span>
                      <span className="font-mono text-xs font-bold text-loqme-primary-800 bg-loqme-primary-50 px-2 py-0.5 rounded-md border border-loqme-primary-200">
                        {item.orderNumber}
                      </span>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>

                    <p className="text-xs text-loqme-neutral-700">
                      {toPersianDigits(item.quantity)} ×{" "}
                      <strong>{item.listingTitleFa}</strong> —{" "}
                      <span className="font-bold text-loqme-primary-700">
                        {formatToman(item.totalAmountToman)}
                      </span>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-loqme-neutral-500">
                      <span>
                        ⏰ بازه تحویل: <strong>{item.pickupWindowFa}</strong>
                      </span>
                      {item.isPastPickupEnd && isReady && (
                        <span className="text-rose-600 font-bold">
                          ⚠️ بازه تحویل گذشته است
                        </span>
                      )}
                      {item.verifiedAt && (
                        <span className="text-emerald-700 font-medium">
                          تحویل در ساعت:{" "}
                          {new Date(item.verifiedAt).toLocaleTimeString(
                            "fa-IR",
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions / OTP code badge */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isReady && (
                      <>
                        <button
                          onClick={() => {
                            setPickupCode(item.otpCode);
                            setOrderNumberInput(item.orderNumber);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-loqme-neutral-200 bg-loqme-neutral-50 hover:bg-loqme-neutral-100 text-xs font-mono font-bold text-loqme-neutral-700 transition-colors"
                          title="کد ۴ رقمی ثبت شده"
                        >
                          کد: {toPersianDigits(item.otpCode)}
                        </button>

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

      {/* HTML5 Camera Scanner Modal */}
      <QRCameraScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQrScan}
        onFallbackToManual={() => {
          setIsScannerOpen(false);
          // Focus input
          const el = document.querySelector(
            'input[placeholder="مثال: ۸۴۹۱"]',
          ) as HTMLInputElement;
          if (el) el.focus();
        }}
      />
    </div>
  );
}
