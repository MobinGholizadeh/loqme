"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  ShoppingBag,
  Store,
  FileText,
  LogOut,
  ArrowLeft,
  Calendar,
  Utensils,
  Pencil,
  Plus,
  ShieldAlert,
  Leaf,
  Headphones,
} from "lucide-react";
import { CustomerOrderSummaryDto } from "@loqme/types";
import { HeartbeatLoading } from "@/components/ui/HeartbeatLoading";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { clearBusinessDraft } from "@/lib/business/draft";

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
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await response.json();
        if (!response.ok) throw new Error();
        if (!active) return;
        if (session.user) {
          try {
            const saved = localStorage.getItem("loqme-user-settings-v1");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.fullName) session.user.fullName = parsed.fullName;
            }
          } catch {
            // ignore
          }
        }
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

    const onUserUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ fullName: string }>;
      if (custom.detail?.fullName) {
        setUser((prev) => (prev ? { ...prev, fullName: custom.detail.fullName } : null));
      }
    };
    window.addEventListener("loqme:user-updated", onUserUpdated);

    return () => {
      active = false;
      window.removeEventListener("loqme:user-updated", onUserUpdated);
    };
  }, [retry]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) throw new Error();
      clearBusinessDraft();
      // A full navigation clears authenticated client/provider state after logout.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch {
      setError(true);
    }
  };

  if (loading) return <HeartbeatLoading />;
  if (error) return <ErrorState onRetry={() => setRetry((r) => r + 1)} />;
  if (!user)
    return (
      <div className="w-full max-w-[440px] lg:max-w-6xl xl:max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title="حساب شما در لقمه"
          description="برای دیدن حساب و سفارش‌ها وارد شوید"
          action={
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center mt-3">
              <Link href="/login?redirect=/profile" className="action-link">
                ورود / ثبت‌نام
              </Link>
              <Link href="/business/login" className="action-link secondary">
                <Store size={18} aria-hidden="true" />
                ورود / ثبت‌نام کسب‌وکار
              </Link>
            </div>
          }
        />
      </div>
    );

  const roleBadge =
    user.role === "ADMIN"
      ? {
          label: "مدیر سامانه",
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
        }
      : user.role === "MERCHANT_OWNER"
        ? {
            label: "مدیر فروشگاه",
            badgeClass: "bg-teal-50 text-teal-700 border-teal-200/60",
          }
        : user.role === "MERCHANT_STAFF"
          ? {
              label: "همکار فروشگاه",
              badgeClass: "bg-teal-50 text-teal-700 border-teal-200/60",
            }
          : {
              label: "مشتری",
              badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
            };

  const portalItem =
    user.role === "ADMIN"
      ? {
          href: "/admin",
          icon: ShieldAlert,
          title: "مدیریت سامانه",
          subtitle: "پنل نظارت و ادمین",
          iconBg: "bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700",
          titleHover: "group-hover:text-indigo-800",
        }
      : user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF"
        ? {
            href: "/merchant",
            icon: Store,
            title: "پنل فروشگاه",
            subtitle: "پیشخوان فروشندگان",
            iconBg: "bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700",
            titleHover: "group-hover:text-indigo-800",
          }
        : {
            href: "/business/login",
            icon: Store,
            title: "ورود کسب‌وکار",
            subtitle: "پنل ویژه فروشندگان",
            iconBg: "bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700",
            titleHover: "group-hover:text-indigo-800",
          };

  return (
    <div className="w-full max-w-[440px] lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20">
      <div className="profile-desktop-grid">
        {/* BEGIN: UserProfileSection (Area: user) */}
        <section
          className="area-user bg-white rounded-3xl p-5 border border-slate-100 shadow-soft relative overflow-hidden"
          data-purpose="user-card"
        >
          {/* Subtle decorative leaf background glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-teal-50 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4 relative">
            {/* Avatar with dynamic status ring */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-100 to-teal-50 border-2 border-loqme-600/30 p-1 flex items-center justify-center text-loqme-800 shadow-inner">
                <UserRound className="w-8 h-8 text-loqme-700" />
              </div>
              {/* Verified check icon */}
              <span
                className="absolute bottom-0 right-0 w-5 h-5 bg-loqme-700 text-white rounded-full flex items-center justify-center ring-2 ring-white text-[11px] font-bold"
                aria-label="تأیید شده"
              >
                ✓
              </span>
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-extrabold text-slate-800 truncate tracking-tight">
                  {user.fullName || "کاربر لقمه"}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge.badgeClass}`}
                >
                  {roleBadge.label}
                </span>
              </div>
              <p
                dir="ltr"
                className="text-sm font-medium text-slate-500 tracking-wider text-right inline-block"
              >
                {toPersianDigits(user.mobile)}
              </p>
            </div>

            {/* Edit Profile Quick Action */}
            <RippleButton
              aria-label="ویرایش مشخصات"
              className="shrink-0 w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 hover:text-loqme-800 hover:bg-slate-100 active:scale-95 transition-all"
              type="button"
              title="ویرایش مشخصات"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("loqme:open-settings"));
              }}
            >
              <Pencil className="w-4 h-4" />
            </RippleButton>
          </div>

          {/* Mini Stats Summary */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50/70 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>نجات‌یافته از هدررفت:</span>
              <span className="font-bold text-slate-800 mr-auto">
                {toPersianDigits(orders.length)} بسته
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50/70 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-loqme-600" />
              <span>کیف پول:</span>
              <span className="font-bold text-slate-800 mr-auto">۰ ت</span>
            </div>
          </div>
        </section>
        {/* END: UserProfileSection */}

        {/* BEGIN: QuickActionsGrid (Area: actions) */}
        <section aria-label="دسترسی‌های سریع" data-purpose="quick-actions-hub" className="area-actions">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Action 1: My Orders */}
            <Link
              href="/orders"
              className="group bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-card hover:border-loqme-300 hover:shadow-soft transition-all flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 group-hover:bg-teal-100 text-loqme-700 flex items-center justify-center transition-colors">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70">
                  {toPersianDigits(orders.length)} سفارش
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-loqme-800">
                  سفارش‌های من
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">مشاهده تاریخچه و فاکتورها</p>
              </div>
            </Link>

            {/* Action 2: Merchant / Admin Portal */}
            <Link
              href={portalItem.href}
              className="group bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-card hover:border-loqme-300 hover:shadow-soft transition-all flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${portalItem.iconBg}`}
                >
                  <portalItem.icon className="w-5 h-5" />
                </div>
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
              <div>
                <h3 className={`text-sm font-bold text-slate-800 ${portalItem.titleHover}`}>
                  {portalItem.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{portalItem.subtitle}</p>
              </div>
            </Link>

            {/* Action 3: Track Business Request */}
            <Link
              href="/business/status"
              className="group bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-card hover:border-loqme-300 hover:shadow-soft transition-all flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 group-hover:bg-sky-100 text-sky-700 flex items-center justify-center transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-sky-800">
                  پیگیری درخواست
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">استعلام ثبت فروشگاه</p>
              </div>
            </Link>

            {/* Action: Support Chat */}
            <Link
              href="/support"
              className="group bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-card hover:border-[#1D616A]/50 hover:shadow-soft transition-all flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 group-hover:bg-teal-100 text-[#1D616A] flex items-center justify-center transition-colors">
                  <Headphones className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#1D616A]">
                  پشتیبانی و ارتباط با لقمه
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">گفتگوی زنده با پشتیبانی</p>
              </div>
            </Link>

            {/* Action 4: Logout */}
            <RippleButton
              aria-label="خروج از حساب"
              className="group bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-card hover:border-rose-200 hover:bg-rose-50/20 text-right transition-all flex flex-col justify-between active:scale-[0.98] w-full"
              type="button"
              onClick={handleLogout}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-rose-100 text-slate-600 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 group-hover:text-rose-700">
                  خروج از حساب
                </h3>
                <p className="text-[11px] text-loqme-neutral-600 mt-0.5">پایان نشست فعلی</p>
              </div>
            </RippleButton>
          </div>
        </section>
        {/* END: QuickActionsGrid */}

        {/* BEGIN: BusinessPromoBanner (Area: promo) */}
        <section
          className="area-promo relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-50 via-teal-100/60 to-emerald-100/40 p-5 border border-teal-200/80 shadow-soft"
          data-purpose="merchant-onboarding-cta"
        >
          {/* Floating decorative shape */}
          <div className="absolute -left-6 -bottom-6 w-28 h-28 bg-loqme-200/50 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-loqme-800 text-white flex items-center justify-center shrink-0 shadow-md shadow-loqme-900/15">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                  {user.role === "ADMIN"
                    ? "سامانه مدیریت کلان لقمه"
                    : user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF"
                      ? "پیشخوان مدیریت فروشگاه"
                      : "صاحب کسب‌وکار یا فروشگاه هستید؟"}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {user.role === "ADMIN"
                    ? "بررسی و تأیید درخواست‌های ثبت کسب‌وکار، نظارت بر تراکنش‌ها و تنظیمات سامانه"
                    : user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF"
                      ? "مدیریت بسته‌های مازاد، بررسی سفارش‌های آماده تحویل و تأیید کدهای تحویل حضوری"
                      : "فروشگاه یا رستوران خود را در لقمه ثبت کنید و بسته‌های مازاد باکیفیت را به مشتریان محله بفروشید"}
                </p>
              </div>
            </div>

            {/* Main CTA Button */}
            <Link
              href={
                user.role === "ADMIN"
                  ? "/admin"
                  : user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF"
                    ? "/merchant"
                    : "/business/login"
              }
              className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-loqme-800 hover:bg-loqme-900 text-white font-bold text-sm py-3 px-5 rounded-2xl shadow-lg shadow-loqme-900/20 active:scale-[0.98] transition-all group"
            >
              <Plus className="w-4 h-4 text-teal-300" />
              <span>
                {user.role === "ADMIN"
                  ? "ورود به پنل مدیریت سامانه"
                  : user.role === "MERCHANT_OWNER" || user.role === "MERCHANT_STAFF"
                    ? "ورود به پنل مدیریت فروشگاه"
                    : "ثبت‌نام و ورود کسب‌وکار"}
              </span>
              <ArrowLeft className="w-4 h-4 mr-auto group-hover:-translate-x-1 transition-transform" />
            </Link>

            {/* Secondary Link for CUSTOMER */}
            {user.role === "CUSTOMER" && (
              <div className="mt-3 text-center">
                <Link
                  href="/business/status"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-loqme-800 hover:text-loqme-950 transition-colors py-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>پیگیری وضعیت درخواست ثبت‌نام</span>
                </Link>
              </div>
            )}
          </div>
        </section>
        {/* END: BusinessPromoBanner */}

        {/* BEGIN: Desktop Impact Card (Area: impact - Desktop Exclusive) */}
        <div
          className="hidden lg:block area-impact bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white rounded-3xl p-5 border border-emerald-100/80 shadow-soft"
          data-purpose="eco-impact-summary"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                اثرگذاری شما در محله
              </h3>
              <p className="text-[11px] text-slate-500">
                سفیر پایداری و کاهش ضایعات غذا
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            با خرید بسته‌های مازاد باکیفیت، علاوه بر خریدی هوشمندانه و اقتصادی به رونق کسب‌وکارهای محلی و کاهش هدررفت غذا در شهر کمک می‌کنید
          </p>
          <div className="mt-4 pt-3.5 border-t border-emerald-100/60 flex items-center justify-between text-[11px] font-semibold text-emerald-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ردپای سبز لقمه
            </span>
            <span className="bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-emerald-800 text-[10px]">
              عضو فعال
            </span>
          </div>
        </div>
        {/* END: Desktop Impact Card */}

        {/* BEGIN: RecentOrdersSection (Area: orders) */}
        <section data-purpose="recent-orders-list" className="area-orders space-y-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              سفارش‌های اخیر
              <span className="w-2 h-2 rounded-full bg-loqme-600" />
            </h2>
            {orders.length > 0 && (
              <Link
                href="/orders"
                className="text-xs font-semibold text-loqme-700 hover:text-loqme-900 transition-colors flex items-center gap-1"
              >
                <span>مشاهده همه ({toPersianDigits(orders.length)})</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {orders.length > 0 ? (
            orders.slice(0, 6).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}/receipt`}
                className="block bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card hover:shadow-soft transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    {/* Food Pack Icon */}
                    <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">
                        {order.listingTitleFa}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {order.merchantNameFa}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center text-[11px] text-loqme-neutral-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 ml-1 text-slate-400" />
                          {new Intl.DateTimeFormat("fa-IR", {
                            dateStyle: "medium",
                          }).format(new Date(order.createdAt))}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          تحویل شده
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Details Chevron */}
                  <div className="text-left shrink-0">
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatToman(order.totalAmountToman)}
                    </div>
                    <div className="mt-3 flex justify-end text-slate-400 hover:text-loqme-800 transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState
              title="اولین لقمه شما در راه است"
              description="بسته‌های محله را ببینید و طعم تازه‌ای کشف کنید"
              action={
                <Link href="/" className="action-link">
                  کشف بسته‌ها
                </Link>
              }
            />
          )}
        </section>
        {/* END: RecentOrdersSection */}
      </div>
    </div>
  );
}
