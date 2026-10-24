"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Trash2,
  Edit2,
  AlertCircle,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import {
  toPersianDigits,
  isValidShaba,
  normalizeShaba,
  getBankFromShaba,
  IRANIAN_BANKS,
} from "@loqme/validation";
import type { MerchantBankAccountDto } from "@loqme/types";

export function MerchantBankAccountsSection({
  onAccountsUpdated,
}: {
  onAccountsUpdated?: () => void;
}) {
  const [accounts, setAccounts] = useState<MerchantBankAccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MerchantBankAccountDto | null>(null);

  // Form Fields
  const [shabaInput, setShabaInput] = useState("");
  const [bankNameInput, setBankNameInput] = useState("");
  const [accountHolderInput, setAccountHolderInput] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/merchant/bank-accounts");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "دریافت لیست حساب‌های بانکی انجام نشد");
      }
      setAccounts(json.data || []);
      onAccountsUpdated?.();
    } catch (err: any) {
      setLoadError(err.message || "خطا در دریافت حساب‌های بانکی");
    } finally {
      setIsLoading(false);
    }
  }, [onAccountsUpdated]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle Sheba changes with live auto-detection
  const handleShabaChange = (val: string) => {
    setShabaInput(val);
    const normalized = normalizeShaba(val);
    const bank = getBankFromShaba(normalized);
    if (bank) {
      setBankNameInput(bank.nameFa);
    }
  };

  const openAddModal = () => {
    setShabaInput("IR");
    setBankNameInput("");
    setAccountHolderInput("");
    setFormError("");
    setIsAddOpen(true);
  };

  const openEditModal = (acc: MerchantBankAccountDto) => {
    setEditingAccount(acc);
    setShabaInput(acc.shabaNumber);
    setBankNameInput(acc.bankName);
    setAccountHolderInput(acc.accountHolder);
    setFormError("");
    setIsEditOpen(true);
  };

  const handleCopyShaba = (id: string, shaba: string) => {
    navigator.clipboard?.writeText(shaba);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Submit Add Account
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const normalized = normalizeShaba(shabaInput);
    if (!isValidShaba(normalized)) {
      setFormError("شماره شبا وارد شده نامعتبر است؛ لطفاً ۲۴ رقم بعد از IR را به دقت بررسی کنید");
      return;
    }

    if (!bankNameInput.trim()) {
      setFormError("نام بانک الزامی است");
      return;
    }

    if (!accountHolderInput.trim() || accountHolderInput.trim().length < 3) {
      setFormError("نام و نام خانوادگی صاحب حساب باید حداقل ۳ حرف باشد");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/merchant/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shabaNumber: normalized,
          bankName: bankNameInput.trim(),
          accountHolder: accountHolderInput.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "ثبت حساب بانکی انجام نشد");
      }

      setIsAddOpen(false);
      fetchAccounts();
    } catch (err: any) {
      setFormError(err.message || "خطا در برقراری ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Account
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setFormError("");

    const normalized = normalizeShaba(shabaInput);
    if (!isValidShaba(normalized)) {
      setFormError("شماره شبا وارد شده نامعتبر است");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/merchant/bank-accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shabaNumber: normalized,
          bankName: bankNameInput.trim(),
          accountHolder: accountHolderInput.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "ویرایش حساب انجام نشد");
      }

      setIsEditOpen(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (err: any) {
      setFormError(err.message || "خطا در ویرایش اطلاعات");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Default Account
  const handleSetDefault = async (accId: string) => {
    try {
      const res = await fetch(`/api/merchant/bank-accounts/${accId}/default`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "تنظیم حساب پیش‌فرض انجام نشد");
        return;
      }
      fetchAccounts();
    } catch {
      alert("خطا در ارتباط با سرور");
    }
  };

  // Delete Account
  const handleDelete = async (accId: string) => {
    if (!window.confirm("آیا از حذف این حساب بانکی اطمینان دارید؟")) {
      return;
    }

    try {
      const res = await fetch(`/api/merchant/bank-accounts/${accId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "حذف حساب بانکی انجام نشد");
        return;
      }
      fetchAccounts();
    } catch {
      alert("خطا در ارتباط با سرور");
    }
  };

  const detectedBank = getBankFromShaba(normalizeShaba(shabaInput));
  const isCurrentShabaValid = isValidShaba(normalizeShaba(shabaInput));

  return (
    <div className="space-y-6">
      {/* Top Banner and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Building2 className="text-[#1D616A]" size={20} />
            <span>حساب‌های بانکی و تسویه</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسویه درآمد فروش بسته‌های لقمه به حساب‌های بانکی تایید شده در شبکه پایا/ساتنا انجام می‌پذیرد
          </p>
        </div>

        <Button
          size="md"
          variant="primary"
          onClick={openAddModal}
          className="gap-2 shrink-0 bg-[#1D616A] hover:bg-[#174F56] text-white"
        >
          <Plus size={18} />
          <span>افزودن حساب بانکی</span>
        </Button>
      </div>

      {/* Security Notice */}
      <div className="bg-[#F0FDFA] border border-[#BCD8D1] rounded-xl p-4 text-xs text-[#134E4A] flex items-start gap-3">
        <AlertCircle size={18} className="text-[#1D616A] shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold">نکات امنیتی تسویه حساب و شماره شبا:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
            <li>حساب بانکی باید متعلق به صاحب کسب‌وکار یا دارنده پروانه واحد صنفی باشد</li>
            <li>کلیه حساب‌های بانکی جدید پیش از امکان برداشت وجه توسط کارشناسان پشتیبانی و سامانه بانکی تایید می‌شوند</li>
            <li>در هر لحظه می‌توانید یکی از حساب‌های تایید شده را به عنوان حساب پیش‌فرض تسویه انتخاب فرمایید</li>
          </ul>
        </div>
      </div>

      {/* Accounts List */}
      {isLoading ? (
        <div className="py-16 text-center space-y-2">
          <Spinner size="lg" variant="primary" className="mx-auto" />
          <p className="text-xs text-slate-500">در حال دریافت اطلاعات حساب‌های بانکی…</p>
        </div>
      ) : loadError ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
          {loadError}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="هنوز حساب بانکی ثبت نشده است"
          description="برای واریز مبالغ فروش و برداشت از کیف پول، لطفاً شماره شبای حساب بانکی خود را ثبت فرمایید"
          action={
            <Button variant="primary" size="sm" onClick={openAddModal}>
              + ثبت اولین حساب بانکی
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const isApproved = acc.status === "APPROVED";
            const isPending = acc.status === "PENDING";
            const isRejected = acc.status === "REJECTED";

            return (
              <Card
                key={acc.id}
                variant="elevated"
                className={`p-5 relative rounded-2xl border transition-all ${
                  acc.isDefault
                    ? "border-[#1D616A] bg-gradient-to-br from-white to-[#F0FDFA] shadow-xs"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* Card Top Row: Bank Name and Badges */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200/80">
                      <CreditCard size={20} className="text-[#1D616A]" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900">{acc.bankName}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        صاحب حساب: <span className="font-bold text-slate-700">{acc.accountHolder}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {acc.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#1D616A] text-white px-2 py-0.5 rounded-full">
                        <Star size={11} fill="currentColor" />
                        <span>پیش‌فرض تسویه</span>
                      </span>
                    )}

                    {isApproved && (
                      <Badge variant="success" size="sm" className="gap-1">
                        <CheckCircle2 size={12} />
                        <span>تایید شده</span>
                      </Badge>
                    )}
                    {isPending && (
                      <Badge variant="warning" size="sm" className="gap-1">
                        <Clock size={12} />
                        <span>در انتظار بررسی مدیریت</span>
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="danger" size="sm" className="gap-1">
                        <XCircle size={12} />
                        <span>رد شده</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Shaba Display Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between font-mono text-xs sm:text-sm text-slate-800 tracking-wider direction-ltr" dir="ltr">
                  <span className="font-bold">{acc.shabaNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyShaba(acc.id, acc.shabaNumber)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                    title="کپی شماره شبا"
                  >
                    {copiedId === acc.id ? (
                      <Check size={16} className="text-emerald-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>

                {/* Rejection notice if any */}
                {isRejected && acc.rejectionReason && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[11px] leading-relaxed">
                    <strong>علت رد حساب:</strong> {acc.rejectionReason}
                  </div>
                )}

                {/* Card Actions Bottom Row */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(acc)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-[#1D616A] font-semibold transition-colors px-2 py-1 rounded-md hover:bg-slate-50"
                    >
                      <Edit2 size={14} />
                      <span>ویرایش</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(acc.id)}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold transition-colors px-2 py-1 rounded-md hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                      <span>حذف</span>
                    </button>
                  </div>

                  <div>
                    {isApproved && !acc.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(acc.id)}
                        className="text-[11px] h-7 px-2.5"
                      >
                        انتخاب به عنوان پیش‌فرض
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* Modal: Add Bank Account                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="افزودن حساب بانکی همکار"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs leading-relaxed">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              شماره شبا (IBAN) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={shabaInput}
                onChange={(e) => handleShabaChange(e.target.value)}
                placeholder="IR000000000000000000000000"
                maxLength={26}
                className="w-full h-11 px-3 font-mono text-sm border rounded-xl border-slate-300 focus:border-[#1D616A] focus:ring-1 focus:ring-[#1D616A] outline-none"
              />
              {isCurrentShabaValid && (
                <div className="absolute left-3 top-3 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              شماره شبا باید با IR آغاز شده و شامل ۲۴ رقم باشد (مجموعاً ۲۶ کاراکتر).
            </p>
          </div>

          {detectedBank && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <span>بانک تشخیص داده شده:</span>
              <strong className="font-bold">{detectedBank.nameFa}</strong>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نام بانک <span className="text-rose-500">*</span>
            </label>
            <select
              value={bankNameInput}
              onChange={(e) => setBankNameInput(e.target.value)}
              className="w-full h-11 px-3 text-xs border rounded-xl border-slate-300 focus:border-[#1D616A] focus:ring-1 focus:ring-[#1D616A] outline-none bg-white"
            >
              <option value="">انتخاب یا تایید بانک…</option>
              {IRANIAN_BANKS.map((b) => (
                <option key={b.code} value={b.nameFa}>
                  {b.nameFa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نام و نام خانوادگی صاحب حساب <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={accountHolderInput}
              onChange={(e) => setAccountHolderInput(e.target.value)}
              placeholder="مثال: محمد امینی"
              className="w-full h-11 px-3 text-xs border rounded-xl border-slate-300 focus:border-[#1D616A] focus:ring-1 focus:ring-[#1D616A] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="bg-[#1D616A] hover:bg-[#174F56] text-white"
            >
              {isSubmitting ? <Spinner size="sm" /> : "ثبت و ارسال جهت تایید"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* Modal: Edit Bank Account                                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="ویرایش حساب بانکی"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            توجه: با تغییر شماره شبا یا نام صاحب حساب، وضعیت حساب جهت بررسی مجدد به «در انتظار تایید» تغییر خواهد یافت
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              شماره شبا (IBAN)
            </label>
            <input
              type="text"
              dir="ltr"
              value={shabaInput}
              onChange={(e) => handleShabaChange(e.target.value)}
              maxLength={26}
              className="w-full h-11 px-3 font-mono text-sm border rounded-xl border-slate-300 focus:border-[#1D616A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نام بانک
            </label>
            <select
              value={bankNameInput}
              onChange={(e) => setBankNameInput(e.target.value)}
              className="w-full h-11 px-3 text-xs border rounded-xl border-slate-300 focus:border-[#1D616A] outline-none bg-white"
            >
              {IRANIAN_BANKS.map((b) => (
                <option key={b.code} value={b.nameFa}>
                  {b.nameFa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              نام و نام خانوادگی صاحب حساب
            </label>
            <input
              type="text"
              value={accountHolderInput}
              onChange={(e) => setAccountHolderInput(e.target.value)}
              className="w-full h-11 px-3 text-xs border rounded-xl border-slate-300 focus:border-[#1D616A] outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="bg-[#1D616A] hover:bg-[#174F56] text-white"
            >
              {isSubmitting ? <Spinner size="sm" /> : "ذخیره تغییرات"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
