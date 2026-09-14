"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Map,
  ShoppingBag,
  UserRound,
  ArrowUpLeft,
} from "lucide-react";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import type { UserRole } from "@loqme/types";
export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const portal =
    role === "ADMIN"
      ? { href: "/admin", label: "پنل مدیریت" }
      : role === "MERCHANT_OWNER" || role === "MERCHANT_STAFF"
        ? { href: "/merchant", label: "پنل فروشگاه" }
        : null;
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setAuthenticated(Boolean(data.authenticated));
          setRole(data.authenticated ? (data.user?.role ?? null) : null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);
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
  return (
    <div className="customer-shell">
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <header className="market-header">
        <div className="market-header-inner">
          <Link href="/" className="brand-link">
            <LoqmeLogo size="md" variant="horizontal" />
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
            {portal && (
              <Link href={portal.href} className="merchant-link">
                {portal.label} <ArrowUpLeft size={16} />
              </Link>
            )}
            <Link
              href={authenticated ? "/profile" : "/login"}
              className="action-link"
            >
              <UserRound size={18} />
              {authenticated ? "حساب من" : "ورود / ثبت‌نام"}
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" className="customer-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="market-footer">
        <div className="market-footer-inner">
          <div>
            <LoqmeLogo size="md" variant="horizontal" />
            <p>کشف خوراکی‌های تازه، خرید هوشمندانه از محله.</p>
          </div>
          <nav aria-label="پیوندهای پایین صفحه">
            <Link href="/explore">کاوش بسته‌ها</Link>
            <Link href="/orders">پیگیری سفارش</Link>
            {portal && <Link href={portal.href}>{portal.label}</Link>}
          </nav>
          <span>لقمه · loqme.shop</span>
        </div>
      </footer>
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
    </div>
  );
}
