'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function AdminMerchantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">تایید فروشگاه‌ها و نظارت بر جوازها</h1>
        <p className="text-xs text-loqme-neutral-400 mt-1">
          بررسی انطباق بهداشتی، پروانه کسب و صلاحیت فروش محصولات مازاد
        </p>
      </div>

      <div className="rounded-2xl bg-loqme-neutral-800 border border-loqme-neutral-700 overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-loqme-neutral-900 text-loqme-neutral-400 border-b border-loqme-neutral-700">
            <tr>
              <th className="p-4">نام کسب‌وکار</th>
              <th className="p-4">نوع صنف</th>
              <th className="p-4">مالک / شماره تماس</th>
              <th className="p-4">وضعیت احراز</th>
              <th className="p-4 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-loqme-neutral-700 text-loqme-neutral-200">
            <tr>
              <td className="p-4 font-bold text-white">نانوایی و شیرینی سنتی برکت</td>
              <td className="p-4">نان و شیرینی (BAKERY)</td>
              <td className="p-4 font-mono dir-ltr text-right">09122222222</td>
              <td className="p-4">
                <Badge variant="success" size="sm">
                  تایید شده (APPROVED)
                </Badge>
              </td>
              <td className="p-4 text-left">
                <Button size="sm" variant="ghost" className="text-xs text-loqme-neutral-300">
                  مشاهده مدارک
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
