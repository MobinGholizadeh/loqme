"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { ErrorState } from "@/components/ui/ErrorState";
import { DialogSurface } from "@/components/ui/DialogSurface";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toPersianDigits, toEnglishDigits } from "@/lib/utils/persian";

interface StaffMember {
  id: string;
  userId: string;
  mobile: string;
  fullName: string | null;
  role: "OWNER" | "MANAGER" | "CASHIER";
  canScanPickup: boolean;
  createdAt: string;
}

export default function MerchantStaffPage() {
  const [loadError, setLoadError] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [revokeTarget, setRevokeTarget] = useState<StaffMember | null>(null);

  // Invite Form State
  const [inviteMobile, setInviteMobile] = useState<string>("");
  const [inviteFullName, setInviteFullName] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "CASHIER">(
    "CASHIER",
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/merchant/staff");
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      if (json.success && json.data) {
        setStaffList(json.data);
      }
    } catch (err) {
      setLoadError("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/merchant/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: toEnglishDigits(inviteMobile).trim(),
          fullName: inviteFullName.trim() || undefined,
          role: inviteRole,
          canScanPickup: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage("همکار جدید با موفقیت اضافه شد");
        setInviteMobile("");
        setInviteFullName("");
        setIsInviteModalOpen(false);
        fetchStaff();
      } else {
        setErrorMessage(json.message || "خطا در افزودن همکار");
      }
    } catch {
      setErrorMessage("ارتباط با سرور برقرار نشد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/merchant/staff/${revokeTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMessage("دسترسی همکار با موفقیت لغو شد");
        setRevokeTarget(null);
        fetchStaff();
      } else {
        setErrorMessage(json.message || "خطا در لغو دسترسی همکار");
      }
    } catch {
      setErrorMessage("ارتباط با سرور برقرار نشد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: StaffMember["role"]) => {
    switch (role) {
      case "OWNER":
        return (
          <Badge variant="brand" size="sm">
            👑 مالک فروشگاه
          </Badge>
        );
      case "MANAGER":
        return (
          <Badge variant="success" size="sm">
            مدیر فروشگاه
          </Badge>
        );
      case "CASHIER":
        return (
          <Badge variant="neutral" size="sm">
            صندوق‌دار و تحویل حضوری
          </Badge>
        );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-loqme-neutral-900">
            همکاران و مدیریت دسترسی‌ها
          </h1>
          <p className="text-xs text-loqme-neutral-500 mt-1">
            تعریف کارکنان فروشگاه جهت اسکن بارکد مشتریان و مدیریت بسته‌ها (ویژه
            مالک فروشگاه)
          </p>
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 shadow-sm font-bold"
        >
          <span>👤+</span>
          <span>افزودن همکار جدید</span>
        </Button>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <RippleButton aria-label="بستن" onClick={() => setSuccessMessage(null)}>
            ✕
          </RippleButton>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
          <span>{errorMessage}</span>
          <RippleButton aria-label="بستن" onClick={() => setErrorMessage(null)}>
            ✕
          </RippleButton>
        </div>
      )}

      {/* Staff Members List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-loqme-neutral-500">
            در حال دریافت لیست کادر فروشگاه...
          </p>
        </div>
      ) : staffList.length === 0 ? (
        <EmptyState
          title="همکاری در این فروشگاه ثبت نشده است"
          description="با دعوت همکاران، امکان اسکن سریع بارکدهای تحویل حضوری بدون نیاز به اشتراک‌گذاری رمز اصلی فراهم می‌شود."
        />
      ) : (
        <div className="space-y-3">
          {staffList.map((member) => (
            <Card
              key={member.id}
              variant="elevated"
              className="p-4 bg-white border border-loqme-neutral-200"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-loqme-neutral-100 flex items-center justify-center text-lg font-bold text-loqme-neutral-600">
                    {member.role === "OWNER" ? "👑" : "👤"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-loqme-neutral-900">
                        {member.fullName || "همکار گرامی"}
                      </h4>
                      {getRoleBadge(member.role)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-loqme-neutral-500 mt-1">
                      <span className="font-mono">
                        {toPersianDigits(member.mobile)}
                      </span>
                      <span>•</span>
                      <span>
                        {member.canScanPickup
                          ? "✓ مجاز به اسکن تحویل حضوری"
                          : "فاقد مجوز اسکن"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {member.role !== "OWNER" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRevokeTarget(member)}
                      className="text-xs text-rose-600 hover:bg-rose-50"
                    >
                      لغو دسترسی
                    </Button>
                  ) : (
                    <span className="text-[11px] text-loqme-neutral-500 font-medium">
                      مالک اصلی
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <DialogSurface onClose={() => setIsInviteModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 border border-loqme-neutral-200">
            <div className="flex items-center justify-between pb-4 border-b border-loqme-neutral-200">
              <h3 className="font-black text-base text-loqme-neutral-900">
                افزودن همکار جدید به فروشگاه
              </h3>
              <RippleButton
                aria-label="بستن"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-loqme-neutral-500 hover:text-loqme-neutral-700"
              >
                ✕
              </RippleButton>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 mt-4">
              <div>
                <Input
                  label="شماره موبایل همکار (فرمت استاندارد ایران)"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={inviteMobile}
                  onChange={(e) => setInviteMobile(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <Input
                  label="نام و نام خانوادگی همکار"
                  placeholder="مثال: علی رضایی"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-loqme-neutral-700 mb-1">
                  سطح دسترسی و نقش در فروشگاه:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <RippleButton
                    type="button"
                    onClick={() => setInviteRole("CASHIER")}
                    className={`p-3 rounded-lg border text-right transition-all ${
                      inviteRole === "CASHIER"
                        ? "border-loqme-primary-600 bg-loqme-primary-50 ring-2 ring-loqme-primary-400/20"
                        : "border-loqme-neutral-200 bg-white hover:border-loqme-neutral-300"
                    }`}
                  >
                    <span className="font-bold text-xs block text-loqme-neutral-900">
                      صندوق‌دار
                    </span>
                    <span className="text-[10px] text-loqme-neutral-500 mt-0.5 block">
                      اسکن و تحویل حضوری سفارشات
                    </span>
                  </RippleButton>

                  <RippleButton
                    type="button"
                    onClick={() => setInviteRole("MANAGER")}
                    className={`p-3 rounded-lg border text-right transition-all ${
                      inviteRole === "MANAGER"
                        ? "border-loqme-primary-600 bg-loqme-primary-50 ring-2 ring-loqme-primary-400/20"
                        : "border-loqme-neutral-200 bg-white hover:border-loqme-neutral-300"
                    }`}
                  >
                    <span className="font-bold text-xs block text-loqme-neutral-900">
                      مدیر فروشگاه
                    </span>
                    <span className="text-[10px] text-loqme-neutral-500 mt-0.5 block">
                      تعریف بسته، توقف و تنظیم موجودی
                    </span>
                  </RippleButton>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-loqme-neutral-200">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || !inviteMobile}
                >
                  {isSubmitting ? (
                    <Spinner size="sm" variant="white" />
                  ) : (
                    "افزودن و فعال‌سازی"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogSurface>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <DialogSurface onClose={() => setRevokeTarget(null)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 border border-loqme-neutral-200 space-y-4">
            <h3 className="font-black text-base text-rose-700">
              لغو دسترسی همکار
            </h3>
            <p className="text-xs text-loqme-neutral-600 leading-relaxed">
              آیا از لغو دسترسی{" "}
              <strong className="text-loqme-neutral-900">
                {revokeTarget.fullName || revokeTarget.mobile}
              </strong>{" "}
              به پنل فروشگاه اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-loqme-neutral-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeTarget(null)}
                disabled={isSubmitting}
              >
                انصراف
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmRevoke}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Spinner size="sm" variant="white" />
                ) : (
                  "تایید و لغو دسترسی"
                )}
              </Button>
            </div>
          </div>
        </DialogSurface>
      )}
    </div>
  );
}
