'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { CustomerPickupPassModal } from '@/components/pickup/CustomerPickupPassModal';
import { ComplaintModal } from '@/components/complaints/ComplaintModal';

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
  const [showPickupPass, setShowPickupPass] = useState<boolean>(false);
  const [showComplaintModal, setShowComplaintModal] = useState<boolean>(false);

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
      <div className="space-y-6 max-w-xl mx-auto py-8 px-4">
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-8 text-center space-y-3 shadow-sm">
          <Skeleton height={56} width={56} variant="circular" className="mx-auto" />
          <Skeleton height={20} width={100} className="mx-auto" />
          <Skeleton height={26} width={220} className="mx-auto" />
          <Skeleton height={36} width={160} className="mx-auto" />
        </div>
      </div>
    );
  }

  // Failed state
  if (!isSuccess) {
    return (
      <div className="py-12 max-w-lg mx-auto px-4">
        <ErrorState
          title="پرداخت تایید نشد"
          message={errorMsgParam || 'تراکنش توسط درگاه بانکی تایید نشد یا توسط خریدار لغو گردید. مبلغی از حساب شما کسر نشده است.'}
          retryText="بازگشت به کاوش بسته‌ها"
          onRetry={() => router.push('/explore')}
          secondaryAction={
            <Button
              variant="secondary"
              size="sm"
              className="bg-surface-container-low text-on-surface"
              onClick={() => router.push('/orders')}
            >
              مشاهده سفارش‌های من
            </Button>
          }
        />
      </div>
    );
  }

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
    <div className="space-y-6 max-w-xl mx-auto pb-16 px-4">
      {/* Celebration Header */}
      <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/30 p-6 text-center space-y-3 shadow-sm">
        <div className="w-16 h-16 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center text-3xl mx-auto shadow-xs">
          <span className="material-symbols-outlined text-[32px] text-secondary">check_circle</span>
        </div>

        <div className="space-y-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container">
            پرداخت با موفقیت انجام شد
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-primary pt-1">
            سفارش شما با موفقیت ثبت شد!
          </h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            بسته شما در فروشگاه محفوظ است و در ساعت مقرر آماده تحویل حضوری خواهد بود.
          </p>
        </div>

        {order?.orderNumber && (
          <div className="pt-2">
            <span className="text-[11px] text-outline block mb-1">کد پیگیری اختصاصی سفارش:</span>
            <span className="font-mono font-black text-lg text-primary bg-surface-container-low px-4 py-1.5 rounded-2xl border border-outline-variant/40 inline-block shadow-xs">
              {order.orderNumber}
            </span>
          </div>
        )}
      </div>

      {/* Stitch-Styled Pickup Voucher Card */}
      <div className="rounded-3xl bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-secondary-container/20 border-2 border-primary-container p-6 text-center space-y-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-primary font-bold">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px] text-secondary">confirmation_number</span>
            <span>ووچر دیجیتال دریافت سفارش (Pickup Voucher)</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold">
            آماده تحویل
          </span>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          هنگام مراجعه به فروشگاه در بازه زمانی، بارکد پویا را به متصدی نشان دهید یا کد ۴ رقمی اختصاصی را اعلام نمایید.
        </p>

        <Button
          variant="primary"
          size="md"
          rounded="pill"
          className="w-full gap-2 text-sm py-3 bg-primary hover:bg-primary-container text-white shadow-md active:scale-98"
          onClick={() => setShowPickupPass(true)}
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
          <span>نمایش ووچر و بارکد QR تحویل حضوری</span>
        </Button>
      </div>

      {/* Modal instance */}
      {orderId && (
        <CustomerPickupPassModal
          orderId={orderId}
          isOpen={showPickupPass}
          onClose={() => setShowPickupPass(false)}
          onVerified={() => {
            fetch(`/api/orders/${orderId}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.success) setOrder(d.data);
              });
          }}
        />
      )}

      {/* Pickup Instructions */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-5 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-primary">
          <span className="material-symbols-outlined text-[20px] text-secondary">schedule</span>
          <h3>دستورالعمل تحویل حضوری</h3>
        </div>

        <div className="space-y-2 text-xs text-on-surface">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <span className="font-bold text-on-surface-variant">بازه تحویل حضوری:</span>
            <span className="font-bold text-primary">{pickupWindowStr || 'امروز در ساعات کاری'}</span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1">
            <span className="font-bold text-on-surface block">فروشگاه:</span>
            <p className="font-semibold text-primary">{order?.merchant.businessNameFa}</p>
            {order?.merchant.addressFa && (
              <p className="text-on-surface-variant">📍 {order.merchant.addressFa}</p>
            )}
            {order?.merchant.phone && (
              <p className="text-outline">📞 {order.merchant.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Financial Breakdown */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-5 space-y-3 shadow-xs">
        <h3 className="font-bold text-xs text-on-surface border-b border-outline-variant/20 pb-2">
          رسید دیجیتال و تراکنش بانکی شاپرک
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>شناسه مرجع شاپرک (RefID):</span>
            <span className="font-mono text-on-surface font-medium">{referenceId}</span>
          </div>

          <div className="flex items-center justify-between text-on-surface-variant">
            <span>درگاه پرداخت:</span>
            <span className="font-medium text-on-surface">{order?.payment?.gateway === 'ZARINPAL' ? 'زرین‌پال' : 'شاپرک (تست)'}</span>
          </div>

          <div className="flex items-center justify-between font-bold text-on-surface border-t border-outline-variant/20 pt-2 text-sm">
            <span>مبلغ پرداختی:</span>
            <span className="text-primary font-black">{formatToman(order?.totalAmountToman || 0)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link href="/orders" className="w-full sm:flex-1">
          <Button variant="secondary" size="md" rounded="pill" className="w-full bg-surface-container-low text-on-surface hover:bg-surface-container">
            مشاهده سفارش‌های من
          </Button>
        </Link>
        <Link href="/explore" className="w-full sm:flex-1">
          <Button variant="primary" size="md" rounded="pill" className="w-full bg-primary hover:bg-primary-container text-white">
            ادامه کاوش خوراکی‌ها
          </Button>
        </Link>
      </div>
    </div>
  );
}
