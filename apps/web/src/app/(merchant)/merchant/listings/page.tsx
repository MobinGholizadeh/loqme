"use client";
import { PickupDetailsEditor } from "@/components/merchant/PickupDetailsEditor";
import type { PickupDetailsInput } from "@loqme/validation";
import { ErrorState } from "@/components/ui/ErrorState";
import * as RedesignIcons from "lucide-react";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FastListingModal } from "@/components/merchant/FastListingModal";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";

interface MerchantListingItem {
  pickupDetails?: PickupDetailsInput;
  id: string;
  titleFa: string;
  descriptionFa: string;
  categoryNameFa?: string;
  originalPriceToman: number;
  discountedPriceToman: number;
  discountPercent: number;
  pickupDate: string;
  pickupStart: string | null;
  pickupEnd: string | null;
  status: "PUBLISHED" | "PAUSED" | "SOLD_OUT" | "EXPIRED";
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  remainingQuantity: number;
  temperatureRequirement?: string;
  createdAt: string;
}

export default function MerchantListingsPage() {
  const [editingPickup, setEditingPickup] = useState<MerchantListingItem | null>(null);
  const [loadError, setLoadError] = useState("");
  const [listings, setListings] = useState<MerchantListingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<
    "ALL" | "PUBLISHED" | "PAUSED" | "SOLD_OUT"
  >("ALL");
  const [isFastModalOpen, setIsFastModalOpen] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/merchant/listings");
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        setListings(json.data);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // 1-Tap Toggle Pause / Resume
  const handleToggleStatus = async (item: MerchantListingItem) => {
    const nextStatus = item.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED";
    setActionLoadingId(item.id);

    // Optimistic update
    setListings((prev) =>
      prev.map((l) => (l.id === item.id ? { ...l, status: nextStatus } : l)),
    );

    try {
      const res = await fetch(`/api/merchant/listings/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        // Rollback on failure
        fetchListings();
      }
    } catch {
      fetchListings();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stock Stepper (+1 / -1)
  const handleAdjustStock = async (
    item: MerchantListingItem,
    delta: number,
  ) => {
    const newTotal = item.totalQuantity + delta;
    if (newTotal < item.reservedQuantity + item.soldQuantity) {
      return; // Cannot go below reserved/sold
    }

    setActionLoadingId(item.id);

    // Optimistic update
    setListings((prev) =>
      prev.map((l) =>
        l.id === item.id
          ? {
              ...l,
              totalQuantity: newTotal,
              remainingQuantity: newTotal - l.reservedQuantity - l.soldQuantity,
            }
          : l,
      ),
    );

    try {
      const res = await fetch(`/api/merchant/listings/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltaQuantity: delta }),
      });
      if (!res.ok) {
        fetchListings();
      }
    } catch {
      fetchListings();
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: MerchantListingItem["status"]) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge variant="success" size="sm">
            ● فعال در بازار
          </Badge>
        );
      case "PAUSED":
        return (
          <Badge variant="neutral" size="sm">
            ⏸ متوقف شده
          </Badge>
        );
      case "SOLD_OUT":
        return (
          <Badge variant="brand" size="sm">
            تکمیل ظرفیت
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="danger" size="sm">
            منقضی شده
          </Badge>
        );
    }
  };

  const filteredListings = listings.filter((item) => {
    if (filterTab === "ALL") return true;
    return item.status === filterTab;
  });

  const publishedCount = listings.filter(
    (l) => l.status === "PUBLISHED",
  ).length;
  const pausedCount = listings.filter((l) => l.status === "PAUSED").length;
  const soldOutCount = listings.filter((l) => l.status === "SOLD_OUT").length;

  if (loadError)
    return (
      <ErrorState
        title="دریافت اطلاعات انجام نشد"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-loqme-neutral-900">
            مدیریت بسته‌های مازاد
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            کنترل لحظه‌ای وضعیت بسته‌ها، توقف موقت فروش (Pause) و تنظیم آنی
            موجودی (+/-)
          </p>
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={() => setIsFastModalOpen(true)}
          className="gap-2 shadow-sm font-bold"
        >
          <span>
            <RedesignIcons.Zap size={20} aria-hidden="true" />
          </span>
          <span>+ ثبت بسته جدید (زیر ۶۰ ثانیه)</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-loqme-neutral-200 pb-2 text-xs">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "ALL"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          همه ({toPersianDigits(listings.length)})
        </button>
        <button
          onClick={() => setFilterTab("PUBLISHED")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "PUBLISHED"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          فعال در بازار ({toPersianDigits(publishedCount)})
        </button>
        <button
          onClick={() => setFilterTab("PAUSED")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "PAUSED"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          متوقف شده ({toPersianDigits(pausedCount)})
        </button>
        <button
          onClick={() => setFilterTab("SOLD_OUT")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterTab === "SOLD_OUT"
              ? "bg-loqme-primary-600 text-white shadow-xs"
              : "text-loqme-neutral-600 hover:bg-loqme-neutral-100"
          }`}
        >
          تکمیل ظرفیت ({toPersianDigits(soldOutCount)})
        </button>
      </div>

      {/* Listings List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال دریافت بسته‌ها...
          </p>
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyState
          icon="📦"
          title="بسته‌ای در این بخش یافت نشد"
          description="با کلیک روی دکمه ثبت سریع، بسته مازاد امروز خود را در کمتر از ۶۰ ثانیه به مشتریان محله عرضه کنید."
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsFastModalOpen(true)}
            >
              + تعریف اولین بسته مازاد
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredListings.map((item) => {
            const isActionLoading = actionLoadingId === item.id;
            const isPaused = item.status === "PAUSED";
            const isPublished = item.status === "PUBLISHED";

            let pickupWindowText = "امروز";
            if (item.pickupStart && item.pickupEnd) {
              const s = new Date(item.pickupStart).toLocaleTimeString("fa-IR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const e = new Date(item.pickupEnd).toLocaleTimeString("fa-IR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              pickupWindowText = `از ساعت ${s} الی ${e}`;
            }

            return (
              <Card
                key={item.id}
                variant="elevated"
                className={`p-5 bg-white border transition-all ${
                  isPaused
                    ? "border-loqme-neutral-200 opacity-75"
                    : isPublished
                      ? "border-loqme-primary-200 shadow-xs"
                      : "border-loqme-neutral-200"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info Column */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base text-loqme-neutral-900">
                        {item.titleFa}
                      </h3>
                      {getStatusBadge(item.status)}
                      {item.discountPercent > 0 && (
                        <span className="text-[11px] font-bold text-loqme-primary-800 bg-loqme-primary-100 px-2 py-0.5 rounded-full">
                          {toPersianDigits(item.discountPercent)}٪ تخفیف
                        </span>
                      )}
                      {item.categoryNameFa && (
                        <span className="text-[11px] text-loqme-neutral-500 bg-loqme-neutral-100 px-2 py-0.5 rounded-full">
                          {item.categoryNameFa}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-loqme-neutral-600 line-clamp-1">
                      {item.descriptionFa}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-loqme-neutral-500 pt-1 flex-wrap">
                      <span>
                        قیمت فروش:{" "}
                        <strong className="text-loqme-primary-700 font-bold">
                          {formatToman(item.discountedPriceToman)}
                        </strong>{" "}
                        <del className="text-loqme-neutral-500 text-[11px]">
                          {formatToman(item.originalPriceToman)}
                        </del>
                      </span>
                      <span>
                        ⏰ بازه تحویل: <strong>{pickupWindowText}</strong>
                      </span>
                      <span>
                        فروخته شده:{" "}
                        <strong className="text-emerald-700">
                          {toPersianDigits(item.soldQuantity)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Stock Controls & Fast Actions */}
                  <div className="flex items-center gap-4 self-end md:self-center">
                    {/* Stock Stepper */}
                    <div className="flex flex-col items-center bg-loqme-neutral-50 p-2 rounded-lg border border-loqme-neutral-200">
                      <span className="text-[10px] text-loqme-neutral-500 font-medium mb-1">
                        موجودی باقی‌مانده:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdjustStock(item, -1)}
                          disabled={
                            isActionLoading ||
                            item.totalQuantity <=
                              item.reservedQuantity + item.soldQuantity
                          }
                          className="w-8 h-8 rounded-lg border border-loqme-neutral-300 bg-white font-black hover:bg-loqme-neutral-100 disabled:opacity-30"
                          title="کاهش یک عدد"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-black text-base text-loqme-neutral-900">
                          {toPersianDigits(item.remainingQuantity)}
                        </span>
                        <button
                          onClick={() => handleAdjustStock(item, +1)}
                          disabled={isActionLoading}
                          className="w-8 h-8 rounded-lg border border-loqme-neutral-300 bg-white font-black hover:bg-loqme-neutral-100 disabled:opacity-30"
                          title="افزایش یک عدد"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 1-Tap Toggle Status Button */}
                    <Button
                      size="sm"
                      variant={isPublished ? "outline" : "primary"}
                      onClick={() => handleToggleStatus(item)}
                      disabled={isActionLoading}
                      className="gap-1.5 shadow-xs"
                    >
                      {isActionLoading ? (
                        <Spinner size="sm" variant="primary" />
                      ) : isPublished ? (
                        <>
                          <RedesignIcons.Pause size={16} aria-hidden="true" />
                          <span>توقف موقت</span>
                        </>
                      ) : (
                        <>
                          <RedesignIcons.Play size={16} aria-hidden="true" />
                          <span>انتشار در بازار</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingPickup(item)}>بسته‌بندی و راهنمای دریافت</Button>
              </Card>
            );
          })}
        </div>
      )}

      {editingPickup && <PickupDetailsEditor listing={editingPickup} onClose={() => setEditingPickup(null)} onSaved={fetchListings}/>}
      {/* Fast Listing Modal */}
      <FastListingModal
        isOpen={isFastModalOpen}
        onClose={() => setIsFastModalOpen(false)}
        onListingCreated={fetchListings}
      />
    </div>
  );
}
