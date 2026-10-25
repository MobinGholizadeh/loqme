"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import type { DiscountDto, DiscountStatsDto, DiscountRedemptionDto } from "@loqme/types";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  History,
  Percent,
  Coins,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

interface MerchantListingSimple {
  id: string;
  titleFa: string;
}

export default function MerchantDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountDto[]>([]);
  const [stats, setStats] = useState<DiscountStatsDto | null>(null);
  const [listings, setListings] = useState<MerchantListingSimple[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("" );

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState<string>("");
  const [formTitleFa, setFormTitleFa] = useState<string>("");
  const [formDiscountType, setFormDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [formDiscountPercent, setFormDiscountPercent] = useState<number>(15);
  const [formDiscountAmountToman, setFormDiscountAmountToman] = useState<number>(20000);
  const [formMaxDiscountToman, setFormMaxDiscountToman] = useState<string>("");
  const [formMinOrderToman, setFormMinOrderToman] = useState<string>("0");
  const [formListingId, setFormListingId] = useState<string>("");
  const [formMaxUses, setFormMaxUses] = useState<string>("");
  const [formMaxUsesPerCustomer, setFormMaxUsesPerCustomer] = useState<string>("1");
  const [formExpiresAt, setFormExpiresAt] = useState<string>("");

  // Redemptions Modal State
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<DiscountRedemptionDto[]>([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState<boolean>(false);

  const fetchDiscounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/merchant/discounts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDiscounts(json.data || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/listings");
      const json = await res.json();
      if (json.success && json.data) {
        setListings(
          json.data.map((l: any) => ({
            id: l.id,
            titleFa: l.titleFa,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
    fetchListings();
  }, [fetchDiscounts, fetchListings]);

  const handleToggleActive = async (discount: DiscountDto) => {
    try {
      const res = await fetch(`/api/merchant/discounts/${discount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !discount.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        fetchDiscounts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!confirm("آیا از حذف یا غیرفعال‌سازی این تخفیف اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/merchant/discounts/${discountId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchDiscounts();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: any = {
        code: formCode.trim().toUpperCase(),
        titleFa: formTitleFa.trim(),
        discountType: formDiscountType,
        discountPercent: formDiscountType === "PERCENTAGE" ? Number(formDiscountPercent) : undefined,
        discountAmountToman: formDiscountType === "FIXED_AMOUNT" ? Number(formDiscountAmountToman) : undefined,
        maxDiscountAmountToman: formMaxDiscountToman ? Number(formMaxDiscountToman) : undefined,
        minOrderAmountToman: formMinOrderToman ? Number(formMinOrderToman) : 0,
        scope: formListingId ? "LISTING" : "MERCHANT",
        listingId: formListingId || undefined,
        maxUses: formMaxUses ? Number(formMaxUses) : undefined,
        maxUsesPerCustomer: formMaxUsesPerCustomer ? Number(formMaxUsesPerCustomer) : 1,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
      };

      const res = await fetch("/api/merchant/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        fetchDiscounts();
      } else {
        setFormError(json.message || "خطا در ایجاد تخفیف");
      }
    } catch (err: any) {
      setFormError("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRedemptions = async (discountId: string) => {
    setSelectedDiscountId(discountId);
    setIsLoadingRedemptions(true);
    try {
      const res = await fetch(`/api/merchant/discounts/${discountId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRedemptions(json.data.redemptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRedemptions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Tag className="text-[#1D616A]" size={24} />
            <span>تخفیف‌ها و کدهای تبلیغاتی فروشگاه</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعریف کدهای تخفیف اختصاصی برای جذب مشتریان محلی و فروش سریع‌تر بسته‌های مازاد
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 text-xs font-bold bg-[#1D616A] hover:bg-[#154b52]"
        >
          <Plus size={16} />
          <span>کد تخفیف جدید</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="outlined" className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">کل تخفیف‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#1D616A] flex items-center justify-center">
              <Tag size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {stats ? toPersianDigits(stats.totalDiscounts) : "—"}
          </div>
        </Card>

        <Card variant="outlined" className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">تخفیف‌های فعال</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-700">
            {stats ? toPersianDigits(stats.activeDiscounts) : "—"}
          </div>
        </Card>

        <Card variant="outlined" className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">دفعات خرید با تخفیف</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {stats ? toPersianDigits(stats.totalRedemptions) : "—"}
          </div>
        </Card>

        <Card variant="outlined" className="p-4 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">مجموع ارزش تخفیف‌ها</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins size={18} />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-slate-900">
            {stats ? formatToman(stats.totalDiscountAmountToman) : "—"}
          </div>
        </Card>
      </div>

      {/* Search & Refresh */}
      <Card variant="outlined" className="p-4 bg-white border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس عنوان یا کد تخفیف"
              className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-[#1D616A]"
            />
          </div>

          <Button size="sm" variant="outline" onClick={fetchDiscounts} className="px-3">
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
      </Card>

      {/* Discounts Table */}
      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : discounts.length === 0 ? (
        <EmptyState
          title="کد تخفیفی تعریف نشده است"
          description="با تعریف کد تخفیف جدید، مشتریان محلی بیشتری را برای خرید بسته‌های مازاد خود تشویق کنید"
          action={
            <Button size="sm" variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              ایجاد اولین کد تخفیف
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4">کد و عنوان</th>
                  <th className="py-3 px-4">میزان تخفیف</th>
                  <th className="py-3 px-4">بسته هدف</th>
                  <th className="py-3 px-4">حداقل سفارش</th>
                  <th className="py-3 px-4">دفعات مصرف</th>
                  <th className="py-3 px-4">وضعیت</th>
                  <th className="py-3 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{discount.titleFa}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-[#1D616A] bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                          {discount.code}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {discount.discountType === "PERCENTAGE" ? (
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Percent size={13} className="text-emerald-600" />
                          <span>{toPersianDigits(discount.discountPercent || 0)}٪ تخفیف</span>
                          {discount.maxDiscountAmountToman && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (سقف {formatToman(discount.maxDiscountAmountToman)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="font-bold text-slate-800">
                          {formatToman(discount.discountAmountToman || 0)}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-700 flex items-center gap-1">
                        <ShoppingBag size={13} className="text-slate-400" />
                        <span>{discount.scope === "LISTING" ? discount.listingTitleFa || "بسته انتخابی" : "تمام بسته‌های فروشگاه"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {discount.minOrderAmountToman && discount.minOrderAmountToman > 0
                        ? formatToman(discount.minOrderAmountToman)
                        : "بدون حداقل"}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {toPersianDigits(discount.currentUses)}
                        {discount.maxUses ? ` / ${toPersianDigits(discount.maxUses)}` : " بار"}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewRedemptions(discount.id)}
                        className="text-[11px] text-[#1D616A] hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <History size={11} />
                        <span>مشاهده مصارف</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          discount.status === "ACTIVE"
                            ? "success"
                            : discount.status === "EXPIRED"
                              ? "neutral"
                              : discount.status === "DEPLETED"
                                ? "brand"
                                : "neutral"
                        }
                        size="sm"
                      >
                        {discount.status === "ACTIVE"
                          ? "فعال"
                          : discount.status === "EXPIRED"
                            ? "منقضی شده"
                            : discount.status === "DEPLETED"
                              ? "تکمیل ظرفیت"
                              : discount.status === "SCHEDULED"
                                ? "زمان‌بندی شده"
                                : "غیرفعال"}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(discount)}
                          className="h-8 px-2 text-xs"
                          title={discount.isActive ? "غیرفعال کردن" : "فعال کردن"}
                        >
                          {discount.isActive ? (
                            <XCircle size={15} className="text-amber-600" />
                          ) : (
                            <CheckCircle2 size={15} className="text-emerald-600" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(discount.id)}
                          className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                          title="حذف تخفیف"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="ایجاد کد تخفیف جدید برای فروشگاه"
        >
          <form onSubmit={handleCreateDiscount} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-800 mb-1">کد تخفیف (حروف انگلیسی و اعداد)</label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="مثال: STORE15 یا SPECIAL"
                className="w-full p-2.5 rounded-lg border border-slate-200 uppercase font-mono tracking-wider outline-none focus:border-[#1D616A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">عنوان تخفیف</label>
              <input
                type="text"
                required
                value={formTitleFa}
                onChange={(e) => setFormTitleFa(e.target.value)}
                placeholder="مثال: تخفیف ویژه خرید اول از فروشگاه"
                className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">نوع محاسبه</label>
                <select
                  value={formDiscountType}
                  onChange={(e) => setFormDiscountType(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A] bg-white"
                >
                  <option value="PERCENTAGE">درصدی (٪)</option>
                  <option value="FIXED_AMOUNT">مبلغ ثابت (تومان)</option>
                </select>
              </div>

              {formDiscountType === "PERCENTAGE" ? (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">درصد تخفیف</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formDiscountPercent}
                    onChange={(e) => setFormDiscountPercent(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">مبلغ تخفیف (تومان)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={formDiscountAmountToman}
                    onChange={(e) => setFormDiscountAmountToman(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
                  />
                </div>
              )}
            </div>

            {formDiscountType === "PERCENTAGE" && (
              <div>
                <label className="block font-bold text-slate-800 mb-1">سقف تخفیف درصدی (تومان - اختیاری)</label>
                <input
                  type="number"
                  placeholder="بدون سقف عددی"
                  value={formMaxDiscountToman}
                  onChange={(e) => setFormMaxDiscountToman(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-800 mb-1">هدف تخفیف</label>
              <select
                value={formListingId}
                onChange={(e) => setFormListingId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A] bg-white"
              >
                <option value="">تمام بسته‌های این فروشگاه</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    فقط بسته: {l.titleFa}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">حداقل مبلغ سفارش (تومان)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={formMinOrderToman}
                  onChange={(e) => setFormMinOrderToman(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">حداکثر کل دفعات استفاده</label>
                <input
                  type="number"
                  min="1"
                  placeholder="نامحدود"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">تاریخ انقضا (اختیاری)</label>
              <input
                type="datetime-local"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 outline-none focus:border-[#1D616A]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                انصراف
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                className="bg-[#1D616A] hover:bg-[#154b52]"
              >
                ثبت کد تخفیف
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Redemptions Modal */}
      {selectedDiscountId && (
        <Modal
          isOpen={!!selectedDiscountId}
          onClose={() => setSelectedDiscountId(null)}
          title="گزارش استفاده از تخفیف فروشگاه"
        >
          {isLoadingRedemptions ? (
            <div className="p-8 flex justify-center">
              <Spinner />
            </div>
          ) : redemptions.length === 0 ? (
            <p className="text-center py-6 text-slate-500 text-xs">
              تاکنون سفارشی با این تخفیف ثبت نشده است
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {redemptions.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">
                      شماره سفارش: {r.orderNumber || "—"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      مشتری: {r.customerNameFa || "مشتری گرامی"}
                    </div>
                  </div>
                  <div className="text-left font-bold text-emerald-700">
                    {formatToman(r.discountAmountToman)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
