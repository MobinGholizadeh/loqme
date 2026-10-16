"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import React, { useState } from "react";
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
} from "lucide-react";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";
import { Modal } from "@/components/ui/Modal";
import { BlurFade } from "@/components/magicui/blur-fade";
const merchantItems = [
  { href: "/merchant", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/merchant/listings", label: "بسته‌های فروشگاه", icon: Package },
  { href: "/merchant/orders", label: "سفارش‌ها و تحویل", icon: ScanLine },
  { href: "/merchant/finance", label: "مالی و تسویه", icon: Wallet },
  { href: "/merchant/insights", label: "گزارش و بینش فروش", icon: ChartNoAxesCombined },
  { href: "/merchant/staff", label: "همکاران", icon: Users },
  { href: "/merchant/settings", label: "تنظیمات فروشگاه", icon: Settings },
];
const adminItems = [
  { href: "/admin", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "تحلیل بازار", icon: ChartNoAxesCombined },
  { href: "/admin/merchants", label: "فروشگاه‌ها", icon: Store },
  { href: "/admin/customers", label: "مشتریان", icon: Users },
  { href: "/admin/listings", label: "بسته‌ها و دسته‌بندی", icon: Package },
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
  const items = (role === "admin" ? adminItems : merchantItems).filter(
    (item) =>
      user?.role !== "MERCHANT_STAFF" ||
      ["/merchant", "/merchant/listings", "/merchant/orders"].includes(
        item.href,
      ),
  );
  const title = role === "admin" ? "مدیریت لقمه" : "پنل فروشگاه";
  const isActive = (href: string) => pathname === href || (href !== `/${role}` && pathname.startsWith(href + "/"));
  const navigation = (
    <nav aria-label={title} className="portal-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          <item.icon size={19} aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      ))}
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
  return (
    <div className={`portal-shell ${role}-shell`}>
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <aside className="portal-sidebar">
        <Link href={`/${role}`} className="portal-brand">
          <LoqmeLogo size={38} variant="icon" theme="teal" />
        </Link>
        <p className="portal-label">{title}</p>
        {navigation}
        <div className="portal-sidebar-bottom">
          <Link href="/">
            نمای مشتری <ArrowUpLeft size={17} />
          </Link>
          <RippleButton onClick={logout}>
            <LogOut size={17} />
            خروج از حساب
          </RippleButton>
          {logoutError && <p role="alert">خروج انجام نشد. دوباره تلاش کنید.</p>}
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-header">
          <div className="flex items-center gap-3">
            <RippleButton
              className="icon-button portal-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="باز کردن منو"
            >
              <Menu size={22} />
            </RippleButton>
            <span>
              {items.find((item) => isActive(item.href))?.label || title}
            </span>
          </div>
          <div className="portal-user">
            <span>{user?.fullName || title}</span>
            <span className="avatar">
              <Store size={18} />
            </span>
          </div>
        </header>
        <main id="main-content" className="portal-main" tabIndex={-1}>
          <BlurFade key={pathname}>{children}</BlurFade>
        </main>
      </div>
      <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title={title}>
        {navigation}
        <Link href="/" className="action-link secondary">
          نمای مشتری
        </Link>
        <RippleButton className="action-link secondary mt-3" onClick={logout}>
          خروج از حساب
        </RippleButton>
      </Modal>
    </div>
  );
}
