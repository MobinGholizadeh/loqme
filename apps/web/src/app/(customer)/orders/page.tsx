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
import { CustomerPickupPassModal } from '@/components/pickup/CustomerPickupPassModal';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { ComplaintModal } from '@/components/complaints/ComplaintModal';

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [passOrderId, setPassOrderId] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<CustomerOrderSummaryDto | null>(null);
  const [complaintOrder, setComplaintOrder] = useState<CustomerOrderSummaryDto | null>(null);

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

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {(order.status === 'READY_FOR_PICKUP' || order.status === 'PAID') && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="gap-1 shadow-xs"
                      onClick={() => setPassOrderId(order.id)}
                    >
                      <span>📱</span>
                      <span>کارت و بارکد تحویل</span>
                    </Button>
                  )}

                  {order.status === 'COMPLETED' && (
                    <>
                      {order.hasReview ? (
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1">
                          <span>★</span>
                          <span>نظر شما ثبت شده</span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewOrder(order)}
                          className="text-teal-700 border-teal-600 hover:bg-teal-50 text-xs"
                        >
                          ★ ثبت نظر و امتیاز
                        </Button>
                      )}
                    </>
                  )}

                  {/* Complaint / Dispute button for paid or completed orders */}
                  {(order.status === 'COMPLETED' || order.status === 'READY_FOR_PICKUP' || order.status === 'PAID') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setComplaintOrder(order)}
                      className="text-gray-500 hover:text-rose-700 hover:bg-rose-50 text-xs"
                      title="گزارش مغایرت، فاسد بودن یا مشکل بسته"
                    >
                      🛡️ ثبت گزارش
                    </Button>
                  )}

                  <Link href={`/orders/${order.id}/receipt`}>
                    <Button size="sm" variant="secondary">
                      رسید و فاکتور
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Pickup Pass Modal */}
      {passOrderId && (
        <CustomerPickupPassModal
          orderId={passOrderId}
          isOpen={Boolean(passOrderId)}
          onClose={() => setPassOrderId(null)}
          onVerified={() => {
            // refresh orders
            fetch('/api/orders')
              .then((r) => r.json())
              .then((d) => {
                if (d.success) setOrders(d.data || []);
              });
          }}
        />
      )}

      {/* Verified Customer Review Modal */}
      {reviewOrder && (
        <ReviewModal
          isOpen={Boolean(reviewOrder)}
          onClose={() => setReviewOrder(null)}
          orderId={reviewOrder.id}
          orderNumber={reviewOrder.orderNumber}
          merchantName={reviewOrder.merchantNameFa}
          onSuccess={() => {
            fetch('/api/orders')
              .then((r) => r.json())
              .then((d) => {
                if (d.success) setOrders(d.data || []);
              });
          }}
        />
      )}

      {/* Customer Complaint / Dispute Modal */}
      {complaintOrder && (
        <ComplaintModal
          isOpen={Boolean(complaintOrder)}
          onClose={() => setComplaintOrder(null)}
          orderId={complaintOrder.id}
          orderNumber={complaintOrder.orderNumber}
          merchantName={complaintOrder.merchantNameFa}
          onSuccess={() => {
            fetch('/api/orders')
              .then((r) => r.json())
              .then((d) => {
                if (d.success) setOrders(d.data || []);
              });
          }}
        />
      )}
    </div>
  );
}
