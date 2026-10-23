"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  Receipt,
  Info,
} from "lucide-react";
import {
  formatToman,
  toPersianDigits,
  toEnglishDigits,
} from "@loqme/validation";
import type {
  MerchantWalletSummaryDto,
  MerchantPayoutRequestDto,
  MerchantBankAccountDto,
} from "@loqme/types";

export function MerchantWalletWithdrawalsSection({
  onNavigateToAccounts,
}: {
  onNavigateToAccounts?: () => void;
}) {
  const [wallet, setWallet] = useState<MerchantWalletSummaryDto | null>(null);
  const [requests, setRequests] = useState<MerchantPayoutRequestDto[]>([]);
  const [approvedAccounts, setApprovedAccounts] = useState<MerchantBankAccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const fetchData = useCallback(async () => {
    setLoadError("");
    try {
      const [payoutsRes, accountsRes] = await Promise.all([
        fetch("/api/merchant/payouts"),
        fetch("/api/merchant/bank-accounts"),
      ]);

      const payoutsJson = await payoutsRes.json();
      const accountsJson = await accountsRes.json();

      if (!payoutsRes.ok || !payoutsJson.success) {
        throw new Error(payoutsJson.message || "خطا در دریافت اطلاعات تسویه‌ها");
      }

      setWallet(payoutsJson.data.wallet);
      setRequests(payoutsJson.data.requests || []);

      if (accountsJson.success && Array.isArray(accountsJson.data)) {
        const approved = accountsJson.data.filter(
          (a: MerchantBankAccountDto) => a.status === "APPROVED"
        );
        setApprovedAccounts(approved);

        // Preselect default account if available
        const defaultAcc = approved.find((a: MerchantBankAccountDto) => a.isDefault);
        if (defaultAcc) {
          setSelectedAccountId(defaultAcc.id);
        } else if (approved.length > 0) {
          setSelectedAccountId(approved[0].id);
        }
      }
    } catch (err: any) {
      setLoadError(err.message || "خطا در دریافت اطلاعات کیف پول");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenWithdrawModal = () => {
    setAmountInput("");
    setNotesInput("");
    setFormError("");

    if (approvedAccounts.length === 0) {
      alert("برای ثبت درخواست تسویه، ابتدا باید حداقل یک حساب بانکی تایید شده ثبت نمایید.");
      onNavigateToAccounts?.();
      return;
    }

    const defaultAcc = approvedAccounts.find((a) => a.isDefault);
    if (defaultAcc) {
      setSelectedAccountId(defaultAcc.id);
    } else if (approvedAccounts.length > 0) {
      setSelectedAccountId(approvedAccounts[0].id);
    }

    setIsModalOpen(true);
  };

  const handleQuickAmount = (ratio: number) => {
    if (!wallet) return;
    const target = Math.floor(wallet.availableBalanceToman * ratio);
    setAmountInput(String(target));
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedAccountId) {
      setFormError("انتخاب حساب بانکی مقصد الزامی است.");
      return;
    }

    const numericAmount = parseInt(toEnglishDigits(amountInput).replace(/,/g, ""), 10);
    if (isNaN(numericAmount) || numericAmount < 10000) {
      setFormError("حداقل مبلغ قابل تسویه ۱۰,۰۰۰ تومان است.");
      return;
    }

    if (wallet && numericAmount > wallet.availableBalanceToman) {
      setFormError(`مبلغ درخواستی بیشتر از موجودی قابل تسویه شما می‌باشد (مانده: ${formatToman(wallet.availableBalanceToman)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/merchant/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: selectedAccountId,
          amountToman: numericAmount,
          notesFa: notesInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "ثبت درخواست تسویه انجام نشد");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || "خطا در ثبت درخواست تسویه");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableBalance = wallet?.availableBalanceToman || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available to Withdraw */}
        <Card
          variant="elevated"
          className="p-5 bg-gradient-to-br from-[#123338] via-[#1D616A] to-[#28757A] text-white rounded-2xl shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/80">
              مانده قابل برداشت کیف پول
            </span>
            <Wallet size={20} className="text-[#84E1BC]" />
          </div>
          <div className="text-2xl font-black mt-3 tracking-tight">
            {formatToman(availableBalance)}
          </div>
          <p className="text-[11px] text-white/70 mt-1">
            آماده واریز آنی پایا به حساب بانکی
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenWithdrawModal}
            className="mt-4 w-full bg-white text-[#1D616A] hover:bg-[#F0FDFA] font-bold border-white/20 shadow-2xs text-xs"
          >
            <ArrowDownToLine size={16} />
            <span>ثبت درخواست تسویه</span>
          </Button>
        </Card>

        {/* Pending Payouts */}
        <Card variant="elevated" className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              در صف بررسی و تسویه
            </span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-3">
            {formatToman(wallet?.pendingPayoutsToman || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            درخواست‌های تسویه در انتظار تایید پایا
          </p>
        </Card>

        {/* Completed Payouts */}
        <Card variant="elevated" className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              کل مبالغ تسویه شده
            </span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-3">
            {formatToman(wallet?.completedPayoutsToman || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            واریز شده به حساب بانکی همکار
          </p>
        </Card>

        {/* Total Net Earnings */}
        <Card variant="elevated" className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              خالص درآمد فروشگاه
            </span>
            <Receipt size={18} className="text-[#1D616A]" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-3">
            {formatToman(wallet?.netEarningsToman || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            پس از کسر ۱۰٪ کارمزد مصوب لقمه
          </p>
        </Card>
      </div>

      {/* Default Account Quick Info */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Building2 size={18} className="text-[#1D616A]" />
          <span>حساب پیش‌فرض تسویه:</span>
          {wallet?.defaultBankAccount ? (
            <span className="font-bold text-slate-900 font-mono">
              {wallet.defaultBankAccount.bankName} — {wallet.defaultBankAccount.shabaNumber}
            </span>
          ) : (
            <span className="text-amber-700 font-bold">
              حساب بانکی تایید شده به عنوان پیش‌فرض ثبت نشده است
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onNavigateToAccounts}
          className="text-[#1D616A] hover:underline font-bold text-xs"
        >
          مدیریت و تغییر حساب‌های بانکی ←
        </button>
      </div>

      {/* Payout Requests History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <Receipt size={18} className="text-[#1D616A]" />
            <span>تاریخچه درخواست‌های تسویه و برداشت</span>
          </h3>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            className="text-xs gap-1.5"
          >
            <span>بروزرسانی وضعیت</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <Spinner size="lg" variant="primary" className="mx-auto" />
            <p className="text-xs text-slate-500">در حال دریافت تاریخچه تسویه‌ها…</p>
          </div>
        ) : loadError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {loadError}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="هیچ درخواست تسویه‌ای ثبت نشده است"
            description="پس از فروش و دریافت سفارش‌ها، می‌توانید با ثبت درخواست تسویه، مبالغ را به حساب بانکی خود واریز نمایید."
            action={
              <Button variant="primary" size="sm" onClick={handleOpenWithdrawModal}>
                + ثبت درخواست تسویه
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">تاریخ ثبت</th>
                  <th className="p-3.5">مبلغ درخواستی</th>
                  <th className="p-3.5">بانک و شماره شبا مقصد</th>
                  <th className="p-3.5">صاحب حساب</th>
                  <th className="p-3.5">وضعیت تسویه</th>
                  <th className="p-3.5">کد پیگیری پایا / توضیحات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString("fa-IR")}
                      <span className="block text-[10px] text-slate-400">
                        {new Date(req.createdAt).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-slate-900 text-sm">
                      {formatToman(req.amountToman)}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">
                        {req.bankAccount?.bankName || "بانک"}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 tracking-wider" dir="ltr">
                        {req.bankAccount?.shabaNumber || "-"}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {req.bankAccount?.accountHolder || "-"}
                    </td>
                    <td className="p-3.5">
                      {req.status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 size={13} />
                          <span>تسویه شد</span>
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
                          <Clock size={13} />
                          <span>تایید شده (در نوبت پایا)</span>
                        </span>
                      )}
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Clock size={13} />
                          <span>در صف بررسی</span>
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle size={13} />
                          <span>رد شده</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {req.trackingReference ? (
                        <div className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2.5 py-1 rounded-md inline-block" dir="ltr">
                          {req.trackingReference}
                        </div>
                      ) : req.rejectionReason ? (
                        <span className="text-rose-600 text-xs leading-relaxed block max-w-xs">
                          {req.rejectionReason}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">در حال پردازش</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* Modal: Request Payout Withdrawal                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="درخواست تسویه موجودی کیف پول"
      >
        <form onSubmit={handleSubmitWithdrawal} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs leading-relaxed">
              {formError}
            </div>
          )}

          {/* Balance Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600">مانده قابل برداشت شما:</span>
            <span className="text-base font-black text-[#1D616A]">
              {formatToman(availableBalance)}
            </span>
          </div>

          {/* Select Bank Account */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              حساب بانکی مقصد <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-11 px-3 text-xs border rounded-xl border-slate-300 focus:border-[#1D616A] focus:ring-1 focus:ring-[#1D616A] outline-none bg-white font-medium"
            >
              <option value="">انتخاب حساب بانکی…</option>
              {approvedAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} — {acc.accountHolder} ({acc.shabaNumber})
                  {acc.isDefault ? " [پیش‌فرض]" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مبلغ تسویه (تومان) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={amountInput ? toPersianDigits(Number(amountInput).toLocaleString()) : ""}
                onChange={(e) => {
                  const raw = toEnglishDigits(e.target.value).replace(/[^0-9]/g, "");
                  setAmountInput(raw);
                }}
                placeholder="۱۰,۰۰۰"
                className="w-full h-11 px-3 font-mono text-sm border rounded-xl border-slate-300 focus:border-[#1D616A] outline-none"
              />
              <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">
                تومان
              </span>
            </div>

            {/* Quick chips */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-500">انتخاب سریع:</span>
              <button
                type="button"
                onClick={() => handleQuickAmount(0.25)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                ۲۵٪
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(0.5)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                ۵۰٪
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(1)}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#EFF7F4] hover:bg-[#E2F0EC] text-[#174F56] border border-[#BCD8D1] transition-colors"
              >
                کل موجودی
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              توضیحات (اختیاری)
            </label>
            <textarea
              rows={2}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="توضیحات مربوط به این درخواست تسویه…"
              className="w-full p-3 text-xs border rounded-xl border-slate-300 focus:border-[#1D616A] outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || availableBalance < 10000}
              className="bg-[#1D616A] hover:bg-[#174F56] text-white"
            >
              {isSubmitting ? <Spinner size="sm" /> : "تایید و ارسال درخواست"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
