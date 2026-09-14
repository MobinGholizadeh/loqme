"use client";
import React, { useEffect, useState } from "react";
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
const merchantItems = [
  { href: "/merchant", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/merchant/listings", label: "بسته‌های فروشگاه", icon: Package },
  { href: "/merchant/orders", label: "سفارش‌ها و تحویل", icon: ScanLine },
  { href: "/merchant/finance", label: "مالی و تسویه", icon: Wallet },
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
  const [user, setUser] = useState<{ fullName?: string; role?: string } | null>(
    null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setUser(data.user || null))
      .catch(() => {});
  }, []);
  const items = (role === "admin" ? adminItems : merchantItems).filter(
    (item) =>
      user?.role !== "MERCHANT_STAFF" ||
      ["/merchant", "/merchant/listings", "/merchant/orders"].includes(
        item.href,
      ),
  );
  const title = role === "admin" ? "مدیریت لقمه" : "پنل فروشگاه";
  const navigation = (
    <nav aria-label={title} className="portal-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
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
          <LoqmeLogo size="md" variant="horizontal" />
        </Link>
        <p className="portal-label">{title}</p>
        {navigation}
        <div className="portal-sidebar-bottom">
          <Link href="/">
            نمای مشتری <ArrowUpLeft size={17} />
          </Link>
          <button onClick={logout}>
            <LogOut size={17} />
            خروج از حساب
          </button>
          {logoutError && <p role="alert">خروج انجام نشد. دوباره تلاش کنید.</p>}
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-header">
          <div className="flex items-center gap-3">
            <button
              className="icon-button portal-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="باز کردن منو"
            >
              <Menu size={22} />
            </button>
            <span>
              {items.find((item) => item.href === pathname)?.label || title}
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
          {children}
        </main>
      </div>
      <Modal isOpen={menuOpen} onClose={() => setMenuOpen(false)} title={title}>
        {navigation}
        <Link href="/" className="action-link secondary">
          نمای مشتری
        </Link>
        <button className="action-link secondary mt-3" onClick={logout}>
          خروج از حساب
        </button>
      </Modal>
    </div>
  );
}
