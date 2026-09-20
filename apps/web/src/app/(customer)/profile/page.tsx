"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound, LogOut, ArrowLeft, ShoppingBag, Store } from "lucide-react";
import { CustomerOrderSummaryDto } from "@loqme/types";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
export default function ProfilePage() {
  const [user, setUser] = useState<{
    fullName?: string;
    mobile: string;
    role: string;
  } | null>(null);
  const [orders, setOrders] = useState<CustomerOrderSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch("/api/auth/session");
        const session = await response.json();
        if (!response.ok) throw new Error();
        if (!active) return;
        setUser(session.user);
        if (session.authenticated) {
          const r = await fetch("/api/orders");
          const data = await r.json();
          if (!r.ok && r.status !== 404) throw new Error();
          if (active) setOrders(data.data || []);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [retry]);
  if (loading) return <HeartbeatLoading />;
  if (error) return <ErrorState onRetry={() => setRetry((r) => r + 1)} />;
  if (!user)
    return (
      <EmptyState
        title="حساب شما در لقمه"
        description="برای دیدن حساب و سفارش‌ها وارد شوید."
        action={
          <Link href="/login?redirect=/profile" className="action-link">
            ورود / ثبت‌نام
          </Link>
        }
      />
    );
  return (
    <div className="profile-layout">
      <aside>
        <div className="profile-identity">
          <span className="avatar">
            <UserRound size={22} />
          </span>
          <h1>{user.fullName || "حساب من"}</h1>
          <p dir="ltr" className="text-right">
            {toPersianDigits(user.mobile)}
          </p>
        </div>
        <nav className="profile-links">
          <Link href="/orders" className="action-link secondary">
            <ShoppingBag size={18} />
            سفارش‌های من
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="action-link secondary">
              مدیریت سامانه
            </Link>
          ) : (
            user.role !== "CUSTOMER" && (
              <Link href="/merchant" className="action-link secondary">
                <Store size={18} />
                پنل فروشگاه
              </Link>
            )
          )}
          <button
            className="action-link secondary"
            onClick={async () => {
              try {
                const response = await fetch("/api/auth/logout", {
                  method: "POST",
                });
                if (!response.ok) throw new Error();
                sessionStorage.removeItem('loqme-business-draft-v1');
                window.location.assign("/");
              } catch {
                setError(true);
              }
            }}
          >
            <LogOut size={18} />
            خروج از حساب
          </button>
        </nav>
      </aside>
      <section>
        <div className="section-heading">
          <h2>سفارش‌های اخیر</h2>
          <span>{toPersianDigits(orders.length)} سفارش</span>
        </div>
        {orders.length ? (
          orders.slice(0, 6).map((order) => (
            <Link
              className="profile-order"
              key={order.id}
              href={`/orders/${order.id}/receipt`}
            >
              <div>
                <h3>{order.listingTitleFa}</h3>
                <p>
                  {order.merchantNameFa} ·{" "}
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium",
                  }).format(new Date(order.createdAt))}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <strong className="text-sm text-loqme-primary-700">
                  {formatToman(order.totalAmountToman)}
                </strong>
                <ArrowLeft size={18} />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState
            title="اولین لقمه شما در راه است"
            description="بسته‌های محله را ببینید و طعم تازه‌ای کشف کنید."
            action={
              <Link href="/" className="action-link">
                کشف بسته‌ها
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
