"use client";
import { ErrorState } from "@/components/ui/ErrorState";
import { DialogSurface } from "@/components/ui/DialogSurface";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/persian";
import { AdminMerchantItemDto } from "@loqme/types";

export default function AdminMerchantsPage() {
  const [loadError, setLoadError] = useState("");
  const [merchants, setMerchants] = useState<AdminMerchantItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMerchant, setSelectedMerchant] =
    useState<AdminMerchantItemDto | null>(null);

  // Modal mutation state
  const [modalCommission, setModalCommission] = useState<number>(10);
  const [modalReason, setModalReason] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchMerchants = useCallback(async () => {
    setLoadError("");
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (searchQuery.trim()) query.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/merchants?${query.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        setMerchants(json.data);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const handleOpenModal = (m: AdminMerchantItemDto) => {
    setSelectedMerchant(m);
    setModalCommission(m.commissionPercent);
    setModalReason("");
  };

  const handleUpdateStatus = async (
    newStatus: "APPROVED" | "SUSPENDED" | "REJECTED",
  ) => {
    if (!selectedMerchant) return;
    setIsUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/merchants/${selectedMerchant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: newStatus,
          commissionPercent: modalCommission,
          reasonFa: modalReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: `وضعیت فروشگاه با موفقیت به ${newStatus} تغییر یافت.`,
        });
        setSelectedMerchant(null);
        fetchMerchants();
      } else {
        setMessage({
          type: "error",
          text: json.message || "خطا در ویرایش وضعیت فروشگاه",
        });
      }
    } catch {
      setMessage({ type: "error", text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (
    status: AdminMerchantItemDto["verificationStatus"],
  ) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge variant="success" size="sm">
            ✓ تایید شده (APPROVED)
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="brand" size="sm">
            در انتظار بررسی (PENDING)
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="danger" size="sm">
            معلق / متوقف (SUSPENDED)
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="neutral" size="sm">
            رد شده (REJECTED)
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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-loqme-neutral-900">
            تایید فروشگاه‌ها و نظارت بر جوازها
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            بررسی پروانه کسب، تایید صلاحیت، تعلیق و تنظیم درصد کارمزد اختصاصی
            فروشندگان
          </p>
        </div>

        <Button
          size="md"
          variant="outline"
          className="text-loqme-neutral-900 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
          onClick={() => {
            setIsLoading(true);
            fetchMerchants();
          }}
        >
          🔄 بروزرسانی لیست
        </Button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs font-bold flex items-center justify-between animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-700"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-700"
          }`}
        >
          <span>
            {message.type === "success" ? "✓ " : "❌ "} {message.text}
          </span>
          <button aria-label="بستن" onClick={() => setMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-loqme-neutral-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === st
                  ? "bg-loqme-primary-600 text-white shadow-xs"
                  : "text-loqme-neutral-500 hover:bg-loqme-neutral-100 hover:text-loqme-primary-700"
              }`}
            >
              {st === "ALL"
                ? "همه"
                : st === "PENDING"
                  ? "در انتظار تایید"
                  : st === "APPROVED"
                    ? "تایید شده"
                    : st === "SUSPENDED"
                      ? "معلق شده"
                      : "رد شده"}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="جستجو بر اساس نام، جواز یا موبایل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 placeholder-loqme-neutral-500 focus:outline-none focus:border-loqme-primary-500"
          />
        </div>
      </div>

      {/* Merchants Table */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال دریافت اطلاعات فروشگاه‌ها...
          </p>
        </div>
      ) : merchants.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="فروشگاهی در این وضعیت یافت نشد"
          description="با تغییر فیلترها یا عبارت جستجو، فروشگاه‌های دیگر را بررسی فرمایید."
        />
      ) : (
        <div className="rounded-lg bg-white border border-loqme-neutral-200 overflow-hidden shadow-card">
          <table className="w-full text-right text-xs">
            <thead className="bg-white text-loqme-neutral-500 border-b border-loqme-neutral-200">
              <tr>
                <th className="p-4">نام فروشگاه</th>
                <th className="p-4">صنف و شهر</th>
                <th className="p-4">مالک / شماره تماس</th>
                <th className="p-4">پروانه کسب</th>
                <th className="p-4">کارمزد</th>
                <th className="p-4">وضعیت احراز</th>
                <th className="p-4 text-left">اقدام بازرسی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-loqme-neutral-700/60 text-loqme-neutral-700">
              {merchants.map((m) => (
                <tr key={m.id} className="hover:bg-loqme-neutral-100">
                  <td className="p-4">
                    <span className="font-bold text-loqme-neutral-900 text-sm block">
                      {m.businessNameFa}
                    </span>
                    <span className="text-[11px] text-loqme-neutral-500">
                      امتیاز: ⭐ {toPersianDigits(m.ratingAverage.toFixed(1))} (
                      {toPersianDigits(m.ratingCount)} نظر)
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="font-medium text-loqme-neutral-900">
                      {m.businessType}
                    </span>
                    <span className="text-[11px] text-loqme-neutral-500 block">
                      {m.cityNameFa || "ارومیه"}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="text-loqme-neutral-900 block">
                      {m.ownerFullName || "مالک فروشگاه"}
                    </span>
                    <span className="font-mono text-loqme-primary-700 dir-ltr text-right block">
                      {toPersianDigits(m.ownerMobile)}
                    </span>
                  </td>

                  <td className="p-4 font-mono text-loqme-neutral-700">
                    {m.licenseNumber
                      ? toPersianDigits(m.licenseNumber)
                      : "ثبت نشده"}
                  </td>

                  <td className="p-4 font-bold text-loqme-neutral-900">
                    {toPersianDigits(m.commissionPercent)}٪
                  </td>

                  <td className="p-4">
                    {getStatusBadge(m.verificationStatus)}
                  </td>

                  <td className="p-4 text-left">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenModal(m)}
                      className="text-xs text-loqme-neutral-900 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
                    >
                      بررسی و تغییر وضعیت
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection & Status Override Modal */}
      {selectedMerchant && (
        <DialogSurface onClose={() => setSelectedMerchant(null)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 border border-loqme-neutral-200 space-y-4 text-loqme-neutral-900">
            <div className="flex items-center justify-between pb-3 border-b border-loqme-neutral-200">
              <h3 className="font-black text-base text-loqme-neutral-900">
                بازرسی و تعیین وضعیت: {selectedMerchant.businessNameFa}
              </h3>
              <button
                aria-label="بستن"
                onClick={() => setSelectedMerchant(null)}
                className="text-loqme-neutral-500 hover:text-loqme-primary-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Merchant Details Preview */}
            <div className="p-3.5 rounded-lg bg-white border border-loqme-neutral-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">مالک:</span>
                <span className="font-bold">
                  {selectedMerchant.ownerFullName || "مالک"} (
                  {selectedMerchant.ownerMobile})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">آدرس:</span>
                <span className="text-left font-medium">
                  {selectedMerchant.addressFa || "ارومیه"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">شماره جواز کسب:</span>
                <span className="font-mono text-loqme-primary-700 font-bold">
                  {selectedMerchant.licenseNumber || "نامشخص"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-loqme-neutral-500">وضعیت فعلی:</span>
                <span>
                  {getStatusBadge(selectedMerchant.verificationStatus)}
                </span>
              </div>
            </div>

            {/* Commission Adjustment */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-loqme-neutral-700">
                درصد کارمزد پلتفرم برای این فروشگاه:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={modalCommission}
                  onChange={(e) =>
                    setModalCommission(
                      parseFloat(toEnglishDigits(e.target.value)) || 0,
                    )
                  }
                  className="w-28 px-3 py-2 text-center font-mono font-bold text-base bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900"
                />
                <span className="text-xs text-loqme-neutral-500">
                  درصد (پیش‌فرض مصوب پلتفرم: ۱۰.۰٪)
                </span>
              </div>
            </div>

            {/* Reason input for audit trail */}
            <div className="space-y-1">
              <label
                htmlFor="merchants-field-1"
                className="block text-xs font-bold text-loqme-neutral-700"
              >
                علت تصمیم یا توضیحات بازرسی (ثبت در لاگ حسابرسی):
              </label>
              <textarea
                id="merchants-field-1"
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="مثال: پروانه کسب در اتحادیه صنفی تایید شد / به دلیل ۲ گزارش خرابی غذا معلق شد."
                className="w-full px-3 py-2 text-xs bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 placeholder-loqme-neutral-500 h-20"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-loqme-neutral-200 flex items-center justify-between gap-2 flex-wrap">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMerchant(null)}
                disabled={isUpdating}
                className="text-loqme-neutral-500"
              >
                انصراف
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleUpdateStatus("SUSPENDED")}
                  disabled={isUpdating}
                >
                  ⛔ تعلیق فوری
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus("REJECTED")}
                  disabled={isUpdating}
                  className="text-rose-700 border-rose-500/40"
                >
                  ✕ رد مدارک
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleUpdateStatus("APPROVED")}
                  disabled={isUpdating}
                  className="font-bold shadow-xs"
                >
                  {isUpdating ? (
                    <Spinner size="sm" variant="white" />
                  ) : (
                    "✓ تایید و فعال‌سازی"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogSurface>
      )}
    </div>
  );
}
