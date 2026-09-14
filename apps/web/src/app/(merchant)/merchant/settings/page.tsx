"use client";
import { ErrorState } from "@/components/ui/ErrorState";
import * as RedesignIcons from "lucide-react";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/persian";
import { MerchantStoreSettingsDto, OperatingHoursDayDto } from "@loqme/types";

export default function MerchantSettingsPage() {
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<MerchantStoreSettingsDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Editable Form State
  const [businessNameFa, setBusinessNameFa] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [addressFa, setAddressFa] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [latitude, setLatitude] = useState<number>(37.551); // Default Urmia center
  const [longitude, setLongitude] = useState<number>(45.076);
  const [hours, setHours] = useState<OperatingHoursDayDto[]>([]);

  const fetchSettings = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/merchant/settings");
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        const data = json.data as MerchantStoreSettingsDto;
        setSettings(data);
        setBusinessNameFa(data.businessNameFa);
        setPhone(data.primaryLocation?.phone || "");
        setAddressFa(data.primaryLocation?.addressFa || "");
        setPostalCode(data.primaryLocation?.postalCode || "");
        if (data.primaryLocation?.latitude)
          setLatitude(data.primaryLocation.latitude);
        if (data.primaryLocation?.longitude)
          setLongitude(data.primaryLocation.longitude);
        setHours(data.hours || []);
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

  const handleHourChange = (
    index: number,
    field: keyof OperatingHoursDayDto,
    value: any,
  ) => {
    setHours((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // 1-Click apply schedule from Saturday (index 0) to all days
  const handleApplyToAllDays = () => {
    if (hours.length === 0) return;
    const template = hours[0];
    setHours((prev) =>
      prev.map((h, i) => ({
        ...h,
        isOpen: i === 6 ? false : template.isOpen, // keep Friday closed by default or open
        storeOpenTime: template.storeOpenTime,
        storeCloseTime: template.storeCloseTime,
        defaultPickupStart: template.defaultPickupStart,
        defaultPickupEnd: template.defaultPickupEnd,
      })),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/merchant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessNameFa,
          phone: phone || null,
          addressFa,
          postalCode: postalCode || null,
          latitude,
          longitude,
          hours: hours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            storeOpenTime: toEnglishDigits(h.storeOpenTime),
            storeCloseTime: toEnglishDigits(h.storeCloseTime),
            defaultPickupStart: toEnglishDigits(h.defaultPickupStart),
            defaultPickupEnd: toEnglishDigits(h.defaultPickupEnd),
          })),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: "success",
          text: "تنظیمات فروشگاه با موفقیت ذخیره گردید.",
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
          تنظیمات و ساعات کاری فروشگاه
        </h1>
        <p className="text-xs text-loqme-neutral-500 mt-1">
          اطلاعات هویتی کسب‌وکار، مختصات جغرافیایی ورود به فروشگاه و برنامه
          هفتگی بازه تحویل مازاد
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-xs font-bold flex items-center justify-between animate-fade-in ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          <span>
            {message.type === "success" ? "✓ " : "❌ "} {message.text}
          </span>
          <button aria-label="بستن" onClick={() => setMessage(null)}>
            ✕
          </button>
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
        <form onSubmit={handleSave} className="space-y-6">
          {/* Business Profile Card */}
          <Card
            variant="elevated"
            className="p-6 bg-white border border-loqme-neutral-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-loqme-neutral-100 pb-3">
              <h2 className="font-bold text-sm text-loqme-neutral-900 flex items-center gap-2">
                <span>🏢</span>
                <span>مشخصات کسب‌وکار و صنف</span>
              </h2>
              <Badge variant="success" size="sm">
                پروانه کسب تایید شده توسط بازرس
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="نام تابلو و عنوان فروشگاه در لقمه"
                  value={businessNameFa}
                  onChange={(e) => setBusinessNameFa(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="تلفن تماس ثابت یا همراه فروشگاه"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  placeholder="044-33445566"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="آدرس دقیق فروشگاه جهت مراجعه مشتریان"
                  value={addressFa}
                  onChange={(e) => setAddressFa(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="کد پستی ۱۰ رقمی"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  dir="ltr"
                  placeholder="5715912345"
                />
              </div>
            </div>
          </Card>

          {/* Storefront Location Map Pin Editor */}
          <Card
            variant="elevated"
            className="p-6 bg-white border border-loqme-neutral-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-loqme-neutral-100 pb-3">
              <h2 className="font-bold text-sm text-loqme-neutral-900 flex items-center gap-2">
                <span>
                  <RedesignIcons.MapPin size={20} aria-hidden="true" />
                </span>
                <span>تنظیم دقیق مختصات درب ورودی فروشگاه</span>
              </h2>
              <span className="text-[11px] text-loqme-neutral-500">
                جهت مسیریابی دقیق خریداران در نقشه
              </span>
            </div>

            <div className="p-4 rounded-lg bg-loqme-primary-50/50 border border-loqme-primary-200 space-y-3">
              <p className="text-xs text-loqme-neutral-700 leading-relaxed">
                مشتریان لقمه بر اساس فاصله و شعاع جغرافیایی، فروشگاه شما را در
                نقشه کشف می‌کنند. لطفاً طول و عرض جغرافیایی محل ورود به مغازه را
                به دقت بررسی فرمایید:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="settings-field-1"
                    className="block text-[11px] font-bold text-loqme-neutral-700 mb-1"
                  >
                    عرض جغرافیایی (Latitude):
                  </label>
                  <input
                    id="settings-field-1"
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-loqme-neutral-300 rounded-lg bg-white text-left"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-field-2"
                    className="block text-[11px] font-bold text-loqme-neutral-700 mb-1"
                  >
                    طول جغرافیایی (Longitude):
                  </label>
                  <input
                    id="settings-field-2"
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-loqme-neutral-300 rounded-lg bg-white text-left"
                    required
                  />
                </div>
              </div>

              <div className="text-[11px] text-loqme-neutral-500 flex items-center gap-2">
                <span>💡</span>
                <span>
                  مختصات فعلی:{" "}
                  <span className="font-mono font-bold text-loqme-primary-800">
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </span>{" "}
                  (شهر {settings?.primaryLocation?.cityNameFa || "ارومیه"})
                </span>
              </div>
            </div>
          </Card>

          {/* 7-Day Operating Hours Schedule Card */}
          <Card
            variant="elevated"
            className="p-6 bg-white border border-loqme-neutral-200 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-loqme-neutral-100 pb-3">
              <div>
                <h2 className="font-bold text-sm text-loqme-neutral-900 flex items-center gap-2">
                  <span>
                    <RedesignIcons.Clock3 size={20} aria-hidden="true" />
                  </span>
                  <span>
                    برنامه هفتگی ساعات کاری و بازه تحویل مازاد (شنبه تا جمعه)
                  </span>
                </h2>
                <p className="text-[11px] text-loqme-neutral-500 mt-0.5">
                  بسته‌های روز به صورت پیش‌فرض در بازه تعیین‌شده در این جدول به
                  خریداران عرضه خواهند شد.
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyToAllDays}
                className="text-xs font-bold text-loqme-primary-700 hover:text-loqme-primary-900 underline self-start sm:self-auto"
              >
                اعمال بازه شنبه به تمام روزهای هفته
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-loqme-neutral-200 text-loqme-neutral-600 font-bold">
                    <th className="py-2.5 px-2">روز هفته</th>
                    <th className="py-2.5 px-2">وضعیت فعالیت</th>
                    <th className="py-2.5 px-2">شروع کار فروشگاه</th>
                    <th className="py-2.5 px-2">پایان کار فروشگاه</th>
                    <th className="py-2.5 px-2 text-loqme-primary-800 font-black">
                      شروع تحویل مازاد
                    </th>
                    <th className="py-2.5 px-2 text-loqme-primary-800 font-black">
                      پایان تحویل مازاد
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-loqme-neutral-100">
                  {hours.map((day, idx) => (
                    <tr
                      key={day.dayOfWeek}
                      className="hover:bg-loqme-neutral-50/50"
                    >
                      <td className="py-3 px-2 font-bold text-loqme-neutral-900">
                        {day.dayNameFa}
                      </td>

                      <td className="py-3 px-2">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={day.isOpen}
                            onChange={(e) =>
                              handleHourChange(idx, "isOpen", e.target.checked)
                            }
                            className="rounded text-loqme-primary-600"
                          />
                          <span
                            className={
                              day.isOpen
                                ? "text-emerald-700 font-bold"
                                : "text-loqme-neutral-500"
                            }
                          >
                            {day.isOpen ? "دایر" : "تعطیل"}
                          </span>
                        </label>
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={day.storeOpenTime}
                          onChange={(e) =>
                            handleHourChange(
                              idx,
                              "storeOpenTime",
                              e.target.value,
                            )
                          }
                          disabled={!day.isOpen}
                          className="w-20 px-2 py-1 text-center font-mono text-xs border border-loqme-neutral-300 rounded-lg disabled:bg-loqme-neutral-100"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={day.storeCloseTime}
                          onChange={(e) =>
                            handleHourChange(
                              idx,
                              "storeCloseTime",
                              e.target.value,
                            )
                          }
                          disabled={!day.isOpen}
                          className="w-20 px-2 py-1 text-center font-mono text-xs border border-loqme-neutral-300 rounded-lg disabled:bg-loqme-neutral-100"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={day.defaultPickupStart}
                          onChange={(e) =>
                            handleHourChange(
                              idx,
                              "defaultPickupStart",
                              e.target.value,
                            )
                          }
                          disabled={!day.isOpen}
                          className="w-20 px-2 py-1 text-center font-mono font-bold text-xs border-2 border-loqme-primary-300 rounded-lg bg-loqme-primary-50/50 disabled:bg-loqme-neutral-100"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={day.defaultPickupEnd}
                          onChange={(e) =>
                            handleHourChange(
                              idx,
                              "defaultPickupEnd",
                              e.target.value,
                            )
                          }
                          disabled={!day.isOpen}
                          className="w-20 px-2 py-1 text-center font-mono font-bold text-xs border-2 border-loqme-primary-300 rounded-lg bg-loqme-primary-50/50 disabled:bg-loqme-neutral-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSaving}
              className="gap-2 px-8 shadow-sm font-bold"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" variant="white" />
                  <span>در حال ذخیره‌سازی...</span>
                </>
              ) : (
                "ذخیره کلیه تغییرات فروشگاه"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
