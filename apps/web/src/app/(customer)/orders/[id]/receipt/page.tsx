"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CircleCheck,
  Clock3,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { CustomerPickupPassModal } from "@/components/pickup/CustomerPickupPassModal";
import { ComplaintModal } from "@/components/complaints/ComplaintModal";

interface OrderReceiptData {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountToman: number;
  commissionAmountToman: number;
  merchantPayoutAmountToman: number;
  merchantConfirmedAt?: string | null;
  isConfirmedByMerchant?: boolean;
  pickupStart?: string | null;
  pickupEnd?: string | null;
  pickupWindowModifiedCount?: number;
  delayReasonFa?: string | null;
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
  const { id: orderId } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/orders/" + orderId);
      const result = await response.json();
      if (!response.ok || !result.success || !result.data)
        throw new Error(result.message || "رسید سفارش دریافت نشد");
      setOrder(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارتباط با سرور برقرار نشد");
    } finally {
      setLoading(false);
    }
  }, [orderId]);
  useEffect(() => {
    load();
  }, [load]);
  if (loading) return <HeartbeatLoading />;
  if (error || !order)
    return (
      <ErrorState
        title="دریافت رسید انجام نشد"
        message={error}
        onRetry={load}
      />
    );
  const canPickup = ["PAID", "READY_FOR_PICKUP"].includes(order.status);
  const completed = order.status === "COMPLETED";
  const refunded = order.status === "REFUNDED";
  const paid = canPickup || completed || order.status === "NO_SHOW" || refunded;
  const statusLabel = completed
    ? "تحویل گرفته شد"
    : refunded
      ? "وجه بازگردانده شد"
      : order.status === "NO_SHOW"
        ? "عدم مراجعه در بازه تحویل"
        : canPickup ? (order.isConfirmedByMerchant ? "تایید شده و آماده تحویل" : "در انتظار تایید رستوران")
          : order.status === "CANCELLED"
            ? "سفارش لغو شد"
            : "در انتظار تایید پرداخت";
  const item = order.items[0];
  const time = (value: string) =>
    new Date(value).toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    });
  return (
    <div className="receipt-layout">
      <div className="receipt-heading">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-loqme-neutral-600"
        >
          <ArrowRight size={18} />
          سفارش‌های من
        </Link>
        <h1>رسید سفارش</h1>
        <p>
          {new Date(order.createdAt).toLocaleDateString("fa-IR", {
            dateStyle: "long",
            timeZone: "Asia/Tehran",
          })}
        </p>
      </div>
      <section className="pickup-ticket">
        <div className="ticket-header">
          <span className="avatar">
            {paid ? <CircleCheck size={24} /> : <Clock3 size={24} />}
          </span>
          <Badge variant={canPickup || completed ? "success" : "neutral"}>
            {statusLabel}
          </Badge>
          <h2>{order.merchant.businessNameFa}</h2>
          <p dir="ltr">{toPersianDigits(order.orderNumber)}</p>
        </div>
        <div className="ticket-body">
          {order.pickupWindowModifiedCount && order.pickupWindowModifiedCount > 0 ? (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-3 text-right">
              <strong className="block text-amber-700">⚠️ بازه تحویل با اعلام تاخیر تمدید گردید:</strong>
              {order.delayReasonFa && (
                <span className="block mt-0.5 text-amber-800">
                  علت تاخیر فروشگاه: {order.delayReasonFa}
                </span>
              )}
            </div>
          ) : !order.isConfirmedByMerchant && canPickup ? (
            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-800 mb-3 text-right">
              سفارش شما با موفقیت پرداخت شد. فروشگاه در حال آماده‌سازی و نهایی‌کردن زمان تحویل است.
            </div>
          ) : null}
          {canPickup ? (
            <>
              <QrCode
                size={64}
                strokeWidth={1.3}
                className="mx-auto text-loqme-primary-700"
                aria-hidden="true"
              />
              <Button
                className="w-full"
                rightIcon={<QrCode size={20} />}
                onClick={() => setShowPass(true)}
              >
                مشاهده بارکد و کد تحویل
              </Button>
              <p className="text-xs text-loqme-neutral-600">
                کد تحویل فقط هنگام مراجعه حضوری به فروشگاه ارائه شود
              </p>
            </>
          ) : (
            <p className="text-sm">
              {completed
                ? "سفارش شما تحویل داده شده است؛ نوش جان!"
                : refunded
                  ? "وضعیت بازگشت وجه در سفارش ثبت شده است"
                  : "کارت تحویل برای وضعیت فعلی سفارش در دسترس نیست"}
            </p>
          )}
        </div>
        {item && (
          <div className="ticket-footer">
            <Clock3 size={19} />
            <div>
              <strong>بازه دریافت حضوری</strong>
              <p>
                {new Date(item.pickupStart).toLocaleDateString("fa-IR", {
                  dateStyle: "medium",
                  timeZone: "Asia/Tehran",
                })}
              </p>
              <p>
                {time(order.pickupStart || item.pickupStart)} تا {time(order.pickupEnd || item.pickupEnd)}
              </p>
            </div>
          </div>
        )}
      </section>
      <div className="receipt-details">
        <section>
          <h2>
            <ReceiptText size={20} />
            جزئیات سفارش
          </h2>
          {order.items.map((entry) => (
            <div key={entry.id} className="receipt-row">
              <div>
                <strong>{entry.titleFa}</strong>
                <p>{toPersianDigits(entry.quantity)} بسته</p>
              </div>
              <span>{formatToman(entry.subtotalToman)}</span>
            </div>
          ))}
          <div className="receipt-row font-bold">
            <span>مبلغ سفارش</span>
            <strong className="text-loqme-primary-700">
              {formatToman(order.totalAmountToman)}
            </strong>
          </div>
          {order.payment && (
            <div className="receipt-row text-xs">
              <span>شناسه مرجع پرداخت</span>
              <span dir="ltr">
                {toPersianDigits(order.payment.referenceId || "ثبت نشده")}
              </span>
            </div>
          )}
        </section>
        <section>
          <h2>
            <MapPin size={20} />
            محل دریافت
          </h2>
          <h3 className="font-bold text-sm">{order.merchant.businessNameFa}</h3>
          <p className="text-sm text-loqme-neutral-600 my-3">
            {order.merchant.addressFa || "نشانی ثبت نشده است"}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              className="action-link secondary"
              href={"/merchants/" + order.merchant.id}
            >
              مشاهده فروشگاه
            </Link>
            {order.merchant.phone && (
              <a
                className="action-link secondary"
                href={"tel:" + order.merchant.phone}
              >
                <Phone size={18} />
                تماس با فروشگاه
              </a>
            )}
          </div>
        </section>
        {paid && (
          <section>
            <h2>
              <ShieldCheck size={20} />
              پیگیری کیفیت سفارش
            </h2>
            <Button variant="outline" onClick={() => setShowComplaint(true)}>
              ثبت گزارش یا شکایت
            </Button>
          </section>
        )}
      </div>
      <CustomerPickupPassModal
        orderId={orderId}
        isOpen={showPass}
        onClose={() => setShowPass(false)}
        onVerified={load}
      />
      <ComplaintModal
        orderId={orderId}
        orderNumber={order.orderNumber}
        merchantName={order.merchant.businessNameFa}
        isOpen={showComplaint}
        onClose={() => setShowComplaint(false)}
        onSuccess={() => setShowComplaint(false)}
      />
    </div>
  );
}
