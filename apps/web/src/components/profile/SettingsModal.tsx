"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Settings,
  UserRound,
  Phone,
  Bell,
  MapPin,
  Trash2,
  Check,
  Save,
  HelpCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { toPersianDigits } from "@/lib/utils/persian";

export interface UserSettings {
  fullName: string;
  smsOrders: boolean;
  surplusAlerts: boolean;
  autoLocation: boolean;
}

const SETTINGS_STORAGE_KEY = "loqme-user-settings-v1";

export function SettingsModal({
  isOpen,
  onClose,
  initialUser,
  onUserUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialUser?: { fullName?: string | null; mobile?: string | null; role?: string | null } | null;
  onUserUpdate?: (updated: { fullName: string }) => void;
}) {
  const [fullName, setFullName] = useState(initialUser?.fullName || "");
  const [smsOrders, setSmsOrders] = useState(true);
  const [surplusAlerts, setSurplusAlerts] = useState(true);
  const [autoLocation, setAutoLocation] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (initialUser?.fullName) {
      setFullName(initialUser.fullName);
    }
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed: UserSettings = JSON.parse(saved);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (typeof parsed.smsOrders === "boolean") setSmsOrders(parsed.smsOrders);
        if (typeof parsed.surplusAlerts === "boolean") setSurplusAlerts(parsed.surplusAlerts);
        if (typeof parsed.autoLocation === "boolean") setAutoLocation(parsed.autoLocation);
      }
    } catch {
      // ignore
    }
  }, [initialUser, isOpen]);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    const settings: UserSettings = {
      fullName: fullName.trim(),
      smsOrders,
      surplusAlerts,
      autoLocation,
    };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    if (fullName.trim() && onUserUpdate) {
      onUserUpdate({ fullName: fullName.trim() });
    }
    if (typeof fetch === 'function') {
      fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smsOrders,
          smsMarketing: surplusAlerts,
          notifyOrders: smsOrders,
        }),
      }).catch(() => {});
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تنظیمات حساب کاربری"
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          <RippleButton
            type="button"
            onClick={onClose}
            className="action-link secondary py-2 px-4 text-xs font-bold"
          >
            انصراف
          </RippleButton>
          <RippleButton
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 py-2 px-5 rounded-xl bg-loqme-800 hover:bg-loqme-900 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check size={16} className="text-emerald-300" />
                <span>ذخیره شد!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>ذخیره تغییرات</span>
              </>
            )}
          </RippleButton>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-5 text-right">
        {/* Personal Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <UserRound size={16} className="text-loqme-700" />
            مشخصات فردی
          </h3>
          <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <label
                htmlFor="profile-fullname-input"
                className="block text-[11px] font-semibold text-slate-600 mb-1"
              >
                نام و نام خانوادگی
              </label>
              <input
                id="profile-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="نام خود را وارد کنید"
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-loqme-600 focus:ring-1 focus:ring-loqme-600 transition-all"
              />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                شماره همراه
              </span>
              <div className="flex items-center justify-between bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
                <span dir="ltr" className="text-slate-700 font-bold">
                  {initialUser?.mobile ? toPersianDigits(initialUser.mobile) : "—"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck size={12} />
                  تأییدشده
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications and Alerts */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Bell size={16} className="text-loqme-700" />
            اعلان‌ها و یادآوری‌ها
          </h3>
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-slate-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">پیامک وضعیت سفارش‌ها</p>
                  <p className="text-[10px] text-slate-500">
                    اطلاع‌رسانی پیامکی هنگام آماده‌سازی و تحویل
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={smsOrders}
                onChange={(e) => setSmsOrders(e.target.checked)}
                className="w-4 h-4 rounded text-loqme-700 focus:ring-loqme-600"
              />
            </label>

            <div className="border-t border-slate-200/60" />

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800">بسته‌های شگفت‌انگیز محله</p>
                  <p className="text-[10px] text-slate-500">
                    اعلان اضافه شدن بسته‌های مازاد با تخفیف ویژه
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={surplusAlerts}
                onChange={(e) => setSurplusAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-loqme-700 focus:ring-loqme-600"
              />
            </label>
          </div>
        </div>

        {/* Device & Location */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <MapPin size={16} className="text-loqme-700" />
            موقعیت مکانی و حریم خصوصی
          </h3>
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-800">موقعیت‌یابی خودکار</p>
                <p className="text-[10px] text-slate-500">
                  یافتن نزدیک‌ترین نانوایی‌ها و کافه‌های اطراف
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoLocation}
                onChange={(e) => setAutoLocation(e.target.checked)}
                className="w-4 h-4 rounded text-loqme-700 focus:ring-loqme-600"
              />
            </label>

            <div className="border-t border-slate-200/60" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">پاک‌سازی داده‌های موقت</p>
                <p className="text-[10px] text-slate-500">پاک کردن کش فرم‌ها و پیش‌نویس‌ها</p>
              </div>
              <RippleButton
                type="button"
                onClick={handleClearCache}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200/60 active:scale-95 transition-all"
              >
                {cacheCleared ? (
                  <>
                    <Check size={14} /> پاک شد
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> پاک‌سازی
                  </>
                )}
              </RippleButton>
            </div>
          </div>
        </div>

        {/* App Info & Support */}
        <div className="pt-2 text-center text-[11px] text-slate-400 space-y-1">
          <p>سامانه لقمه · نگارش ۱.۰.۰ (loqme.shop)</p>
          <p className="text-[10px]">توسعه‌یافته بر پایه استانداردهای هوشمند پایداری غذا</p>
        </div>
      </form>
    </Modal>
  );
}
