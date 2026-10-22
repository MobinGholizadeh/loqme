"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { ErrorState } from "@/components/ui/ErrorState";
import { useFeedback } from "@/components/ui/useFeedback";
import { DialogSurface } from "@/components/ui/DialogSurface";
import * as RedesignIcons from "lucide-react";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";

interface ComplaintItem {
  id: string;
  orderId: string;
  customerId: string;
  merchantId: string;
  category: string;
  descriptionFa: string;
  evidencePhotos: string[];
  status: string;
  adminNotesFa?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  customer: {
    id: string;
    fullName?: string | null;
    user: {
      mobile: string;
    };
  };
  merchant: {
    id: string;
    businessNameFa: string;
  };
  order: {
    id: string;
    orderNumber: string;
    totalAmountToman: number;
    status: string;
    payments?: Array<{
      status: string;
    }>;
  };
  refund?: {
    id: string;
    amountToman: number;
    status: string;
  } | null;
  resolvedByUser?: {
    id: string;
    mobile: string;
  } | null;
}

const CATEGORY_MAP: Record<string, { label: string; isSafety: boolean }> = {
  EXPIRED_FOOD: { label: "تاریخ انقضا گذشته", isSafety: true },
  SPOILED_FOOD: { label: "فساد یا بوی نامطبوع", isSafety: true },
  MISMATCHED_DESCRIPTION: { label: "عدم تطابق با مشخصات", isSafety: false },
  POOR_HYGIENE: { label: "عدم رعایت بهداشت", isSafety: false },
  STORE_CLOSED: { label: "فروشگاه بسته بود", isSafety: false },
  MISSING_ITEMS: { label: "کسری اقلام", isSafety: false },
  OTHER: { label: "سایر موارد", isSafety: false },
};

export default function AdminModerationPage() {
  const [loadError, setLoadError] = useState("");
  const { showFeedback, feedbackDialog } = useFeedback();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Resolution Modal State
  const [resolvingComplaint, setResolvingComplaint] =
    useState<ComplaintItem | null>(null);
  const [actionType, setActionType] = useState<"REFUND" | "REJECT" | "WARNING">(
    "REFUND",
  );
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Listing Safety Override Modal State
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetyListingId, setSafetyListingId] = useState("");
  const [newSafetyStatus, setNewSafetyStatus] = useState("RESTRICTED");
  const [safetyReason, setSafetyReason] = useState("");
  const [safetyLoading, setSafetyLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const url = statusFilter
        ? `/api/admin/complaints?status=${statusFilter}`
        : "/api/admin/complaints";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "دریافت اطلاعات ممکن نشد");
      if (data.success) {
        setComplaints(data.items || []);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد؛ دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/admin/complaints/${resolvingComplaint.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionType,
            notesFa: resolutionNotes.trim() || undefined,
            refundAmountToman:
              actionType === "REFUND"
                ? Number(resolvingComplaint.order.totalAmountToman)
                : undefined,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "خطا در تعیین تکلیف شکایت");
      }

      setResolvingComplaint(null);
      setResolutionNotes("");
      fetchComplaints();
    } catch (err: any) {
      setActionError(err.message || "خطا در برقراری ارتباط با سرور");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSafetyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyListingId) return;

    setSafetyLoading(true);
    try {
      const res = await fetch(`/api/admin/listings/${safetyListingId}/safety`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safetyStatus: newSafetyStatus,
          reasonFa: safetyReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "خطا در تغییر وضعیت سلامت");
      }

      setSafetyModalOpen(false);
      setSafetyListingId("");
      setSafetyReason("");
      showFeedback(
        "وضعیت سلامت بسته با موفقیت تغییر کرد و در لاگ امنیتی ثبت شد",
      );
    } catch (err: any) {
      showFeedback(err.message || "خطا در تغییر وضعیت");
    } finally {
      setSafetyLoading(false);
    }
  };

  const criticalPendingCount = complaints.filter(
    (c) =>
      (c.category === "EXPIRED_FOOD" || c.category === "SPOILED_FOOD") &&
      c.status === "PENDING",
  ).length;

  if (loadError)
    return (
      <ErrorState
        title="دریافت اطلاعات انجام نشد"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {feedbackDialog}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-loqme-neutral-900 flex items-center gap-2">
            <span>
              <RedesignIcons.ShieldCheck size={20} aria-hidden="true" />
            </span>
            مرکز رسیدگی به شکایات و ایمنی غذا
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            نظارت بر بهداشت و کیفیت اقلام، بازرسی مدارک عکاسی و استرداد آنی وجه
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setSafetyModalOpen(true)}
          className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 self-start"
        >
          <RedesignIcons.ShieldCheck size={18} /> تغییر وضعیت سلامت بسته
        </Button>
      </div>

      {/* Critical Food Safety Alert Banner */}
      {criticalPendingCount > 0 && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              <RedesignIcons.TriangleAlert size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-rose-800">
                هشدار سلامت غذا: {toPersianDigits(criticalPendingCount)} گزارش
                تاریخ‌گذشته یا فاسد در انتظار اقدام فوری!
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                طبق آیین‌نامه ایمنی لقمه، گزارش‌های فساد غذا باید ظرف حداکثر ۲
                ساعت تعیین تکلیف گردند
              </p>
            </div>
          </div>
          <Badge variant="danger" size="md">
            اولویت بحرانی
          </Badge>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-loqme-neutral-200 text-xs">
        <RippleButton
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === ""
              ? "bg-loqme-primary-600 text-white font-bold"
              : "text-loqme-neutral-500 hover:text-loqme-primary-700"
          }`}
        >
          همه گزارش‌ها ({toPersianDigits(complaints.length)})
        </RippleButton>
        <RippleButton
          onClick={() => setStatusFilter("PENDING")}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === "PENDING"
              ? "bg-amber-600 text-loqme-neutral-900 font-bold"
              : "text-loqme-neutral-500 hover:text-loqme-primary-700"
          }`}
        >
          در انتظار بررسی
        </RippleButton>
        <RippleButton
          onClick={() => setStatusFilter("RESOLVED_REFUNDED")}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === "RESOLVED_REFUNDED"
              ? "bg-emerald-600 text-white font-bold"
              : "text-loqme-neutral-500 hover:text-loqme-primary-700"
          }`}
        >
          استرداد وجه شده
        </RippleButton>
        <RippleButton
          onClick={() => setStatusFilter("RESOLVED_REJECTED")}
          className={`px-3 py-1.5 rounded-lg transition ${
            statusFilter === "RESOLVED_REJECTED"
              ? "bg-loqme-neutral-100 text-loqme-neutral-900 font-bold"
              : "text-loqme-neutral-500 hover:text-loqme-primary-700"
          }`}
        >
          رد شده
        </RippleButton>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center rounded-lg bg-white border border-loqme-neutral-200 space-y-2">
          <RedesignIcons.Inbox size={28} className="mx-auto" />
          <h3 className="font-bold text-sm text-loqme-neutral-900">
            شکایتی با این فیلتر یافت نشد
          </h3>
          <p className="text-xs text-loqme-neutral-500">
            گزارشی مطابق فیلتر انتخاب‌شده وجود ندارد
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((item) => {
            const catInfo = CATEGORY_MAP[item.category] || {
              label: item.category,
              isSafety: false,
            };
            const isPending =
              item.status === "PENDING" || item.status === "INVESTIGATING";

            return (
              <div
                key={item.id}
                className={`p-5 rounded-lg border transition ${
                  catInfo.isSafety
                    ? "bg-white border-rose-800/60 shadow-lg shadow-rose-950/20"
                    : "bg-white border-loqme-neutral-200"
                }`}
              >
                {/* Top Row: Category + Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-loqme-neutral-200">
                  <div className="flex items-center gap-2">
                    {catInfo.isSafety ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                        <span>
                          <RedesignIcons.TriangleAlert
                            size={20}
                            aria-hidden="true"
                          />
                        </span>
                        <span>{catInfo.label} (ایمنی بحرانی)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-loqme-neutral-100 text-loqme-neutral-700">
                        {catInfo.label}
                      </span>
                    )}

                    <span className="text-xs text-loqme-neutral-500 font-mono">
                      سفارش: {item.order.orderNumber}
                    </span>
                  </div>

                  <div>
                    {item.status === "PENDING" && (
                      <Badge variant="warning" size="sm">
                        ⏳ در انتظار بررسی
                      </Badge>
                    )}
                    {item.status === "RESOLVED_REFUNDED" && (
                      <Badge variant="success" size="sm">
                        ✓ استرداد وجه کامل انجام شد
                      </Badge>
                    )}
                    {item.status === "RESOLVED_REJECTED" && (
                      <Badge variant="neutral" size="sm">
                        ✕ رد شکایت
                      </Badge>
                    )}
                    {item.status === "RESOLVED_WARNING" && (
                      <Badge variant="warning" size="sm">
                        صدور اخطار به فروشگاه
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 text-xs border-b border-loqme-neutral-200">
                  <div>
                    <span className="text-loqme-neutral-500 block">
                      فروشگاه:
                    </span>
                    <span className="text-loqme-neutral-900 font-bold">
                      {item.merchant.businessNameFa}
                    </span>
                  </div>
                  <div>
                    <span className="text-loqme-neutral-500 block">
                      شاکی / مشتری:
                    </span>
                    <span className="text-loqme-neutral-900 font-mono">
                      {item.customer.fullName || "مشتری لقمه"} (
                      {item.customer.user.mobile})
                    </span>
                  </div>
                  <div>
                    <span className="text-loqme-neutral-500 block">
                      مبلغ سفارش:
                    </span>
                    <span className="text-loqme-primary-700 font-black">
                      {formatToman(item.order.totalAmountToman)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="py-3 text-xs space-y-1">
                  <span className="text-loqme-neutral-500 font-semibold block">
                    شرح گزارش مشتری:
                  </span>
                  <p className="text-loqme-neutral-700 leading-relaxed bg-white p-3 rounded-lg border border-loqme-neutral-200">
                    {item.descriptionFa}
                  </p>
                </div>

                {/* Evidence Photos */}
                {item.evidencePhotos && item.evidencePhotos.length > 0 && (
                  <div className="py-2 space-y-1.5">
                    <span className="text-xs text-loqme-neutral-500 block font-semibold">
                      مدارک و تصاویر ارسالی:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.evidencePhotos.map((photoUrl, pIdx) => (
                        <RippleButton
                          key={pIdx}
                          type="button"
                          onClick={() => setSelectedPhoto(photoUrl)}
                          className="w-16 h-16 rounded-lg overflow-hidden border border-loqme-neutral-200 hover:border-loqme-primary-400 transition"
                        >
                          <Image
                            width={64}
                            height={64}
                            unoptimized
                            src={photoUrl}
                            alt={`مدرک ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </RippleButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes / Actions */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                  {item.adminNotesFa && (
                    <div className="text-xs text-loqme-neutral-500">
                      یادداشت مدیر:{" "}
                      <span className="text-loqme-neutral-900">
                        {item.adminNotesFa}
                      </span>
                    </div>
                  )}

                  {isPending ? (
                    <div className="flex flex-wrap items-center gap-2 mr-auto">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setResolvingComplaint(item);
                          setActionType("REFUND");
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-xs"
                      >
                        <RedesignIcons.CreditCard size={18} /> استرداد وجه (
                        {formatToman(item.order.totalAmountToman)})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResolvingComplaint(item);
                          setActionType("WARNING");
                        }}
                        className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs"
                      >
                        <RedesignIcons.TriangleAlert size={18} /> ثبت اخطار
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setResolvingComplaint(item);
                          setActionType("REJECT");
                        }}
                        className="text-xs"
                      >
                        <RedesignIcons.X size={18} /> رد شکایت
                      </Button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-loqme-neutral-500 mr-auto">
                      تعیین تکلیف شده توسط مدیر{" "}
                      {item.resolvedByUser?.mobile || ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Confirmation Modal */}
      {resolvingComplaint && (
        <DialogSurface onClose={() => setResolvingComplaint(null)}>
          <div className="w-full max-w-md bg-white border border-loqme-neutral-200 rounded-lg p-6 space-y-4 text-loqme-neutral-900">
            <h3 className="font-bold text-base flex items-center gap-2">
              <RedesignIcons.Scale size={20} />
              تعیین تکلیف شکایت سفارش {resolvingComplaint.order.orderNumber}
            </h3>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs">
                {actionError}
              </div>
            )}

            <div className="text-xs text-loqme-neutral-700 space-y-2 bg-white p-3 rounded-lg">
              <div>
                نوع اقدام:{" "}
                <span className="font-bold text-loqme-neutral-900">
                  {actionType === "REFUND"
                    ? "استرداد کامل وجه و کسر از مطالبات فروشگاه"
                    : actionType === "WARNING"
                      ? "ثبت اخطار در پرونده فروشگاه"
                      : "رد شکایت مشتری"}
                </span>
              </div>
              {actionType === "REFUND" && (
                <div>
                  مبلغ برگشتی به مشتری:{" "}
                  <span className="font-black text-loqme-primary-700">
                    {formatToman(resolvingComplaint.order.totalAmountToman)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="moderation-field-1"
                className="block text-xs text-loqme-neutral-700 mb-1.5"
              >
                توضیحات و یادداشت بازرسی مدیر:
              </label>
              <textarea
                id="moderation-field-1"
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="علت تایید یا رد درخواست…"
                className="w-full p-2.5 text-xs bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 outline-none focus:border-loqme-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-loqme-neutral-200">
              <Button
                size="sm"
                variant="ghost"
                disabled={actionLoading}
                onClick={() => setResolvingComplaint(null)}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                variant={actionType === "REFUND" ? "primary" : "destructive"}
                disabled={actionLoading}
                onClick={handleResolve}
              >
                {actionLoading ? "در حال ثبت…" : "تایید نهایی اقدام"}
              </Button>
            </div>
          </div>
        </DialogSurface>
      )}

      {/* Safety Override Modal */}
      {safetyModalOpen && (
        <DialogSurface onClose={() => setSafetyModalOpen(false)}>
          <div className="w-full max-w-md bg-white border border-loqme-neutral-200 rounded-lg p-6 space-y-4 text-loqme-neutral-900">
            <h3 className="font-bold text-base flex items-center gap-2">
              <span>
                <RedesignIcons.TriangleAlert size={20} aria-hidden="true" />
              </span>
              تغییر وضعیت سلامت و ایمنی بسته (Safety Override)
            </h3>

            <form onSubmit={handleSafetyOverride} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="moderation-field-2"
                  className="block text-loqme-neutral-700 mb-1"
                >
                  شناسه بسته (Listing ID):
                </label>
                <input
                  id="moderation-field-2"
                  type="text"
                  required
                  value={safetyListingId}
                  onChange={(e) => setSafetyListingId(e.target.value)}
                  placeholder="UUID بسته مورد نظر…"
                  className="w-full p-2 bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="moderation-field-3"
                  className="block text-loqme-neutral-700 mb-1"
                >
                  وضعیت سلامت جدید:
                </label>
                <select
                  id="moderation-field-3"
                  value={newSafetyStatus}
                  onChange={(e) => setNewSafetyStatus(e.target.value)}
                  className="w-full p-2 bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 outline-none"
                >
                  <option value="RESTRICTED">مسدود موقت (RESTRICTED)</option>
                  <option value="UNSAFE">غیر ایمن و توقیف (UNSAFE)</option>
                  <option value="APPROVED">تایید شده (APPROVED)</option>
                  <option value="EXPIRED">منقضی شده (EXPIRED)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="moderation-field-4"
                  className="block text-loqme-neutral-700 mb-1"
                >
                  دلیل بازرسی / مستندات:
                </label>
                <textarea
                  id="moderation-field-4"
                  rows={2}
                  value={safetyReason}
                  onChange={(e) => setSafetyReason(e.target.value)}
                  placeholder="گزارش بازرس بهداشت یا شکایت‌های مکرر…"
                  className="w-full p-2 bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-loqme-neutral-200">
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setSafetyModalOpen(false)}
                >
                  انصراف
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  variant="primary"
                  disabled={safetyLoading}
                >
                  {safetyLoading ? "در حال اعمال…" : "اعمال و ثبت لاگ بازرسی"}
                </Button>
              </div>
            </form>
          </div>
        </DialogSurface>
      )}

      {/* Photo Preview Lightbox */}
      {selectedPhoto && (
        <DialogSurface onClose={() => setSelectedPhoto(null)}>
          <div className="relative max-w-2xl max-h-[85vh] p-2 bg-white rounded-lg border border-loqme-neutral-200">
            <Image
              width={640}
              height={480}
              unoptimized
              src={selectedPhoto}
              alt="مدرک تمام صفحه"
              className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
            />
            <RippleButton
              className="icon-button absolute top-3 left-3 bg-white"
              aria-label="بستن تصویر"
              onClick={() => setSelectedPhoto(null)}
            >
              <RedesignIcons.X size={20} />
            </RippleButton>
          </div>
        </DialogSurface>
      )}
    </div>
  );
}
