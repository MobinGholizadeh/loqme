'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { MerchantFinanceSummaryDto } from '@loqme/types';

export default function MerchantFinancePage() {
  const [finance, setFinance] = useState<MerchantFinanceSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFinance = useCallback(async () => {
    try {
      const res = await fetch('/api/merchant/finance');
      const json = await res.json();
      if (json.success && json.data) {
        setFinance(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch merchant finance:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-loqme-neutral-900">صورت‌حساب مالی و تسویه</h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            گزارش فروش ناخالص، کارمزد پلتفرم، مانده قابل تسویه و ریز تراکنش‌های دفاتر کل
          </p>
        </div>

        <Button
          size="md"
          variant="outline"
          onClick={() => {
            setIsLoading(true);
            fetchFinance();
          }}
          className="gap-2"
        >
          <span>🔄</span>
          <span>بروزرسانی حساب</span>
        </Button>
      </div>

      {isLoading && !finance ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">در حال محاسبه صورت‌حساب مالی...</p>
        </div>
      ) : (
        <>
          {/* KPI Financial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">فروش ناخالص کل (GMV)</span>
              <div className="text-2xl font-black text-loqme-neutral-900 mt-2">
                {formatToman(finance?.grossSalesToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                مجموع بهای سفارش‌های ثبت‌شده
              </span>
            </Card>

            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">کارمزد پلتفرم لقمه (۱۰٪)</span>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {formatToman(finance?.platformCommissionToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                نرخ مصوب کارمزد: ۱۰.۰٪
              </span>
            </Card>

            <Card variant="elevated" className="p-4 bg-loqme-primary-50 border-2 border-loqme-primary-300">
              <span className="text-xs text-loqme-primary-800 font-medium">مانده قابل تسویه همکار (۹۰٪)</span>
              <div className="text-2xl font-black text-loqme-primary-900 mt-2">
                {formatToman(finance?.netPayableBalanceToman ?? 0)}
              </div>
              <span className="text-[11px] text-loqme-primary-700 mt-1 block">
                آماده واریز دوره‌ای به شماره شبا
              </span>
            </Card>

            <Card variant="elevated" className="p-4 bg-white border border-loqme-neutral-200">
              <span className="text-xs text-loqme-neutral-500 font-medium">سفارش‌های تکمیل‌شده</span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {toPersianDigits(finance?.completedOrdersCount ?? 0)} سفارش
              </div>
              <span className="text-[11px] text-loqme-neutral-500 mt-1 block">
                از مجموع {toPersianDigits(finance?.totalOrdersCount ?? 0)} سفارش ثبت شده
              </span>
            </Card>
          </div>

          {/* Bank Account / Shaba Card */}
          <Card variant="elevated" className="p-5 bg-white border border-loqme-neutral-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs text-loqme-neutral-500 font-medium">حساب بانکی جهت تسویه خودکار:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-loqme-neutral-900 tracking-wider">
                    {finance?.shabaNumber || 'IR820170000000109283746501'}
                  </span>
                  <Badge variant="success" size="sm">
                    ✓ شبا تایید شده در سامانه پایا/ساتنا
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-loqme-neutral-500">
                چرخه تسویه: <strong className="text-loqme-neutral-800">هفتگی (یکشنبه‌ها)</strong>
              </div>
            </div>
          </Card>

          {/* Ledger Transactions Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-loqme-neutral-900">ریز تراکنش‌های دفاتر کل (Ledger)</h3>

            {!finance?.transactions || finance.transactions.length === 0 ? (
              <EmptyState
                icon="💰"
                title="تراکنشی یافت نشد"
                description="پس از پرداخت سفارش‌ها توسط مشتریان، اسناد بستانکاری فروشگاه در این بخش ثبت می‌گردند."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-loqme-neutral-200 bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-loqme-neutral-50 border-b border-loqme-neutral-200 text-loqme-neutral-600 font-bold">
                    <tr>
                      <th className="p-3">تاریخ و ساعت</th>
                      <th className="p-3">کد سفارش</th>
                      <th className="p-3">شرح تراکنش</th>
                      <th className="p-3">مبلغ ناخالص</th>
                      <th className="p-3">کارمزد ۱۰٪</th>
                      <th className="p-3">خالص بستانکاری</th>
                      <th className="p-3">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-loqme-neutral-100">
                    {finance.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-loqme-neutral-50/50">
                        <td className="p-3 font-mono text-loqme-neutral-500">
                          {new Date(tx.createdAt).toLocaleDateString('fa-IR')}
                        </td>
                        <td className="p-3 font-mono font-bold text-loqme-primary-800">
                          {tx.orderNumber || '-'}
                        </td>
                        <td className="p-3 text-loqme-neutral-800">{tx.descriptionFa}</td>
                        <td className="p-3 font-bold text-loqme-neutral-900">
                          {formatToman(tx.grossAmountToman)}
                        </td>
                        <td className="p-3 font-medium text-rose-600">
                          {formatToman(tx.commissionAmountToman)}
                        </td>
                        <td className="p-3 font-black text-emerald-700">
                          {formatToman(tx.netAmountToman)}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            ثبت در دفتر
                          </span>
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
