"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import {
  Bell,
  CheckCheck,
  Clock3,
  ShoppingBag,
  Sparkles,
  Store,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { toPersianDigits } from "@loqme/validation";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "order" | "discount" | "system";
  link?: string;
  createdAt?: string;
}

const STORAGE_KEY = "loqme-read-notifications-v2";

function getReadIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function saveReadId(id: string) {
  try {
    const current = getReadIds();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
}

function saveAllReadIds(ids: string[]) {
  try {
    const current = new Set([...getReadIds(), ...ids]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "order" | "discount" | "system">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const readIds = getReadIds();
          const items: NotificationItem[] = json.data.map((item: NotificationItem) => ({
            ...item,
            read: item.read || readIds.includes(item.id),
          }));

          setNotifications(items);
          const unread = items.filter((n) => !n.read).length;
          onUnreadCountChange?.(unread);
          window.dispatchEvent(
            new CustomEvent("loqme:notifications-count", { detail: unread })
          );
          return;
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch when modal is opened to ensure fresh data
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveAllReadIds(allIds);
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    onUnreadCountChange?.(0);
    window.dispatchEvent(
      new CustomEvent("loqme:notifications-count", { detail: 0 })
    );
  };

  const handleItemClick = (id: string) => {
    saveReadId(id);
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    const unread = updated.filter((n) => !n.read).length;
    onUnreadCountChange?.(unread);
    window.dispatchEvent(
      new CustomEvent("loqme:notifications-count", { detail: unread })
    );
    onClose();
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
        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <RippleButton
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
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
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
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
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
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
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all ${
              filter === "system"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            سیستم
          </RippleButton>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pl-1">
          {isLoading && notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Spinner size="md" variant="primary" className="mx-auto" />
              <p className="text-xs text-slate-500">در حال دریافت اعلان‌ها…</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => {
              const icon =
                item.type === "order" ? (
                  <ShoppingBag size={18} className="text-emerald-600" />
                ) : item.type === "discount" ? (
                  <Sparkles size={18} className="text-amber-600" />
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
              <p className="text-xs font-bold text-slate-600">اعلانی در این بخش وجود ندارد</p>
              <p className="text-[11px] text-slate-400 mt-1">
                پیام‌ها، رویدادها و هشدارهای جدید در این قسمت نمایش داده می‌شوند
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
