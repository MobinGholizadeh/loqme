"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/components/auth/SessionProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  ScanLine,
  Wallet,
  Settings,
  ChartNoAxesCombined,
  ShieldCheck,
  MessageSquareWarning,
  LogOut,
  ArrowUpLeft,
  Menu,
  Search,
  Bell,
  Zap,
  X,
  Plus,
  HelpCircle,
  Headphones,
  ChevronsRight,
  Loader2,
  Tag,
} from "lucide-react";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { NotificationsModal } from "@/components/profile/NotificationsModal";
import { Modal } from "@/components/ui/Modal";
import { BlurFade } from "@/components/magicui/blur-fade";
import { toPersianDigits, formatToman } from "@/lib/utils/persian";

interface PortalNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  badge?: string;
}

const merchantItems: PortalNavItem[] = [
  { href: "/merchant", label: "داشبورد و نمای کلی", icon: LayoutDashboard },
  { href: "/merchant/listings", label: "بسته‌های مازاد", icon: Package },
  { href: "/merchant/orders", label: "سفارش‌ها و تحویل", icon: ScanLine },
  { href: "/merchant/discounts", label: "تخفیف‌ها و کوپن", icon: Tag },
  { href: "/merchant/finance", label: "جریان مالی و تسویه", icon: Wallet },
  { href: "/merchant/insights", label: "گزارش و بینش فروش", icon: ChartNoAxesCombined },
  { href: "/merchant/support", label: "پشتیبانی لقمه", icon: Headphones },
  { href: "/merchant/staff", label: "همکاران و دسترسی", icon: Users },
  { href: "/merchant/settings", label: "تنظیمات فروشگاه", icon: Settings },
];

const adminItems: PortalNavItem[] = [
  { href: "/admin", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "تحلیل بازار", icon: ChartNoAxesCombined },
  { href: "/admin/discounts", label: "کمپین‌ها و تخفیف‌ها", icon: Tag },
  { href: "/admin/merchants", label: "فروشگاه‌ها", icon: Store },
  { href: "/admin/customers", label: "مشتریان", icon: Users },
  { href: "/admin/listings", label: "بسته‌ها و دسته‌بندی", icon: Package },
  { href: "/admin/support", label: "پشتیبانی و گفتگوها", icon: Headphones },
  {
    href: "/admin/moderation",
    label: "شکایت‌ها و بررسی",
    icon: MessageSquareWarning,
  },
  { href: "/admin/finance", label: "مالی و تسویه", icon: Wallet },
  { href: "/admin/reconciliation", label: "پیگیری پرداخت", icon: ShieldCheck },
  { href: "/admin/audit", label: "گزارش حسابرسی", icon: ShieldCheck },
  { href: "/admin/settings", label: "تنظیمات سامانه", icon: Settings },
];

export function PortalShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "merchant" | "admin";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [proDismissed, setProDismissed] = useState(false);
  const [contexts, setContexts] = useState<Array<{ id: string; nameFa: string; role: string }>>([]);
  const [activeMerchantId, setActiveMerchantId] = useState<string>('');
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    const handleNotifCount = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setUnreadNotifCount(customEvent.detail);
      }
    };
    window.addEventListener("loqme:notifications-count", handleNotifCount);
    return () => window.removeEventListener("loqme:notifications-count", handleNotifCount);
  }, []);
  const [supportCount, setSupportCount] = useState<number | null>(null);

  // Quick Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    orders: Array<{ id: string; orderNumber: string; customerName: string; totalAmountToman: number; status: string; href: string }>;
    listings: Array<{ id: string; title: string; discountedPriceToman: number; originalPriceToman: number; status: string; href: string }>;
    staff: Array<{ id: string; name: string; role: string; mobile: string; href: string }>;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = activeMerchantId
          ? `/api/merchant/search?q=${encodeURIComponent(q)}&merchantId=${encodeURIComponent(activeMerchantId)}`
          : `/api/merchant/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.results) {
            setSearchResults(json.results);
            setIsSearchOpen(true);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeMerchantId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSupportBadge = useCallback(async (signal?: AbortSignal) => {
    try {
      const url = activeMerchantId
        ? `/api/support/badge?merchantId=${encodeURIComponent(activeMerchantId)}`
        : "/api/support/badge";
      const res = await fetch(url, { signal });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setSupportCount(json.data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  }, [activeMerchantId]);

  const fetchOrdersCount = useCallback(async (signal?: AbortSignal) => {
    if (role !== "merchant") return;
    try {
      const url = activeMerchantId
        ? `/api/merchant/pickup/queue?merchantId=${encodeURIComponent(activeMerchantId)}`
        : "/api/merchant/pickup/queue";
      const res = await fetch(url, { signal });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const readyCount = json.data.filter(
          (o: any) => o.status === "READY_FOR_PICKUP" || o.status === "PAID"
        ).length;
        setOrdersCount(readyCount);
      }
    } catch {
      // ignore abort or network issues silently
    }
  }, [role, activeMerchantId]);

  useEffect(() => {
    if (role !== "merchant") return;
    const controller = new AbortController();
    fetchOrdersCount(controller.signal);
    fetchSupportBadge(controller.signal);

    const interval = setInterval(() => {
      fetchOrdersCount();
      fetchSupportBadge();
    }, 15000);

    const handleCountEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setOrdersCount(customEvent.detail);
      }
    };

    const handleRefresh = () => {
      fetchOrdersCount();
    };

    window.addEventListener("loqme:orders-count", handleCountEvent);
    window.addEventListener("loqme:order-updated", handleRefresh);

    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("loqme:orders-count", handleCountEvent);
      window.removeEventListener("loqme:order-updated", handleRefresh);
    };
  }, [fetchOrdersCount, fetchSupportBadge, role, pathname]);

  useEffect(() => {
    if (role !== 'merchant') return;
    const controller = new AbortController();
    fetch('/api/merchant/contexts', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setContexts(res.data);
          const cookieMatch = typeof document !== 'undefined'
            ? document.cookie
                .split('; ')
                .find((row) => row.startsWith('loqme_active_merchant='))
            : null;
          const currentCookie = cookieMatch ? cookieMatch.split('=')[1] : '';
          const valid = res.data.some((c: any) => c.id === currentCookie);
          const chosen = valid ? currentCookie : res.data[0].id;
          setActiveMerchantId(chosen);
          if (typeof document !== 'undefined' && chosen !== currentCookie) {
            document.cookie = `loqme_active_merchant=${chosen}; path=/; max-age=2592000; SameSite=Lax`;
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [role]);

  const handleSwitchStore = (newId: string) => {
    setActiveMerchantId(newId);
    if (typeof document !== 'undefined') {
      document.cookie = `loqme_active_merchant=${newId}; path=/; max-age=2592000; SameSite=Lax`;
      window.location.reload();
    }
  };

  const items = (role === "admin" ? adminItems : merchantItems)
    .filter(
      (item) =>
        user?.role !== "MERCHANT_STAFF" ||
        ["/merchant", "/merchant/listings", "/merchant/orders"].includes(
          item.href,
        ),
    )
    .map((item) => {
      if ((item.href === "/merchant/support" || item.href === "/admin/support") && typeof supportCount === "number" && supportCount > 0) {
        return {
          ...item,
          badge: supportCount > 99 ? "+۹۹" : toPersianDigits(supportCount),
        };
      }
      if (item.href === "/merchant/orders" && typeof ordersCount === "number" && ordersCount > 0) {
        return {
          ...item,
          badge: ordersCount > 99 ? "+۹۹" : toPersianDigits(ordersCount),
        };
      }
      return item;
    });

  const title = role === "admin" ? "مدیریت لقمه" : "پنل فروشگاه";
  const isActive = (href: string) => pathname === href || (href !== `/${role}` && pathname.startsWith(href + "/"));

  const navigation = (
    <nav aria-label={title} className="portal-nav space-y-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              active
                ? "bg-[#EFF7F4] text-[#174F56] border border-[#1D616A] shadow-xs font-bold"
                : "text-slate-600 hover:text-[#174F56] hover:bg-[#EFF7F4]"
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className={active ? "text-[#1D616A]" : "text-slate-500"} aria-hidden="true" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                className={`${
                  active
                    ? "bg-white text-[#1D616A] border border-[#BCD8D1]"
                    : "bg-[#EFF7F4] text-[#1D616A] border border-[#BCD8D1]"
                } text-[10px] font-bold px-2 py-0.5 rounded-full`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}

      {role === "merchant" && (
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
          <Link
            href="/about"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-[#174F56] hover:bg-[#EFF7F4] transition-colors"
          >
            <HelpCircle size={18} className="text-slate-400" />
            <span>راهنما و قوانین</span>
          </Link>
        </div>
      )}
    </nav>
  );

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch {
      setLogoutError(true);
    }
  }

  const activeStoreName = contexts.find((c) => c.id === activeMerchantId)?.nameFa || user?.fullName || title;

  return (
    <div className={`portal-shell ${role}-shell`} dir="rtl">
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>

      {/* Modern Sidebar */}
      <aside className="portal-sidebar flex flex-col justify-between">
        <div>
          <div className="portal-brand flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <Link href={`/${role}`} className="flex items-center gap-2.5">
              <LoqmeLogo size={34} variant="icon" theme="teal" />
              <div className="text-right">
                <span className="font-black text-sm tracking-tight text-slate-900 block">لقــمه</span>
                <span className="text-[10px] font-bold text-teal-700 block">{title}</span>
              </div>
            </Link>
          </div>

          <div className="p-3">
            {navigation}
          </div>
        </div>

        {/* Sidebar Bottom Widgets */}
        <div className="p-3.5 space-y-3">
          {/* Pro Upgrade Box */}
          {role === "merchant" && !proDismissed && (
            <div className="bg-[#F8FAF9] border border-[#CDDCD6] rounded-2xl p-3.5 relative text-right shadow-2xs">
              <button
                type="button"
                onClick={() => setProDismissed(true)}
                className="absolute top-2.5 left-2.5 text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                aria-label="بستن پیشنهاد"
              >
                <X size={13} />
              </button>
              <div className="w-8 h-8 rounded-xl bg-[#EFF7F4] text-[#1D616A] border border-[#BCD8D1] flex items-center justify-center mb-2 shadow-xs">
                <Zap size={15} />
              </div>
              <p className="font-bold text-xs text-slate-900">ارتقا به پنل هوشمند!</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                تحلیل‌های آماری هوش مصنوعی و پیش‌بینی تقاضای محلی
              </p>
              <button
                type="button"
                onClick={() => alert("امکانات نسخه حرفه‌ای لقمه به‌زودی فعال می‌شود")}
                className="portal-action-btn mt-2.5 w-full text-[11px] font-bold py-1.5 px-3 shadow-xs block text-center"
              >
                ارتقا دهید
              </button>
            </div>
          )}

          <div className="border-t border-slate-100 pt-2 space-y-1">
            <Link
              href="/"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ArrowUpLeft size={16} />
                <span>نمای مشتری</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-right"
            >
              <LogOut size={16} />
              <span>خروج از حساب</span>
            </button>
            {logoutError && <p role="alert" className="text-[10px] text-rose-600 px-3">خروج انجام نشد؛ دوباره تلاش کنید</p>}
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="portal-workspace flex-1 flex flex-col min-w-0">
        {/* Modern Header */}
        <header className="portal-header sticky top-0 z-20 flex items-center justify-between px-6 lg:px-8 py-3.5 bg-white border-b border-slate-200/90 shadow-2xs">
          {/* Right Section: Mobile menu button & Search Input */}
          <div className="flex items-center gap-3 lg:gap-5 flex-1 max-w-lg">
            <RippleButton
              className="icon-button portal-menu-button lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700"
              onClick={() => setMenuOpen(true)}
              aria-label="باز کردن منو"
            >
              <Menu size={20} />
            </RippleButton>

            {/* Quick Search Bar with Live Results Dropdown */}
            <div ref={searchContainerRef} className="relative w-full hidden sm:block">
              <Search
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="جستجوی سریع در سفارش‌ها، بسته‌ها یا مشتریان"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pr-10 pl-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D616A] focus:bg-white transition-all"
              />
              {isSearching ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin">
                  <Loader2 size={14} />
                </div>
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                    setIsSearchOpen(false);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="پاک کردن جستجو"
                >
                  <X size={14} />
                </button>
              ) : null}

              {/* Floating Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim().length >= 2 && searchResults && (
                <div className="absolute top-full mt-2 right-0 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 text-right max-h-96 overflow-y-auto">
                  {searchResults.orders.length === 0 &&
                  searchResults.listings.length === 0 &&
                  searchResults.staff.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      موردی برای «{searchQuery}» یافت نشد
                    </div>
                  ) : (
                    <div className="p-2 space-y-3">
                      {/* Orders */}
                      {searchResults.orders.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                            <ScanLine size={13} className="text-[#1D616A]" />
                            <span>سفارش‌ها</span>
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.orders.map((ord) => (
                              <Link
                                key={ord.id}
                                href={ord.href}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#EFF7F4] transition-colors group"
                              >
                                <div>
                                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#174F56] block">
                                    سفارش {ord.orderNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    {ord.customerName}
                                  </span>
                                </div>
                                <div className="text-left">
                                  <span className="font-black text-xs text-slate-900 block">
                                    {formatToman(ord.totalAmountToman)}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#1D616A] bg-[#EFF7F4] border border-[#BCD8D1] px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                    {ord.status === "COMPLETED"
                                      ? "تحویل شده"
                                      : ord.status === "READY_FOR_PICKUP" || ord.status === "PAID"
                                      ? "آماده تحویل"
                                      : ord.status}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Listings */}
                      {searchResults.listings.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                            <Package size={13} className="text-[#1D616A]" />
                            <span>بسته‌های مازاد</span>
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.listings.map((item) => (
                              <Link
                                key={item.id}
                                href={item.href}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#EFF7F4] transition-colors group"
                              >
                                <div>
                                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#174F56] block">
                                    {item.title}
                                  </span>
                                </div>
                                <div className="text-left">
                                  <span className="font-black text-xs text-slate-900 block">
                                    {formatToman(item.discountedPriceToman)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 line-through block">
                                    {formatToman(item.originalPriceToman)}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff */}
                      {searchResults.staff.length > 0 && (
                        <div>
                          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                            <Users size={13} className="text-[#1D616A]" />
                            <span>همکاران و دسترسی</span>
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {searchResults.staff.map((s) => (
                              <Link
                                key={s.id}
                                href={s.href}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#EFF7F4] transition-colors group"
                              >
                                <div>
                                  <span className="font-bold text-xs text-slate-900 group-hover:text-[#174F56] block">
                                    {s.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block mt-0.5">
                                    {s.mobile}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {s.role === "OWNER" ? "مدیر" : "صندوق‌دار"}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Left Section: Notifications, Settings, Profile Pill & Action Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative w-9 h-9 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="اعلان‌ها و پیام‌ها"
              aria-label="اعلان‌ها"
            >
              <Bell size={17} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                  {unreadNotifCount > 9 ? "+۹" : toPersianDigits(unreadNotifCount)}
                </span>
              )}
            </button>

            {/* Settings Link */}
            <Link
              href={role === "merchant" ? "/merchant/settings" : "/admin/settings"}
              className="w-9 h-9 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="تنظیمات سامانه"
            >
              <Settings size={17} />
            </Link>

            {/* User / Store Profile Pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-bold text-xs shrink-0">
                <Store size={15} />
              </div>
              <div className="text-right hidden md:block">
                {role === "merchant" && contexts.length > 1 ? (
                  <select
                    value={activeMerchantId}
                    onChange={(e) => handleSwitchStore(e.target.value)}
                    className="text-xs font-black text-slate-800 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
                    aria-label="انتخاب فروشگاه"
                  >
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameFa}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-black text-slate-800 block truncate max-w-[140px]">
                    {activeStoreName}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 block font-medium">
                  {user?.role === "MERCHANT_OWNER" ? "مدیر فروشگاه" : "سامانه فروشگاه"}
                </span>
              </div>
            </div>

            {/* Quick Action: Register Listing */}
            {role === "merchant" && (
              <button
                type="button"
                onClick={() => {
                  const trigger = document.getElementById("btn-fast-listing-trigger");
                  if (trigger) {
                    trigger.click();
                  } else {
                    router.push("/merchant/listings");
                  }
                }}
                className="portal-action-btn px-4 py-2 text-xs flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">ثبت بسته</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Body */}
        <main id="main-content" className="portal-main flex-1" tabIndex={-1}>
          <BlurFade key={pathname}>{children}</BlurFade>
        </main>
      </div>

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUnreadCountChange={setUnreadNotifCount}
        role={role}
      />

      {/* Mobile Navigation Drawer Modal */}
      <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title={title}>
        <div className="space-y-4 pt-2">
          {navigation}
          <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
            <Link href="/" className="action-link secondary text-xs text-center">
              نمای مشتری
            </Link>
            <RippleButton className="action-link secondary text-xs text-rose-600 text-center" onClick={logout}>
              خروج از حساب
            </RippleButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
