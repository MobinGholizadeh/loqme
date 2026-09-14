"use client";
import { ErrorState } from "@/components/ui/ErrorState";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { AdminSettlementReportDto } from "@loqme/types";

export default function AdminFinancePage() {
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
      setLoadError("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.");
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

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
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
            محاسبه مانده بستانکاری کلیه فروشگاه‌ها، کسر کارمزد و جرایم استرداد،
            و تولید حواله تسویه پایا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            variant="primary"
            onClick={handleExportCsv}
            disabled={!report || report.merchants.length === 0}
            className="gap-2 font-bold shadow-xs"
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
            🔄 محاسبه مجدد
          </Button>
        </div>
      </div>

      {isLoading && !report ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال محاسبه مانده حساب‌ها...
          </p>
        </div>
      ) : (
        <>
          {/* Aggregate Financial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                گردش مالی کل پلتفرم (GMV)
              </span>
              <div className="text-2xl font-black text-loqme-neutral-900 mt-2">
                {formatToman(report?.totalGmvToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                مجموع تراکنش‌های پرداخت موفق
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                درآمد کارمزد لقمه
              </span>
              <div className="text-2xl font-black text-loqme-primary-700 mt-2">
                {formatToman(report?.totalPlatformCommissionToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-primary-700 mt-1 block">
                سهم خالص عملیاتی پلتفرم
              </span>
            </div>

            <div className="p-5 rounded-lg bg-white border border-loqme-neutral-200 shadow-card">
              <span className="text-xs text-loqme-neutral-500 font-medium">
                مجموع مبالغ استرداد شده
              </span>
              <div className="text-2xl font-black text-rose-700 mt-2">
                {formatToman(report?.totalRefundsToman ?? 0)}
              </div>
              <span className="text-[11px] text-rose-700 mt-1 block">
                کسر شده از بدهی فروشندگان متخلف
              </span>
            </div>

            <div className="p-5 rounded-lg bg-loqme-primary-950/80 border-2 border-loqme-primary-500/50 shadow-card">
              <span className="text-xs text-loqme-primary-200 font-medium">
                کل مانده قابل پرداخت پایا
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {formatToman(report?.totalNetPayableToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-primary-700 mt-1 block">
                آماده صدور دستور واریز دسته‌ای
              </span>
            </div>
          </div>

          {/* Settlement Sheet Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-loqme-neutral-900">
              دفتر تسویه‌حساب دوره‌ای فروشگاه‌های همکار
            </h3>

            {!report?.merchants || report.merchants.length === 0 ? (
              <EmptyState
                icon="💰"
                title="تراکنشی برای تسویه موجود نیست"
                description="با ثبت و تکمیل سفارش‌ها، تراز مالی هر فروشگاه در این بخش محاسبه می‌گردد."
              />
            ) : (
              <div className="rounded-lg bg-white border border-loqme-neutral-200 overflow-hidden shadow-card">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white text-loqme-neutral-500 border-b border-loqme-neutral-200">
                    <tr>
                      <th className="p-4">نام فروشگاه</th>
                      <th className="p-4">کارمزد</th>
                      <th className="p-4">فروش ناخالص</th>
                      <th className="p-4">سهم پلتفرم</th>
                      <th className="p-4">کسر استرداد</th>
                      <th className="p-4">خالص واریزی همکار</th>
                      <th className="p-4">شماره شبا بانک</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-loqme-neutral-700/60 text-loqme-neutral-700">
                    {report.merchants.map((m) => (
                      <tr
                        key={m.merchantId}
                        className="hover:bg-loqme-neutral-100"
                      >
                        <td className="p-4 font-bold text-loqme-neutral-900 text-sm">
                          {m.businessNameFa}
                          <span className="text-[10px] text-loqme-neutral-500 block font-normal">
                            {toPersianDigits(m.ordersCount)} سفارش تکمیل شده
                          </span>
                        </td>

                        <td className="p-4 font-bold text-loqme-primary-700">
                          {toPersianDigits(m.commissionPercent)}٪
                        </td>

                        <td className="p-4 font-mono font-bold text-loqme-neutral-900">
                          {formatToman(m.grossGmvToman)}
                        </td>

                        <td className="p-4 font-mono text-loqme-primary-700">
                          {formatToman(m.commissionCutToman)}
                        </td>

                        <td className="p-4 font-mono text-rose-700">
                          {m.refundsDeductedToman > 0
                            ? formatToman(m.refundsDeductedToman)
                            : "۰ تومان"}
                        </td>

                        <td className="p-4 font-mono font-black text-emerald-700 text-sm">
                          {formatToman(m.netPayableToman)}
                        </td>

                        <td className="p-4 font-mono text-loqme-neutral-700 dir-ltr text-right">
                          {m.shabaNumber}
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
