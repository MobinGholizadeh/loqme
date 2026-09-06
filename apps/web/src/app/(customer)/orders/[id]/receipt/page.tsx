'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';

interface OrderReceiptData {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountToman: number;
  commissionAmountToman: number;
  merchantPayoutAmountToman: number;
  createdAt: string;
  merchant: {
    id: string;
    businessNameFa: string;
    addressFa?: string;
    phone?: string;
    cityNameFa?: string;
    neighborhoodNameFa?: string;
  };
  items: Array<{
    id: string;
    listingId: string;
    titleFa: string;
    unitPriceToman: number;
    quantity: number;
    subtotalToman: number;
    pickupStart: string;
    pickupEnd: string;
  }>;
  payment?: {
    gateway: string;
    authority: string;
    referenceId?: string;
    trackingCode?: string;
    status: string;
  } | null;
}

export default function OrderReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params?.id as string;
  const statusParam = searchParams.get('status') || 'success';
  const errorMsgParam = searchParams.get('msg');
  const refParam = searchParams.get('ref');

  const isSuccess = statusParam === 'success';

  const [order, setOrder] = useState<OrderReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const json = await res.json();
        if (json.success) {
          setOrder(json.data);
        }
      } catch (err) {
        console.error('Error fetching order receipt:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-loqme-neutral-500">
        <Spinner size="lg" />
        <span className="text-xs font-medium">در حال دریافت فاکتور و وضعیت نهایی سفارش...</span>
      </div>
    );
  }

  // Failed state
  if (!isSuccess) {
    return (
      <div className="space-y-6 max-w-lg mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-xs">
          ✕
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-loqme-neutral-900">پرداخت ناموفق بود</h1>
          <p className="text-xs text-loqme-neutral-500 leading-relaxed">
            {errorMsgParam || 'تراکنش توسط درگاه بانکی تایید نشد یا توسط خریدار انصراف داده شد.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          <Button variant="primary" size="md" onClick={() => router.push('/explore')}>
            بازگشت به کاوش بسته‌ها
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.push('/orders')}>
            مشاهده سفارشات من
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  const firstItem = order?.items[0];
  let pickupWindowStr = '';
  if (firstItem?.pickupStart && firstItem?.pickupEnd) {
    const s = new Date(firstItem.pickupStart);
    const e = new Date(firstItem.pickupEnd);
    const sH = s.getHours().toString().padStart(2, '0');
    const sM = s.getMinutes().toString().padStart(2, '0');
    const eH = e.getHours().toString().padStart(2, '0');
    const eM = e.getMinutes().toString().padStart(2, '0');
    pickupWindowStr = `${sH}:${sM} تا ${eH}:${eM}`;
  }

  const referenceId = order?.payment?.referenceId || refParam || 'ثبت‌شده در شاپرک';

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-16">
      {/* Celebration Header */}
      <Card variant="elevated" className="p-6 text-center space-y-3 bg-white">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-xs animate-bounce">
          ✓
        </div>

        <div className="space-y-1">
          <Badge variant="success" size="sm">
            پرداخت تایید شد
          </Badge>
          <h1 className="text-xl md:text-2xl font-black text-loqme-neutral-900 pt-1">
            سفارش شما با موفقیت ثبت شد!
          </h1>
          <p className="text-xs text-loqme-neutral-500 leading-relaxed">
            بسته شما در فروشگاه محفوظ است و در ساعت مقرر آماده تحویل حضوری خواهد بود.
          </p>
        </div>

        {order?.orderNumber && (
          <div className="pt-2">
            <span className="text-[11px] text-loqme-neutral-400 block mb-1">کد پیگیری اختصاصی سفارش:</span>
            <span className="font-mono font-black text-xl text-loqme-primary-800 bg-loqme-primary-50 px-4 py-1.5 rounded-2xl border border-loqme-primary-200 inline-block shadow-xs">
              {order.orderNumber}
            </span>
          </div>
        )}
      </Card>

      {/* Pickup Instructions */}
      <Card variant="outlined" className="p-5 space-y-3 bg-white">
        <div className="flex items-center gap-2 font-bold text-sm text-loqme-neutral-900">
          <span>⏰</span>
          <h3>دستورالعمل تحویل حضوری</h3>
        </div>

        <div className="space-y-2 text-xs text-loqme-neutral-700">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-loqme-neutral-50 border border-loqme-neutral-100">
            <span className="font-bold text-loqme-neutral-800">بازه تحویل حضوری امروز:</span>
            <span className="font-bold text-loqme-primary-800">{pickupWindowStr || 'امروز در ساعات کاری'}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-loqme-neutral-50 border border-loqme-neutral-100 space-y-1">
            <span className="font-bold text-loqme-neutral-800 block">فروشگاه:</span>
            <p className="font-medium text-loqme-neutral-900">{order?.merchant.businessNameFa}</p>
            {order?.merchant.addressFa && (
              <p className="text-loqme-neutral-500">📍 {order.merchant.addressFa}</p>
            )}
            {order?.merchant.phone && (
              <p className="text-loqme-neutral-400">📞 {order.merchant.phone}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Receipt Financial Breakdown */}
      <Card variant="outlined" className="p-5 space-y-3 bg-white">
        <h3 className="font-bold text-xs text-loqme-neutral-900 border-b border-loqme-neutral-100 pb-2">
          رسید دیجیتال تراکنش بانکی
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-loqme-neutral-600">
            <span>شناسه مرجع شاپرک (RefID):</span>
            <span className="font-mono text-loqme-neutral-900 font-medium">{referenceId}</span>
          </div>

          <div className="flex items-center justify-between text-loqme-neutral-600">
            <span>درگاه پرداخت:</span>
            <span>{order?.payment?.gateway === 'ZARINPAL' ? 'زرین‌پال' : 'شاپرک (تست)'}</span>
          </div>

          {order?.totalAmountToman && (
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-loqme-neutral-200 font-bold text-sm">
              <span className="text-loqme-neutral-900">مبلغ پرداختی:</span>
              <span className="text-loqme-primary-800 font-black">
                {formatToman(order.totalAmountToman)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link href="/orders" className="w-full sm:flex-1">
          <Button variant="primary" size="md" className="w-full">
            مشاهده در سفارشات من
          </Button>
        </Link>
        <Link href="/explore" className="w-full sm:flex-1">
          <Button variant="secondary" size="md" className="w-full">
            کاوش سایر خوراکی‌ها
          </Button>
        </Link>
      </div>
    </div>
  );
}
