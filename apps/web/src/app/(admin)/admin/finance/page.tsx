"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { AdminSettlementReportDto } from "@loqme/types";
import { csvRow } from "@/lib/utils/csv";
import { AdminBankAndPayoutsSection } from "@/components/admin/AdminBankAndPayoutsSection";
import { Building2, Receipt } from "lucide-react";

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<"settlements" | "bank_payouts">("settlements");
  const [loadError, setLoadError] = useState("");
  const [report, setReport] = useState<AdminSettlementReportDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReport = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/admin/finance/settlements");
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        setReport(json.data);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد؛ دوباره تلاش کنید");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    if (!report || !report.merchants.length) return;

    // Generate CSV data for Paya bank transfer
    const headers = [
      "شناسه فروشگاه",
      "نام فروشگاه",
      "درصد کارمزد",
      "فروش ناخالص (تومان)",
      "سهم کارمزد لقمه (تومان)",
      "استردادهای کسر شده (تومان)",
      "خالص واریزی پایا (تومان)",
      "شماره شبا",
      "تعداد سفارش",
    ];

    const rows = report.merchants.map((m) => [
      m.merchantId,
      m.businessNameFa,
      m.commissionPercent,
      m.grossGmvToman,
      m.commissionCutToman,
      m.refundsDeductedToman,
      m.netPayableToman,
      m.shabaNumber,
      m.ordersCount,
    ]);

    const csvContent = "\uFEFF" + [csvRow(headers), ...rows.map(csvRow)].join("\n");
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `loqme-settlement-batch-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            کارمزد، تسویه‌حساب و حسابداری پلتفرم
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            محاسبه مانده بستانکاری کلیه فروشگاه‌ها، تایید حساب‌های بانکی، و مدیریت درخواست‌های تسویه
          </p>
        </div>

        {activeTab === "settlements" && (
          <div className="flex items-center gap-2">
            <Button
              size="md"
              variant="primary"
              onClick={handleExportCsv}
              disabled={!report || report.merchants.length === 0}
              className="gap-2 font-bold shadow-xs bg-[#1D616A] text-white"
            >
              <span>📥</span>
              <span>خروجی فایل پایا / CSV</span>
            </Button>

            <Button
              size="md"
              variant="outline"
              className="text-loqme-neutral-900 border-loqme-neutral-200 hover:bg-loqme-neutral-100"
              onClick={() => {
                setIsLoading(true);
                fetchReport();
              }}
            >
              محاسبه مجدد
            </Button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("settlements")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "settlements"
              ? "bg-[#1D616A] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Receipt size={16} />
          <span>گزارش جامع تسویه و حواله پایا</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("bank_payouts")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "bank_payouts"
              ? "bg-[#1D616A] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Building2 size={16} />
          <span>تایید حساب‌های بانکی و تسویه‌ها</span>
        </button>
      </div>

      {activeTab === "bank_payouts" ? (
        <AdminBankAndPayoutsSection />
      ) : isLoading && !report ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال محاسبه مانده حساب‌ها…
          </p>
        </div>
      ) : (
        <>
          {/* Aggregate Financial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                مجموع فروش ناخالص بازار (GMV)
              </span>
              <div className="text-2xl font-black text-loqme-neutral-900 mt-2">
                {formatToman(report?.totalGmvToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                تراکنش‌های موفق پرداخت سفارش
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                درآمد کارمزد پلتفرم لقمه
              </span>
              <div className="text-2xl font-black text-loqme-primary-900 mt-2">
                {formatToman(report?.totalPlatformCommissionToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-primary-700 mt-1 block">
                سهم پلتفرم از کل سفارش‌ها
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                مجموع استردادهای کسر شده
              </span>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {formatToman(report?.totalRefundsToman ?? 0)}
              </div>
              <span className="text-[11px] text-rose-500 mt-1 block">
                سفارش‌های مرجوع‌شده یا لغو شده
              </span>
            </div>

            <div className="p-5 rounded-lg bg-loqme-primary-50 border-2 border-loqme-primary-300 shadow-card">
              <span className="text-xs text-loqme-primary-900 font-medium">
                خالص مانده قابل تسویه همکاران
              </span>
              <div className="text-2xl font-black text-loqme-primary-950 mt-2">
                {formatToman(report?.totalNetPayableToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-primary-700 mt-1 block">
                مجموع حواله بانکی پایا تجمیعی
              </span>
            </div>
          </div>

          {/* Merchants Settlement Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-loqme-neutral-900">
                فهرست فروشگاه‌ها و مانده تسویه حساب
              </h3>
              <span className="text-xs text-loqme-neutral-500">
                تعداد کل فروشگاه‌ها:{" "}
                {toPersianDigits(report?.merchants.length ?? 0)}
              </span>
            </div>

            {!report?.merchants || report.merchants.length === 0 ? (
              <EmptyState
                title="تراکنشی برای تسویه موجود نیست"
                description="به محض تکمیل سفارش توسط فروشگاه‌ها، مانده بستانکاری آنان در این جدول درج خواهد شد"
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-loqme-neutral-200 bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-loqme-neutral-50 border-b border-loqme-neutral-200 text-loqme-neutral-600 font-bold">
                    <tr>
                      <th className="p-3">نام فروشگاه</th>
                      <th className="p-3">تعداد سفارش</th>
                      <th className="p-3">فروش ناخالص</th>
                      <th className="p-3">درصد کارمزد</th>
                      <th className="p-3">سهم لقمه</th>
                      <th className="p-3">استرداد</th>
                      <th className="p-3">خالص قابل واریز</th>
                      <th className="p-3">شماره شبا مقصد</th>
                      <th className="p-3">وضعیت حساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-loqme-neutral-100">
                    {report.merchants.map((m) => (
                      <tr
                        key={m.merchantId}
                        className="hover:bg-loqme-neutral-50/50"
                      >
                        <td className="p-3 font-bold text-loqme-neutral-900">
                          {m.businessNameFa}
                        </td>
                        <td className="p-3 font-mono text-loqme-neutral-600">
                          {toPersianDigits(m.ordersCount)}
                        </td>
                        <td className="p-3 font-mono text-loqme-neutral-900">
                          {formatToman(m.grossGmvToman)}
                        </td>
                        <td className="p-3 font-mono text-loqme-neutral-600">
                          {toPersianDigits(m.commissionPercent)}٪
                        </td>
                        <td className="p-3 font-mono text-rose-600 font-medium">
                          {formatToman(m.commissionCutToman)}
                        </td>
                        <td className="p-3 font-mono text-rose-700">
                          {formatToman(m.refundsDeductedToman)}
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-700 text-sm">
                          {formatToman(m.netPayableToman)}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-loqme-neutral-600 dir-ltr text-right">
                          {m.shabaNumber || "ثبت نشده"}
                        </td>
                        <td className="p-3">
                          {m.shabaNumber && m.isBankVerified ? (
                            <Badge variant="success" size="sm">
                              شبا تایید شده
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              فاقد شبا تایید شده
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
