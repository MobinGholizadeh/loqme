"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { ErrorState } from "@/components/ui/ErrorState";
import { DialogSurface } from "@/components/ui/DialogSurface";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import {
  getListingStatusLabel,
  getSafetyStatusLabel,
} from "@/lib/utils/persian-labels";
import {
  RotateCw,
  Eye,
  Tag,
  Store,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react";
import { AdminListingItemDto, AdminCategoryDto } from "@loqme/types";

export default function AdminListingsPage() {
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState<"LISTINGS" | "CATEGORIES">(
    "LISTINGS",
  );

  // Listings State
  const [listings, setListings] = useState<AdminListingItemDto[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedListing, setSelectedListing] =
    useState<AdminListingItemDto | null>(null);
  const [isUpdatingSafety, setIsUpdatingSafety] = useState<boolean>(false);
  const [safetyReason, setSafetyReason] = useState<string>("");
  const [safetyModalMessage, setSafetyModalMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpdateSafetyStatus = async (newStatus: string) => {
    if (!selectedListing) return;
    setIsUpdatingSafety(true);
    setSafetyModalMessage(null);
    try {
      const res = await fetch(`/api/admin/listings/${selectedListing.id}/safety`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safetyStatus: newStatus,
          reasonFa: safetyReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "خطا در تغییر وضعیت سلامت بسته");
      }
      setSelectedListing((prev) => (prev ? { ...prev, safetyStatus: newStatus } : null));
      setListings((prev) =>
        prev.map((item) =>
          item.id === selectedListing.id ? { ...item, safetyStatus: newStatus } : item
        )
      );
      setSafetyModalMessage({
        type: "success",
        text: `وضعیت ایمنی با موفقیت به «${getSafetyStatusLabel(newStatus).labelFa}» به‌روزرسانی شد`,
      });
    } catch (err: any) {
      setSafetyModalMessage({
        type: "error",
        text: err.message || "خطا در به‌روزرسانی وضعیت ایمنی",
      });
    } finally {
      setIsUpdatingSafety(false);
    }
  };

  // Categories State
  const [categories, setCategories] = useState<AdminCategoryDto[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] =
    useState<boolean>(false);
  const [newCatSlug, setNewCatSlug] = useState<string>("");
  const [newCatNameFa, setNewCatNameFa] = useState<string>("");
  const [newCatIcon, setNewCatIcon] = useState<string>("🏷️");
  const [isSubmittingCat, setIsSubmittingCat] = useState<boolean>(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch Listings
  const fetchListings = useCallback(async () => {
    setLoadError("");
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      if (searchQuery.trim()) query.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/listings?${query.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        setListings(json.data);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد؛ دوباره تلاش کنید");
    } finally {
      setIsLoadingListings(false);
    }
  }, [statusFilter, searchQuery]);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success && json.data) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin categories:", err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    fetchCategories();
  }, [fetchListings, fetchCategories]);

  // Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCat(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newCatSlug.trim().toLowerCase(),
          nameFa: newCatNameFa.trim(),
          iconUrl: newCatIcon.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: "دسته‌بندی جدید با موفقیت اضافه شد",
        });
        setNewCatSlug("");
        setNewCatNameFa("");
        setIsNewCategoryModalOpen(false);
        fetchCategories();
      } else {
        setMessage({
          type: "error",
          text: json.message || "خطا در ایجاد دسته‌بندی",
        });
      }
    } catch {
      setMessage({ type: "error", text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setIsSubmittingCat(false);
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
            نظارت بر بسته‌ها و دسته‌بندی‌ها
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            پایش کلیه بسته‌های ارائه‌شده در پلتفرم و مدیریت درخت دسته‌بندی
            محصولات
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "CATEGORIES" && (
            <Button
              size="md"
              variant="primary"
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="gap-2 font-bold shadow-xs"
            >
              <span>+</span>
              <span>افزودن دسته‌بندی جدید</span>
            </Button>
          )}

          <Button
            size="md"
            variant="outline"
            className="text-loqme-neutral-900 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
            onClick={() => {
              if (activeTab === "LISTINGS") fetchListings();
              else fetchCategories();
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <RotateCw size={15} />
              بروزرسانی
            </span>
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs font-bold flex items-center justify-between animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-700"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-700"
          }`}
        >
          <span>{message.text}</span>
          <RippleButton aria-label="بستن" onClick={() => setMessage(null)}>
            ✕
          </RippleButton>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-loqme-neutral-200 pb-2">
        <RippleButton
          onClick={() => setActiveTab("LISTINGS")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "LISTINGS"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-500 hover:text-loqme-primary-700 hover:bg-loqme-neutral-100"
          }`}
        >
          بسته‌های مازاد پلتفرم ({toPersianDigits(listings.length)})
        </RippleButton>

        <RippleButton
          onClick={() => setActiveTab("CATEGORIES")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "CATEGORIES"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-500 hover:text-loqme-primary-700 hover:bg-loqme-neutral-100"
          }`}
        >
          مدیریت دسته‌بندی‌ها ({toPersianDigits(categories.length)})
        </RippleButton>
      </div>

      {/* TAB 1: Global Listings Moderation */}
      {activeTab === "LISTINGS" && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-loqme-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {["ALL", "PUBLISHED", "PAUSED", "SOLD_OUT", "EXPIRED"].map(
                (st) => (
                  <RippleButton
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
                      : st === "PUBLISHED"
                        ? "فعال در بازار"
                        : st === "PAUSED"
                          ? "متوقف شده"
                          : st === "SOLD_OUT"
                            ? "تکمیل ظرفیت"
                            : "منقضی شده"}
                  </RippleButton>
                ),
              )}
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="جستجو در عنوان بسته یا فروشگاه…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 placeholder-loqme-neutral-500 focus:outline-none focus:border-loqme-primary-500"
              />
            </div>
          </div>

          {isLoadingListings ? (
            <div className="py-20 text-center space-y-2">
              <Spinner size="lg" variant="primary" className="mx-auto" />
              <p className="text-xs text-loqme-neutral-500">
                در حال دریافت بسته‌ها…
              </p>
            </div>
          ) : listings.length === 0 ? (
            <EmptyState
              icon="📦"
              title="بسته‌ای یافت نشد"
              description="در حال حاضر بسته‌ای با فیلترهای انتخابی در سیستم وجود ندارد"
            />
          ) : (
            <div className="rounded-lg bg-white border border-loqme-neutral-200 overflow-hidden shadow-card">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs responsive-data-table">
                  <thead className="bg-loqme-neutral-50 text-loqme-neutral-600 border-b border-loqme-neutral-200">
                    <tr>
                      <th className="p-4">عنوان بسته</th>
                      <th className="p-4">فروشگاه عرضه کننده</th>
                      <th className="p-4">دسته‌بندی</th>
                      <th className="p-4">قیمت فروش</th>
                      <th className="p-4">تعداد</th>
                      <th className="p-4">وضعیت بازار</th>
                      <th className="p-4">وضعیت ایمنی</th>
                      <th className="p-4 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-loqme-neutral-200 text-loqme-neutral-700">
                    {listings.map((l) => {
                      const st = getListingStatusLabel(l.status);
                      const sf = getSafetyStatusLabel(l.safetyStatus);
                      return (
                        <tr
                          key={l.id}
                          className="hover:bg-loqme-primary-50/30 transition-colors"
                        >
                          <td className="p-4 font-bold text-loqme-neutral-900 text-sm">
                            {l.titleFa}
                          </td>
                          <td className="p-4 text-loqme-primary-700 font-medium">
                            {l.merchantNameFa}
                          </td>
                          <td className="p-4 text-loqme-neutral-500">
                            {l.categoryNameFa || "عمومی"}
                          </td>
                          <td className="p-4 font-bold text-emerald-700">
                            {formatToman(l.discountedPriceToman)}
                            <del className="block text-[10px] text-loqme-neutral-500 font-normal">
                              {formatToman(l.originalPriceToman)}
                            </del>
                          </td>
                          <td className="p-4 font-bold text-loqme-neutral-900">
                            {toPersianDigits(l.quantity)} عدد
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.className}`}
                            >
                              {st.labelFa}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge variant={sf.badgeVariant} size="sm">
                              {sf.labelFa}
                            </Badge>
                          </td>
                          <td className="p-4 text-left">
                            <RippleButton
                              type="button"
                              onClick={() => setSelectedListing(l)}
                              className="px-2.5 py-1 text-xs font-bold text-loqme-primary-700 bg-loqme-primary-50 hover:bg-loqme-primary-100 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <Eye size={13} />
                              جزئیات
                            </RippleButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden divide-y divide-loqme-neutral-200">
                {listings.map((l) => {
                  const st = getListingStatusLabel(l.status);
                  const sf = getSafetyStatusLabel(l.safetyStatus);
                  return (
                    <div key={l.id} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-loqme-neutral-900">
                            {l.titleFa}
                          </h4>
                          <span className="text-xs text-loqme-primary-700 font-medium block mt-0.5">
                            {l.merchantNameFa}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${st.className}`}
                        >
                          {st.labelFa}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-loqme-neutral-100">
                        <span className="text-loqme-neutral-500">
                          دسته‌بندی: {l.categoryNameFa || "عمومی"}
                        </span>
                        <div className="text-left font-bold text-emerald-700">
                          {formatToman(l.discountedPriceToman)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={sf.badgeVariant} size="sm">
                          {sf.labelFa}
                        </Badge>
                        <span className="text-xs font-medium text-loqme-neutral-600">
                          {toPersianDigits(l.quantity)} عدد موجود
                        </span>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-center text-xs"
                        onClick={() => setSelectedListing(l)}
                        leftIcon={<Eye size={14} />}
                      >
                        مشاهده جزئیات کامل
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Categories Management */}
      {activeTab === "CATEGORIES" && (
        <div className="space-y-4">
          {isLoadingCategories ? (
            <div className="py-20 text-center space-y-2">
              <Spinner size="lg" variant="primary" className="mx-auto" />
              <p className="text-xs text-loqme-neutral-500">
                در حال دریافت دسته‌بندی‌ها…
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-lg bg-white border border-loqme-neutral-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{cat.iconUrl || "🏷️"}</span>
                    <div>
                      <h4 className="font-bold text-sm text-loqme-neutral-900">
                        {cat.nameFa}
                      </h4>
                      <span className="text-[11px] font-mono text-loqme-neutral-500 block mt-0.5">
                        {cat.slug}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-loqme-primary-700">
                      {toPersianDigits(cat.listingsCount)} بسته
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listing Detail & Moderation Modal */}
      <Modal
        isOpen={!!selectedListing}
        onClose={() => {
          setSelectedListing(null);
          setSafetyReason("");
          setSafetyModalMessage(null);
        }}
        title={selectedListing ? `جزئیات بسته: ${selectedListing.titleFa}` : "جزئیات بسته"}
      >
        {selectedListing && (
          <div className="space-y-4 text-xs">
            {safetyModalMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
                  safetyModalMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                <span>{safetyModalMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setSafetyModalMessage(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Header Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedListing.titleFa}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#1D616A] font-bold">
                      فروشگاه: {selectedListing.merchantNameFa}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">
                      دسته‌بندی: {selectedListing.categoryNameFa || "عمومی"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getListingStatusLabel(selectedListing.status).className}`}
                  >
                    {getListingStatusLabel(selectedListing.status).labelFa}
                  </span>
                  <Badge
                    variant={getSafetyStatusLabel(selectedListing.safetyStatus).badgeVariant}
                    size="sm"
                  >
                    {getSafetyStatusLabel(selectedListing.safetyStatus).labelFa}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Financial and Inventory Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-500 block mb-1">
                  قیمت فروش با تخفیف:
                </span>
                <strong className="text-sm font-black text-emerald-700 block">
                  {formatToman(selectedListing.discountedPriceToman)}
                </strong>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-500 block mb-1">
                  قیمت اصلی قبل تخفیف:
                </span>
                <span className="text-xs font-medium text-slate-500 line-through block">
                  {formatToman(selectedListing.originalPriceToman)}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-500 block mb-1">
                  درصد تخفیف اعمالی:
                </span>
                <strong className="text-xs font-black text-rose-600 block">
                  {toPersianDigits(
                    Math.max(
                      0,
                      Math.round(
                        ((selectedListing.originalPriceToman -
                          selectedListing.discountedPriceToman) /
                          Math.max(1, selectedListing.originalPriceToman)) *
                          100
                      )
                    )
                  )}
                  ٪ تخفیف
                </strong>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[11px] text-slate-500 block mb-1">
                  موجودی در انبار:
                </span>
                <strong className="text-xs font-bold text-slate-900 block">
                  {toPersianDigits(selectedListing.quantity)} عدد موجود
                </strong>
              </div>
            </div>

            {/* Schedule & Metadata */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">بازه تحویل حضوری مشتری:</span>
                <span className="font-bold text-slate-900">
                  {selectedListing.pickupStart && selectedListing.pickupEnd
                    ? `${toPersianDigits(new Date(selectedListing.pickupStart).toLocaleString("fa-IR"))} الی ${toPersianDigits(new Date(selectedListing.pickupEnd).toLocaleString("fa-IR"))}`
                    : "تنظیم نشده"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">تاریخ ثبت بسته:</span>
                <span className="font-medium text-slate-800">
                  {toPersianDigits(
                    new Date(selectedListing.createdAt).toLocaleString("fa-IR")
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">شناسه سیستمی بسته (UUID):</span>
                <span className="text-[11px] text-slate-600 select-all" dir="ltr">
                  {selectedListing.id}
                </span>
              </div>
            </div>

            {/* Admin Moderation / Safety Override Section */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-700" />
                  <span>مدیریت بازرسی سلامت و ایمنی غذا</span>
                </h4>
                <Badge
                  variant={getSafetyStatusLabel(selectedListing.safetyStatus).badgeVariant}
                  size="sm"
                >
                  وضعیت فعلی: {getSafetyStatusLabel(selectedListing.safetyStatus).labelFa}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  تغییر وضعیت ایمنی بسته:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "APPROVED", label: "تایید ایمنی و سلامت", variant: "bg-emerald-600 hover:bg-emerald-700 text-white" },
                    { key: "PENDING_REVIEW", label: "در انتظار بازرسی مجدد", variant: "bg-amber-600 hover:bg-amber-700 text-white" },
                    { key: "RESTRICTED", label: "محدودسازی بسته", variant: "bg-orange-600 hover:bg-orange-700 text-white" },
                    { key: "UNSAFE", label: "غیراستاندارد / توقیف", variant: "bg-rose-600 hover:bg-rose-700 text-white" },
                  ].map((btn) => (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={isUpdatingSafety || selectedListing.safetyStatus === btn.key}
                      onClick={() => handleUpdateSafetyStatus(btn.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs disabled:opacity-50 ${btn.variant}`}
                    >
                      {selectedListing.safetyStatus === btn.key ? `✓ ${btn.label}` : btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  توضیحات بازرسی و علت تصمیم (در صورت لزوم):
                </label>
                <input
                  type="text"
                  value={safetyReason}
                  onChange={(e) => setSafetyReason(e.target.value)}
                  placeholder="علت رد یا تایید بسته جهت ثبت در لاگ حسابرسی…"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#1D616A]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedListing(null);
                  setSafetyReason("");
                  setSafetyModalMessage(null);
                }}
              >
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Category Modal */}
      {isNewCategoryModalOpen && (
        <DialogSurface onClose={() => setIsNewCategoryModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-loqme-neutral-200 space-y-4 text-loqme-neutral-900">
            <div className="flex items-center justify-between pb-3 border-b border-loqme-neutral-200">
              <h3 className="font-black text-base text-loqme-neutral-900">
                تعریف دسته‌بندی محصول جدید
              </h3>
              <RippleButton
                aria-label="بستن"
                onClick={() => setIsNewCategoryModalOpen(false)}
                className="text-loqme-neutral-500 hover:text-loqme-primary-700"
              >
                ✕
              </RippleButton>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <Input
                  label="نام فارسی دسته‌بندی"
                  placeholder="مثال: بستنی و آبمیوه"
                  value={newCatNameFa}
                  onChange={(e) => setNewCatNameFa(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="شناسه انگلیسی (slug یکتا)"
                  placeholder="مثال: ice-cream-juice"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <Input
                  label="آیکون یا ایموجی نمایشی"
                  placeholder="مثال: 🍦"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-loqme-neutral-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  disabled={isSubmittingCat}
                  className="text-loqme-neutral-500"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingCat || !newCatNameFa || !newCatSlug}
                >
                  {isSubmittingCat ? (
                    <Spinner size="sm" variant="white" />
                  ) : (
                    "ایجاد دسته‌بندی"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogSurface>
      )}
    </div>
  );
}
