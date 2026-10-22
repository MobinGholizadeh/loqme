"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { ErrorState } from "@/components/ui/ErrorState";
import { DialogSurface } from "@/components/ui/DialogSurface";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { AdminCustomerItemDto } from "@loqme/types";

export default function AdminCustomersPage() {
  const [loadError, setLoadError] = useState("");
  const [customers, setCustomers] = useState<AdminCustomerItemDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<AdminCustomerItemDto | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoadError("");
    try {
      const query = new URLSearchParams();
      if (searchQuery.trim()) query.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/customers?${query.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        setCustomers(json.data);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد؛ دوباره تلاش کنید");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async (c: AdminCustomerItemDto) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/customers/${c.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !c.isActive,
          reasonFa: !c.isActive
            ? "فعال‌سازی توسط اپراتور ارشد"
            : "مسدودسازی موقت به دلایل انضباطی",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: `وضعیت حساب کاربر به ${!c.isActive ? "فعال" : "مسدود"} تغییر یافت`,
        });
        setSelectedCustomer(null);
        fetchCustomers();
      } else {
        setMessage({
          type: "error",
          text: json.message || "خطا در تغییر وضعیت حساب کاربر",
        });
      }
    } catch {
      setMessage({ type: "error", text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setIsUpdating(false);
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
            مدیریت کاربران و مشتریان
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            مشاهده پروفایل خریداران، صرفه‌جویی اقتصادی انباشته، تاریخچه سفارشات
            و کنترل دسترسی حساب
          </p>
        </div>

        <Button
          size="md"
          variant="outline"
          className="text-loqme-neutral-900 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
          onClick={() => {
            setIsLoading(true);
            fetchCustomers();
          }}
        >
          بروزرسانی لیست
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
          <span>{message.text}</span>
          <RippleButton aria-label="بستن" onClick={() => setMessage(null)}>
            ✕
          </RippleButton>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white p-3 rounded-lg border border-loqme-neutral-200 flex items-center justify-between">
        <span className="text-xs text-loqme-neutral-500">
          تعداد کل کاربران ثبت‌نامی:{" "}
          <strong className="text-loqme-neutral-900">
            {toPersianDigits(customers.length)}
          </strong>
        </span>
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجو بر اساس نام خریدار یا شماره موبایل…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 placeholder-loqme-neutral-500 focus:outline-none focus:border-loqme-primary-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال دریافت فهرست کاربران…
          </p>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="کاربری با این مشخصات یافت نشد"
          description="با تغییر عبارت جستجو می‌توانید سایر خریداران را پیدا کنید"
        />
      ) : (
        <div className="rounded-lg bg-white border border-loqme-neutral-200 overflow-hidden shadow-card">
          <table className="w-full text-right text-xs responsive-data-table">
            <thead className="bg-white text-loqme-neutral-500 border-b border-loqme-neutral-200">
              <tr>
                <th className="p-4">نام خریدار</th>
                <th className="p-4">شماره موبایل</th>
                <th className="p-4">سفارش‌های ثبت شده</th>
                <th className="p-4">صرفه‌جویی انباشته (تومان)</th>
                <th className="p-4">شکایات ثبت شده</th>
                <th className="p-4">وضعیت حساب</th>
                <th className="p-4 text-left">عملیات حساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-loqme-neutral-700/60 text-loqme-neutral-700">
              {customers.map((c) => (
                <tr key={c.userId} className="hover:bg-loqme-neutral-100">
                  <td className="p-4 font-bold text-loqme-neutral-900 text-sm">
                    {c.fullName || "مشتری لقمه"}
                  </td>

                  <td className="p-4 font-mono text-loqme-primary-700 dir-ltr text-right">
                    {toPersianDigits(c.mobile)}
                  </td>

                  <td className="p-4 font-bold text-loqme-neutral-900">
                    {toPersianDigits(c.totalOrdersCount)} سفارش
                  </td>

                  <td className="p-4 font-black text-emerald-700">
                    {formatToman(c.cumulativeSavingsToman)}
                  </td>

                  <td className="p-4">
                    {c.complaintsCount > 0 ? (
                      <span className="text-rose-700 font-bold">
                        {toPersianDigits(c.complaintsCount)} گزارش
                      </span>
                    ) : (
                      <span className="text-loqme-neutral-500">ندارد</span>
                    )}
                  </td>

                  <td className="p-4">
                    {c.isActive ? (
                      <Badge variant="success" size="sm">
                        ✓ فعال
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="sm">
                        ⛔ مسدود شده
                      </Badge>
                    )}
                  </td>

                  <td className="p-4 text-left">
                    <Button
                      size="sm"
                      variant={c.isActive ? "destructive" : "primary"}
                      onClick={() => setSelectedCustomer(c)}
                      className="text-xs"
                    >
                      {c.isActive ? "مسدودسازی" : "فعال‌سازی"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedCustomer && (
        <DialogSurface onClose={() => setSelectedCustomer(null)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 border border-loqme-neutral-200 space-y-4 text-loqme-neutral-900">
            <h3 className="font-black text-base text-loqme-neutral-900">
              {selectedCustomer.isActive
                ? "مسدودسازی حساب کاربر"
                : "فعال‌سازی مجدد حساب کاربر"}
            </h3>
            <p className="text-xs text-loqme-neutral-500 leading-relaxed">
              آیا از{" "}
              {selectedCustomer.isActive ? "مسدود نمودن" : "فعال‌سازی مجدد"}{" "}
              حساب کاربری{" "}
              <strong className="text-loqme-neutral-900">
                {selectedCustomer.fullName || selectedCustomer.mobile}
              </strong>{" "}
              اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-loqme-neutral-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCustomer(null)}
                disabled={isUpdating}
                className="text-loqme-neutral-500"
              >
                انصراف
              </Button>
              <Button
                variant={selectedCustomer.isActive ? "destructive" : "primary"}
                size="sm"
                onClick={() => handleToggleStatus(selectedCustomer)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Spinner size="sm" variant="white" />
                ) : (
                  "تایید عملیات"
                )}
              </Button>
            </div>
          </div>
        </DialogSurface>
      )}
    </div>
  );
}
