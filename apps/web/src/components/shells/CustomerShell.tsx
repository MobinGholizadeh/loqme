"use client";
import { MarketFooter } from "./MarketFooter";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Map,
  ShoppingBag,
  UserRound,
  ArrowUpLeft,
  Bell,
  Settings,
} from "lucide-react";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { useSession } from "@/components/auth/SessionProvider";
import { NotificationsModal } from "@/components/profile/NotificationsModal";
import { SettingsModal } from "@/components/profile/SettingsModal";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const onOpenSettings = () => setSettingsOpen(true);
    const onOpenNotifications = () => setNotificationsOpen(true);
    window.addEventListener("loqme:open-settings", onOpenSettings);
    window.addEventListener("loqme:open-notifications", onOpenNotifications);
    return () => {
      window.removeEventListener("loqme:open-settings", onOpenSettings);
      window.removeEventListener("loqme:open-notifications", onOpenNotifications);
    };
  }, []);

  const { user, status, refresh } = useSession();
  const authenticated = status === "authenticated";
  const role = user?.role;
  const portal =
    role === "ADMIN"
      ? { href: "/admin", label: "پنل مدیریت" }
      : role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF"
        ? { href: "/merchant", label: "پنل فروشگاه" }
        : null;

  const items = [
    { href: "/", label: "کشف لقمه", icon: Compass, active: pathname === "/" },
    {
      href: "/explore",
      label: "اطراف من",
      icon: Map,
      active: pathname === "/explore",
    },
    {
      href: "/orders",
      label: "سفارش‌های من",
      icon: ShoppingBag,
      active: pathname.startsWith("/orders"),
    },
    {
      href: "/profile",
      label: "حساب من",
      icon: UserRound,
      active: pathname === "/profile",
    },
  ];

  const isProfile = pathname === "/profile";

  return (
    <div className="customer-shell" data-session={status}>
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>

      {isProfile ? (
        <header
          className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 transition-all"
          data-scrolled={scrolled}
        >
          <div className="max-w-[440px] lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between w-full">
            {/* Quick Action / Notification */}
            <button
              aria-label="اعلانات"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-loqme-800 hover:bg-slate-100/80 active:scale-95 transition-all relative"
              type="button"
              onClick={() => setNotificationsOpen(true)}
              title="پیام‌ها و اعلان‌ها"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 left-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
              <span className="sr-only">پیام‌ها</span>
            </button>

            {/* Brand Logo / Emblem (Centered Stacked Logo) */}
            <Link
              href="/"
              className="brand-link flex flex-col items-center justify-center gap-[3px] no-underline select-none"
              aria-label="لقمه، صفحه اصلی"
            >
              <LoqmeLogo size={38} variant="icon" />
              <span
                className="header-brand-name"
                lang="en"
              >
                Loqme
              </span>
            </Link>

            {/* Settings Button */}
            <button
              aria-label="تنظیمات"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-loqme-800 hover:bg-slate-100/80 active:scale-95 transition-all"
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="تنظیمات حساب کاربری"
            >
              <Settings size={20} />
              <span className="sr-only">تنظیمات</span>
            </button>
          </div>
        </header>
      ) : (
        <header className="market-header" data-scrolled={scrolled}>
          <div className="market-header-inner">
            <Link href="/" className="brand-link" aria-label="لقمه، صفحه اصلی">
              <LoqmeLogo size={38} variant="icon" />
              <span className="header-brand-name" lang="en">Loqme</span>
            </Link>
            <nav aria-label="منوی اصلی" className="desktop-nav">
              {items.slice(0, 3).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                >
                  <item.icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="header-actions">
              {(status === "anonymous" ||
                (authenticated && role === "CUSTOMER")) && (
                <Link
                  href="/business"
                  className="action-link business-entry-link"
                >
                  <span className="header-label-full">ثبت نام / ورود کسب و کار</span>
                  <span className="header-label-compact">کسب‌وکار</span>
                </Link>
              )}
              {portal && (
                <Link href={portal.href} className="merchant-link">
                  {portal.label} <ArrowUpLeft size={16} />
                </Link>
              )}
              {status === "loading" ? (
                <span
                  className="action-link min-w-32"
                  aria-label="در حال بررسی حساب"
                  aria-busy="true"
                >
                  <UserRound size={18} />
                  <span className="animate-shimmer h-4 w-20 rounded" />
                </span>
              ) : status === "unavailable" ? (
                <button
                  className="action-link"
                  title="بررسی دوباره حساب"
                  onClick={refresh}
                >
                  <UserRound size={18} />
                  حساب کاربری
                </button>
              ) : (
                <Link
                  href={authenticated ? "/profile" : "/login"}
                  className="action-link"
                >
                  <UserRound size={18} />
                  <span className="header-label-full">
                    {authenticated ? "حساب من" : "ثبت نام / ورود مشتری"}
                  </span>
                  <span className="header-label-compact">
                    {authenticated ? "حساب من" : "ورود"}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      {status === "anonymous" && !isProfile && (
        <Link
          className="mobile-verification-notice"
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
        >
          <UserRound size={20} aria-hidden="true" />
          <span>ورود و تأیید شماره همراه</span>
          <ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
      )}

      <main id="main-content" className="customer-main" tabIndex={-1}>
        {children}
      </main>

      <MarketFooter portal={portal} />

      <nav aria-label="منوی موبایل" className="mobile-tabs">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
          >
            <item.icon size={22} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Notifications and Settings Modals */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialUser={user}
        onUserUpdate={(updated) => {
          refresh();
          window.dispatchEvent(
            new CustomEvent("loqme:user-updated", { detail: updated })
          );
        }}
      />
    </div>
  );
}
