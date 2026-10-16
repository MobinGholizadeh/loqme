"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Bell, CheckCheck, Clock3, ShoppingBag, Sparkles, Store, ExternalLink } from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "order" | "discount" | "system";
  link?: string;
}

// Until real notifications are supplied, show the empty state without invented activity.
const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

const STORAGE_KEY = "loqme-user-notifications-v1";

export function NotificationsModal({
  isOpen,
  onClose,
  onUnreadCountChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "order" | "discount" | "system">("all");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Earlier versions persisted three fabricated demo entries.
          const actual = parsed.filter((n: NotificationItem) => n && !['notif-1', 'notif-2', 'notif-3'].includes(n.id));
          setNotifications(actual);
          const unread = actual.filter((n: NotificationItem) => !n.read).length;
          onUnreadCountChange?.(unread);
          return;
        }
      }
    } catch {
      // ignore
    }
    const unread = DEFAULT_NOTIFICATIONS.filter((n) => !n.read).length;
    onUnreadCountChange?.(unread);
  }, [onUnreadCountChange]);

  const updateNotifications = (newList: NotificationItem[]) => {
    setNotifications(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // ignore
    }
    const unread = newList.filter((n) => !n.read).length;
    onUnreadCountChange?.(unread);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
  };

  const handleItemClick = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    updateNotifications(updated);
    onClose();
  };

  const filtered =
    filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="پیام‌ها و اعلان‌ها"
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          <RippleButton
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-loqme-700 hover:text-loqme-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            همه ({notifications.length})
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
            کسب‌وکار
          </RippleButton>
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
                ) : (
                  <Store size={18} className="text-indigo-600" />
                );

              const iconBg =
                item.type === "order"
                  ? "bg-emerald-50 border-emerald-100"
                  : item.type === "discount"
                    ? "bg-amber-50 border-amber-100"
                    : "bg-indigo-50 border-indigo-100";

              const content = (
                <div
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.read
                      ? "bg-white border-slate-200/80 hover:border-slate-300"
                      : "bg-teal-50/50 border-teal-200/70 hover:border-teal-300 shadow-sm"
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
                          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                        {item.body}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {item.time}
                        </span>
                        {item.link && (
                          <span className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline">
                            مشاهده <ExternalLink size={10} />
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
                پیام‌ها و وضعیت سفارش‌های شما اینجا نمایش داده می‌شوند.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
