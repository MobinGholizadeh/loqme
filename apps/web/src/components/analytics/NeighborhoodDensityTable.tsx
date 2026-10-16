"use client";

import React from "react";
import { NeighborhoodDensityDto } from "@loqme/types";
import { toPersianDigits, formatToman } from "@loqme/validation";
import { Badge } from "@/components/ui/Badge";

interface NeighborhoodDensityTableProps {
  data: NeighborhoodDensityDto[];
}

export const NeighborhoodDensityTable: React.FC<
  NeighborhoodDensityTableProps
> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-loqme-neutral-500 text-sm">
        اطلاعات تراکم جغرافیایی برای این محدوده زمانی یافت نشد.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs text-loqme-neutral-600">
        <thead className="bg-loqme-neutral-50 text-loqme-neutral-500 border-b border-loqme-neutral-200 uppercase tracking-wider text-[11px]">
          <tr>
            <th className="py-3 px-4">رتبه</th>
            <th className="py-3 px-4">نام محله</th>
            <th className="py-3 px-4">فروشگاه‌های همکار</th>
            <th className="py-3 px-4">بسته‌های فعال</th>
            <th className="py-3 px-4">تعداد سفارش‌ها</th>
            <th className="py-3 px-4">گردش مالی (GMV)</th>
            <th className="py-3 px-4 text-center">شاخص تقاضای برآورده‌نشده</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-loqme-neutral-800/60 font-vazirmatn">
          {data.map((n, idx) => {
            const isTop3 = idx < 3;
            return (
              <tr
                key={n.neighborhoodId}
                className="hover:bg-loqme-neutral-50 transition-colors"
              >
                <td className="py-3 px-4 font-semibold">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      idx === 0
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : idx === 1
                          ? "bg-slate-400/20 text-slate-300 border border-slate-400/40"
                          : idx === 2
                            ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                            : "text-loqme-neutral-500"
                    }`}
                  >
                    {toPersianDigits(idx + 1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-white text-sm">
                    {n.neighborhoodNameFa}
                  </div>
                  <div className="text-[11px] text-loqme-neutral-500">
                    {n.cityNameFa}
                  </div>
                </td>
                <td className="py-3 px-4 font-medium text-loqme-neutral-700">
                  {toPersianDigits(n.activeMerchantsCount)} فروشگاه
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      n.activeListingsCount > 0
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                        : "bg-loqme-neutral-100 text-loqme-neutral-500"
                    }`}
                  >
                    {toPersianDigits(n.activeListingsCount)} بسته
                  </span>
                </td>
                <td className="py-3 px-4 text-loqme-neutral-700 font-semibold">
                  {toPersianDigits(n.totalOrdersCount)} سفارش
                </td>
                <td className="py-3 px-4 font-bold text-emerald-400">
                  {formatToman(n.totalGmvToman)} تومان
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-24 bg-loqme-neutral-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          n.unmetDemandScore > 75
                            ? "bg-rose-500"
                            : n.unmetDemandScore > 40
                              ? "bg-amber-500"
                              : "bg-teal-500"
                        }`}
                        style={{
                          width: `${Math.min(100, n.unmetDemandScore)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-loqme-neutral-500">
                      {n.unmetDemandScore > 75
                        ? "تقاضای بالا (جذب فروشنده)"
                        : n.unmetDemandScore > 40
                          ? "نیازمند تقویت عرضه"
                          : "عرضه متناسب"}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
