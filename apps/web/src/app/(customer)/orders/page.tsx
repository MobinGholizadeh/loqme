'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatToman, toPersianDigits } from '@/lib/utils/persian';
import { CustomerOrderSummaryDto, OrderStatus } from '@loqme/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/orders');
        if (res.status === 401) {
          setIsUnauthorized(true);
          return;
        }

        const json = await res.json();
        if (json.success) {
          setOrders(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PAID':
      case 'READY_FOR_PICKUP':
        return <Badge variant="success" size="sm">✓ آماده تحویل حضوری</Badge>;
      case 'COMPLETED':
        return <Badge variant="brand" size="sm">✓ تحویل گرفته شد</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="warning" size="sm">در انتظار پرداخت</Badge>;
      case 'CANCELLED':
      case 'REFUNDED':
        return <Badge variant="danger" size="sm">لغو شده</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-4">
        <div className="flex justify-between items-center">
          <Skeleton height={24} width={120} />
          <Skeleton height={20} width={80} />
        </div>
        <div className="space-y-3">
          <Skeleton height={140} width="100%" />
          <Skeleton height={140} width="100%" />
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <EmptyState
          icon="🔐"
          title="ورود به حساب کاربری برای مشاهده سفارشات"
          description="با شماره موبایل خود وارد شوید تا به تاریخچه سفارش‌ها و کدهای تحویل حضوری دسترسی داشته باشید."
          action={
            <Link href="/login?redirect=/orders">
              <Button variant="primary" size="md">
                ورود به حساب کاربری
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-loqme-neutral-900">سفارشات من</h1>
          <p className="text-xs text-loqme-neutral-500 mt-0.5">پیگیری وضعیت سفارش و دریافت حضوری</p>
        </div>
        <Badge variant="brand" size="sm">
          {toPersianDigits(orders.length)} سفارش ثبت‌شده
        </Badge>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title="هنوز سفارشی ثبت نکرده‌اید"
          description="با خرید بسته‌های شگفت‌انگیز محله خود، در صرفه‌جویی اقتصادی و جلوگیری از هدررفت خوراکی‌های تازه سهیم شوید."
          action={
            <Link href="/explore">
              <Button variant="primary" size="md">
                کاوش بسته‌های شگفت‌انگیز محله
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} variant="elevated" className="p-5 space-y-3 bg-white">
              <div className="flex items-start justify-between pb-3 border-b border-loqme-neutral-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-loqme-neutral-400">شماره سفارش:</span>
                    <span className="font-mono font-bold text-xs text-loqme-primary-800 bg-loqme-primary-50 px-2 py-0.5 rounded-lg border border-loqme-primary-200">
                      {order.orderNumber}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-loqme-neutral-900 pt-1">
                    {order.merchantNameFa}
                  </h3>
                  <p className="text-xs text-loqme-neutral-600">
                    {toPersianDigits(order.quantity)} × {order.listingTitleFa}
                  </p>
                </div>

                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Pickup info */}
              <div className="p-3 bg-loqme-neutral-50 rounded-xl border border-loqme-neutral-100 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-loqme-neutral-500">زمان تحویل حضوری:</span>
                  <span className="font-bold text-loqme-neutral-800">
                    {order.pickupWindowFa || 'امروز در ساعات کاری'}
                  </span>
                </div>
                {order.merchantAddressFa && (
                  <div className="text-[11px] text-loqme-neutral-500 line-clamp-1">
                    📍 {order.merchantAddressFa}
                  </div>
                )}
              </div>

              {/* Price & Action */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  <span className="text-loqme-neutral-500">مبلغ پرداختی: </span>
                  <span className="font-extrabold text-sm text-loqme-primary-800">
                    {formatToman(order.totalAmountToman)}
                  </span>
                </div>

                <Link href={`/orders/${order.id}/receipt`}>
                  <Button size="sm" variant="secondary">
                    مشاهده رسید و فاکتور
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
