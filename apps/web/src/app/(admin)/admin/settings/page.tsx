"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { ErrorState } from "@/components/ui/ErrorState";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { SystemSettingsDto } from "@loqme/types";

export default function AdminSettingsPage() {
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<SystemSettingsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form State
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [announcementBannerFa, setAnnouncementBannerFa] = useState<string>("");
  const [activeSmsProvider, setActiveSmsProvider] = useState<
    "MOCK" | "SMS_IR"
  >("MOCK");

  const fetchSettings = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        const data = json.data as SystemSettingsDto;
        setSettings(data);
        setMaintenanceMode(data.maintenanceMode);
        setAnnouncementBannerFa(data.announcementBannerFa || "");
        setActiveSmsProvider(data.activeSmsProvider || "MOCK");
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceMode,
          announcementBannerFa: announcementBannerFa.trim(),
          activeSmsProvider,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: "تنظیمات سراسری سامانه با موفقیت ذخیره گردید.",
        });
      } else {
        setMessage({
          type: "error",
          text: json.message || "خطا در ذخیره تنظیمات",
        });
      }
    } catch {
      setMessage({ type: "error", text: "ارتباط با سرور برقرار نشد" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError)
    return (
      <ErrorState
        title="دریافت اطلاعات انجام نشد"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-loqme-neutral-900">
          تنظیمات و پیکربندی سراسری سامانه
        </h1>
        <p className="text-xs text-loqme-neutral-500 mt-1">
          مدیریت حالت تعمیر و نگهداری، نوار اعلان اضطراری بالای سایت و سوییچ
          درگاه‌های پیامکی
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-lg text-xs font-bold flex items-center justify-between animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-700"
              : "bg-rose-500/20 border border-rose-500/40 text-rose-700"
          }`}
        >
          <span>{message.text}</span>
          <RippleButton aria-label="بستن" onClick={() => setMessage(null)}>
            ✕
          </RippleButton>
        </div>
      )}

      {isLoading && !settings ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال بارگذاری تنظیمات...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {/* Maintenance Mode Toggle Card */}
          <div className="p-6 rounded-lg bg-white border border-loqme-neutral-200 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-loqme-neutral-900 flex items-center gap-2">
                  <span>🚧</span>
                  <span>حالت تعمیر و بروزرسانی زیرساخت (Maintenance Mode)</span>
                </h3>
                <p className="text-xs text-loqme-neutral-500 mt-1">
                  در صورت فعال‌سازی، دسترسی عمومی مشتریان به رزرو موقتاً مسدود
                  شده و صفحه «در حال بروزرسانی» نمایش داده می‌شود.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="حالت تعمیر و بروزرسانی"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-loqme-neutral-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-loqme-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {maintenanceMode && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs">
                هشدار: حالت تعمیر هم‌اکنون فعال است. کلیه تراکنش‌های جدید در
                بازار موقتاً متوقف خواهند بود.
              </div>
            )}
          </div>

          {/* Announcement Banner Broadcast Card */}
          <div className="p-6 rounded-lg bg-white border border-loqme-neutral-200 space-y-3 shadow-card">
            <h3 className="font-bold text-sm text-loqme-neutral-900 flex items-center gap-2">
              <span>📢</span>
              <span>نوار اعلان اضطراری و پیام سراسری (Banner Broadcast)</span>
            </h3>
            <p className="text-xs text-loqme-neutral-500">
              این متن در بالاترین بخش اپلیکیشن و وب‌سایت برای کلیه کاربران و
              خریداران به نمایش درمی‌آید:
            </p>

            <textarea
              value={announcementBannerFa}
              onChange={(e) => setAnnouncementBannerFa(e.target.value)}
              placeholder="مثال: به دلیل برودت هوا و یخبندان معابر ارومیه، بازه تحویل امروز تا ساعت ۲۲:۳۰ تمدید شد."
              className="w-full px-3 py-2.5 text-xs bg-white border border-loqme-neutral-200 rounded-lg text-loqme-neutral-900 placeholder-loqme-neutral-500 h-24 focus:outline-none focus:border-loqme-primary-500"
            />
          </div>

          {/* SMS Provider Switcher Card */}
          <div className="p-6 rounded-lg bg-white border border-loqme-neutral-200 space-y-4 shadow-card">
            <h3 className="font-bold text-sm text-loqme-neutral-900 flex items-center gap-2">
              <span>📱</span>
              <span>
                درگاه فعال ارسال پیامک‌های اعتبارسنجی (SMS OTP Provider)
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: "MOCK",
                  name: "کنسول شبیه‌ساز (Mock / Dev)",
                  desc: "چاپ کد در لاگ ترمینال سرور بدون هزینه",
                },
                {
                  id: "SMS_IR",
                  name: "سامانه پیامک SMS.ir",
                  desc: "ارسال سریع اعتباری و خدماتی با وب‌سرویس REST",
                },
              ].map((p) => (
                <RippleButton
                  key={p.id}
                  type="button"
                  onClick={() => setActiveSmsProvider(p.id as any)}
                  className={`p-4 rounded-lg border text-right transition-all ${
                    activeSmsProvider === p.id
                      ? "border-loqme-primary-500 bg-loqme-primary-950/40 ring-2 ring-loqme-primary-500/20"
                      : "border-loqme-neutral-200 bg-white hover:border-loqme-neutral-600"
                  }`}
                >
                  <span className="font-bold text-xs text-loqme-neutral-900 block">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-loqme-neutral-500 mt-1 block">
                    {p.desc}
                  </span>
                </RippleButton>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSaving}
              className="gap-2 px-8 font-bold shadow-xs"
            >
              {isSaving ? (
                <Spinner size="sm" variant="white" />
              ) : (
                "ذخیره تنظیمات سیستم"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
