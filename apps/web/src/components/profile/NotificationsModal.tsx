"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import {
  Bell,
  CheckCheck,
  Clock3,
  ShoppingBag,
  Sparkles,
  Store,
  ExternalLink,
  ShieldAlert,
  Headphones,
  BellRing,
  Check,
} from "lucide-react";
import { toPersianDigits } from "@loqme/validation";
import { useWebPush } from "@/lib/push/use-web-push";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "order" | "discount" | "system" | "support";
  link?: string;
  createdAt?: string;
}

const STORAGE_KEY = "loqme-user-notifications-v1";

function getSavedNotifications(): NotificationItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (n: NotificationItem) =>
            n && !["notif-1", "notif-2", "notif-3"].includes(n.id)
        );
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function NotificationsModal({
  isOpen,
  onClose,
  onUnreadCountChange,
  role,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  role?: string;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(getSavedNotifications);
  const [filter, setFilter] = useState<"all" | "order" | "discount" | "system" | "support">("all");
  const { isSupported, permission, isSubscribed, isLoading: isPushLoading, subscribe: subscribePush } = useWebPush();
  const [pushNotice, setPushNotice] = useState<string | null>(null);

  const updateNotifications = useCallback(
    (newList: NotificationItem[]) => {
      setNotifications(newList);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      } catch {
        // ignore
      }
      const unread = newList.filter((n) => !n.read).length;
      onUnreadCountChange?.(unread);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("loqme:notifications-count", { detail: unread })
        );
      }
    },
    [onUnreadCountChange]
  );

  const fetchNotifications = useCallback(async () => {
    if (typeof fetch !== "function") return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const currentSaved = getSavedNotifications();
          const readMap = new Map<string, boolean>();
          for (const s of currentSaved) {
            readMap.set(s.id, s.read);
          }
          const items: NotificationItem[] = json.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            time: item.time,
            read: readMap.has(item.id) ? !!readMap.get(item.id) : (item.read ?? item.isRead ?? false),
            type:
              item.category === "order" || item.category === "discount" || item.category === "support" || item.category === "system"
                ? item.category
                : ["order", "discount", "support", "system"].includes(item.type)
                  ? item.type
                  : "system",
            link: item.link,
            createdAt: item.createdAt,
          }));

          updateNotifications(items);
        }
      }
    } catch {
      // ignore
    }
  }, [updateNotifications]);

  useEffect(() => {
    // Initialize unread count on mount
    const initialSaved = getSavedNotifications();
    const unread = initialSaved.filter((n) => !n.read).length;
    onUnreadCountChange?.(unread);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("loqme:notifications-count", { detail: unread })
      );
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Real-time SSE and Service Worker Push listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    let eventSource: EventSource | null = null;
    try {
      if (typeof EventSource !== "undefined") {
        eventSource = new EventSource("/api/notifications/stream");
        eventSource.addEventListener("notification", (e: MessageEvent) => {
          try {
            const notif = JSON.parse(e.data);
            if (notif && notif.id) {
              setNotifications((prev) => {
                if (prev.some((p) => p.id === notif.id)) return prev;
                const newItem: NotificationItem = {
                  id: notif.id,
                  title: notif.title,
                  body: notif.body,
                  time: notif.time || "هم‌اکنون",
                  read: false,
                  type:
                    notif.category === "order" || notif.category === "discount" || notif.category === "support" || notif.category === "system"
                      ? notif.category
                      : ["order", "discount", "support", "system"].includes(notif.type)
                        ? notif.type
                        : "system",
                  link: notif.link,
                  createdAt: notif.createdAt,
                };
                const updated = [newItem, ...prev];
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                } catch {}
                const unread = updated.filter((n) => !n.read).length;
                onUnreadCountChange?.(unread);
                window.dispatchEvent(
                  new CustomEvent("loqme:notifications-count", { detail: unread })
                );
                return updated;
              });
            }
          } catch {}
        });

        eventSource.addEventListener("unread_count", (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            if (typeof parsed.unreadCount === "number") {
              onUnreadCountChange?.(parsed.unreadCount);
              window.dispatchEvent(
                new CustomEvent("loqme:notifications-count", { detail: parsed.unreadCount })
              );
            }
          } catch {}
        });
      }
    } catch {}

    const handlePushMessage = (e: MessageEvent) => {
      if (e.data?.type === "LOQME_PUSH_RECEIVED") {
        fetchNotifications();
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handlePushMessage);
    }

    return () => {
      eventSource?.close();
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handlePushMessage);
      }
    };
  }, [fetchNotifications, onUnreadCountChange]);

  const handleMarkAllRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {}
  };

  const handleItemClick = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    updateNotifications(updated);
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
    onClose();
  };

  const handleEnablePush = async () => {
    setPushNotice(null);
    const res = await subscribePush();
    if (!res.success && res.error) {
      setPushNotice(res.error);
    } else if (res.success) {
      setPushNotice("اعلان مرورگر با موفقیت فعال شد");
      setTimeout(() => setPushNotice(null), 3500);
    }
  };

  const filtered =
    filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        role === "admin"
          ? "رویدادها و هشدارهای مدیریت"
          : role === "merchant"
            ? "پیام‌ها و هشدارهای فروشگاه"
            : "پیام‌ها و اعلان‌ها"
      }
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          <RippleButton
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D616A] hover:text-[#174F56] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck size={16} />
            <span>علامت‌گذاری همه به عنوان خوانده‌شده</span>
          </RippleButton>
          <RippleButton
            type="button"
            onClick={onClose}
            className="action-link secondary py-1.5 px-4 text-xs font-bold"
          >
            بستن
          </RippleButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Push Notification Activation Banner */}
        {isSupported && !isSubscribed && permission !== "denied" && (
          <div className="flex items-center justify-between p-2.5 bg-teal-50 border border-teal-200/80 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-[#1D616A] shrink-0" />
              <span className="text-slate-800 font-semibold text-[11px]">
                دریافت اعلان‌های آنی روی مرورگر
              </span>
            </div>
            <RippleButton
              type="button"
              onClick={handleEnablePush}
              disabled={isPushLoading}
              className="py-1 px-3 bg-[#1D616A] hover:bg-[#174F56] text-white text-[11px] font-bold rounded-lg transition-all"
            >
              {isPushLoading ? "در حال فعال‌سازی" : "فعال‌سازی"}
            </RippleButton>
          </div>
        )}

        {pushNotice && (
          <div className="p-2 text-[11px] rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <span>{pushNotice}</span>
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <RippleButton
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            همه ({toPersianDigits(notifications.length)})
          </RippleButton>
          <RippleButton
            type="button"
            onClick={() => setFilter("order")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter === "order"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            سفارش‌ها
          </RippleButton>
          <RippleButton
            type="button"
            onClick={() => setFilter("discount")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter === "discount"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            تخفیف‌ها
          </RippleButton>
          <RippleButton
            type="button"
            onClick={() => setFilter("system")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter === "system"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {role === "admin" ? "سیستم" : "کسب‌وکار"}
          </RippleButton>
          {notifications.some((n) => n.type === "support") && (
            <RippleButton
              type="button"
              onClick={() => setFilter("support")}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                filter === "support"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              پشتیبانی
            </RippleButton>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pl-1">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const icon =
                item.type === "order" ? (
                  <ShoppingBag size={18} className="text-emerald-600" />
                ) : item.type === "discount" ? (
                  <Sparkles size={18} className="text-amber-600" />
                ) : item.type === "support" ? (
                  <Headphones size={18} className="text-sky-600" />
                ) : role === "admin" ? (
                  <ShieldAlert size={18} className="text-[#1D616A]" />
                ) : (
                  <Store size={18} className="text-indigo-600" />
                );

              const iconBg =
                item.type === "order"
                  ? "bg-emerald-50 border-emerald-100"
                  : item.type === "discount"
                    ? "bg-amber-50 border-amber-100"
                    : item.type === "support"
                      ? "bg-sky-50 border-sky-100"
                      : role === "admin"
                        ? "bg-teal-50 border-teal-100"
                        : "bg-indigo-50 border-indigo-100";

              const content = (
                <div
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.read
                      ? "bg-white border-slate-200/80 hover:border-slate-300"
                      : "bg-[#EFF7F4] border-[#BCD8D1] hover:border-[#1D616A] shadow-xs"
                  }`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            item.read ? "text-slate-700" : "text-slate-900 font-extrabold"
                          }`}
                        >
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-[#1D616A] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                        {item.body}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock3 size={12} />
                          {item.time}
                        </span>
                        {item.link && (
                          <span className="inline-flex items-center gap-1 text-[#1D616A] font-bold hover:underline">
                            مشاهده و اقدام <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );

              return item.link ? (
                <Link key={item.id} href={item.link} className="block no-underline">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })
          ) : (
            <div className="py-10 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">اعلانی وجود ندارد</p>
              <p className="text-[11px] text-slate-400 mt-1">
                پیام‌ها و وضعیت سفارش‌های شما اینجا نمایش داده می‌شوند
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
