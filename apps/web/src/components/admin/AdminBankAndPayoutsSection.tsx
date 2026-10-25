"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Receipt,
  Check,
  X,
  CreditCard,
  Send,
} from "lucide-react";
import { formatToman, toPersianDigits } from "@loqme/validation";

interface AdminBankAccountItem {
  id: string;
  merchantId: string;
  merchantNameFa: string;
  merchantOwnerMobile: string;
  shabaNumber: string;
  bankName: string;
  bankCode?: string | null;
  accountHolder: string;
  isDefault: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  reviewedByMobile?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

interface AdminPayoutRequestItem {
  id: string;
  merchantId: string;
  merchantNameFa: string;
  merchantOwnerMobile: string;
  bankAccountId: string;
  bankAccount: {
    id: string;
    shabaNumber: string;
    bankName: string;
    accountHolder: string;
  };
  amountToman: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  trackingReference?: string | null;
  rejectionReason?: string | null;
  notesFa?: string | null;
  requestedByMobile: string;
  reviewedByMobile?: string | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export function AdminBankAndPayoutsSection() {
  const [activeSubTab, setActiveSubTab] = useState<"accounts" | "payouts">("accounts");

  // Bank Accounts State
  const [accounts, setAccounts] = useState<AdminBankAccountItem[]>([]);
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);

  // Payouts State
  const [payouts, setPayouts] = useState<AdminPayoutRequestItem[]>([]);
  const [payoutFilter, setPayoutFilter] = useState<string>("ALL");
  const [isPayoutsLoading, setIsPayoutsLoading] = useState(true);

  // Modals State
  const [rejectAccountModal, setRejectAccountModal] = useState<{ isOpen: boolean; accountId: string }>(
    { isOpen: false, accountId: "" }
  );
  const [rejectPayoutModal, setRejectPayoutModal] = useState<{ isOpen: boolean; payoutId: string }>(
    { isOpen: false, payoutId: "" }
  );
  const [completePayoutModal, setCompletePayoutModal] = useState<{
    isOpen: boolean;
    payoutId: string;
    amountToman: number;
    shabaNumber: string;
  }>({ isOpen: false, payoutId: "", amountToman: 0, shabaNumber: "" });

  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [trackingReferenceInput, setTrackingReferenceInput] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    setIsAccountsLoading(true);
    try {
      const url = accountFilter === "ALL" ? "/api/admin/finance/bank-accounts" : `/api/admin/finance/bank-accounts?status=${accountFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAccountsLoading(false);
    }
  }, [accountFilter]);

  // Fetch Payouts
  const fetchPayouts = useCallback(async () => {
    setIsPayoutsLoading(true);
    try {
      const url = payoutFilter === "ALL" ? "/api/admin/finance/payouts" : `/api/admin/finance/payouts?status=${payoutFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setPayouts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPayoutsLoading(false);
    }
  }, [payoutFilter]);

  useEffect(() => {
    if (activeSubTab === "accounts") {
      fetchAccounts();
    } else {
      fetchPayouts();
    }
  }, [activeSubTab, fetchAccounts, fetchPayouts]);

  // Review Account (Approve)
  const handleApproveAccount = async (accId: string) => {
    if (!window.confirm("آیا از تایید این حساب بانکی اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/admin/finance/bank-accounts/${accId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "خطا در تایید حساب");
        return;
      }
      fetchAccounts();
    } catch {
      alert("خطا در ارتباط با سرور");
    }
  };

  // Review Account (Reject Submit)
  const handleRejectAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (!rejectionReasonInput.trim()) {
      setActionError("ذکر علت رد حساب الزامی است");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/bank-accounts/${rejectAccountModal.accountId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReasonInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "خطا در رد حساب");
      }
      setRejectAccountModal({ isOpen: false, accountId: "" });
      setRejectionReasonInput("");
      fetchAccounts();
    } catch (err: any) {
      setActionError(err.message || "خطا در ثبت درخواست");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payout Actions
  const handleApprovePayout = async (payoutId: string) => {
    if (!window.confirm("آیا این درخواست تسویه برای واریز پایا تایید گردد؟")) return;
    try {
      const res = await fetch(`/api/admin/finance/payouts/${payoutId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || "خطا در تایید تسویه");
        return;
      }
      fetchPayouts();
    } catch {
      alert("خطا در ارتباط با سرور");
    }
  };

  const handleRejectPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (!rejectionReasonInput.trim()) {
      setActionError("ذکر علت رد تسویه الزامی است");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/payouts/${rejectPayoutModal.payoutId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReasonInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "خطا در رد تسویه");
      }
      setRejectPayoutModal({ isOpen: false, payoutId: "" });
      setRejectionReasonInput("");
      fetchPayouts();
    } catch (err: any) {
      setActionError(err.message || "خطا در ثبت درخواست");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    if (!trackingReferenceInput.trim()) {
      setActionError("ثبت کد رهگیری واریز پایا/ساتنا الزامی است");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/payouts/${completePayoutModal.payoutId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "COMPLETE",
          trackingReference: trackingReferenceInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "خطا در نهایی‌سازی تسویه");
      }
      setCompletePayoutModal({ isOpen: false, payoutId: "", amountToman: 0, shabaNumber: "" });
      setTrackingReferenceInput("");
      fetchPayouts();
    } catch (err: any) {
      setActionError(err.message || "خطا در نهایی‌سازی تسویه");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === "accounts"
              ? "bg-[#1D616A] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Building2 size={16} />
          <span>تایید حساب‌های بانکی همکاران</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("payouts")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === "payouts"
              ? "bg-[#1D616A] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Send size={16} />
          <span>درخواست‌های تسویه و برداشت</span>
        </button>
      </div>

      {/* SUBTAB 1: Bank Accounts Queue */}
      {activeSubTab === "accounts" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600">فیلتر وضعیت:</span>
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAccountFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                    accountFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" && "همه"}
                  {st === "PENDING" && "در انتظار بررسی"}
                  {st === "APPROVED" && "تایید شده"}
                  {st === "REJECTED" && "رد شده"}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchAccounts}
              className="text-xs"
            >
              بروزرسانی
            </Button>
          </div>

          {isAccountsLoading ? (
            <div className="py-16 text-center space-y-2">
              <Spinner size="lg" variant="primary" className="mx-auto" />
              <p className="text-xs text-slate-500">در حال دریافت حساب‌های بانکی…</p>
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              title="موردی یافت نشد"
              description="هیچ حساب بانکی با فیلتر انتخابی وجود ندارد"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">نام فروشگاه و مالک</th>
                    <th className="p-3.5">بانک و شماره شبا</th>
                    <th className="p-3.5">صاحب حساب</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5">تاریخ ثبت</th>
                    <th className="p-3.5 text-center">عملیات مدیریت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <strong className="font-bold text-slate-900 block">
                          {acc.merchantNameFa}
                        </strong>
                        <span className="text-slate-500 text-[11px]">
                          {toPersianDigits(acc.merchantOwnerMobile)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block">
                          {acc.bankName}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium" dir="ltr">
                          {acc.shabaNumber}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">
                        {acc.accountHolder}
                      </td>
                      <td className="p-3.5">
                        {acc.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            <span>تایید شده</span>
                          </span>
                        )}
                        {acc.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            <span>در انتظار تایید</span>
                          </span>
                        )}
                        {acc.status === "REJECTED" && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <XCircle size={12} />
                              <span>رد شده</span>
                            </span>
                            {acc.rejectionReason && (
                              <p className="text-[10px] text-rose-600 mt-1 max-w-xs">
                                {acc.rejectionReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {new Date(acc.createdAt).toLocaleDateString("fa-IR")}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {acc.status !== "APPROVED" && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApproveAccount(acc.id)}
                              className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <Check size={13} />
                              <span>تایید</span>
                            </Button>
                          )}
                          {acc.status !== "REJECTED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectionReasonInput("");
                                setActionError("");
                                setRejectAccountModal({ isOpen: true, accountId: acc.id });
                              }}
                              className="text-[11px] h-7 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200 gap-1"
                            >
                              <X size={13} />
                              <span>رد</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Payout Requests Queue */}
      {activeSubTab === "payouts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600">فیلتر وضعیت:</span>
              {["ALL", "PENDING", "APPROVED", "COMPLETED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPayoutFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                    payoutFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" && "همه"}
                  {st === "PENDING" && "در صف بررسی"}
                  {st === "APPROVED" && "در نوبت پایا"}
                  {st === "COMPLETED" && "تسویه شده"}
                  {st === "REJECTED" && "رد شده"}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchPayouts}
              className="text-xs"
            >
              بروزرسانی
            </Button>
          </div>

          {isPayoutsLoading ? (
            <div className="py-16 text-center space-y-2">
              <Spinner size="lg" variant="primary" className="mx-auto" />
              <p className="text-xs text-slate-500">در حال دریافت درخواست‌های تسویه…</p>
            </div>
          ) : payouts.length === 0 ? (
            <EmptyState
              title="موردی یافت نشد"
              description="هیچ درخواست تسویه‌ای با فیلتر انتخابی وجود ندارد"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3.5">فروشگاه و ثبت‌کننده</th>
                    <th className="p-3.5">مبلغ تسویه</th>
                    <th className="p-3.5">بانک و شبا مقصد</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5">کد رهگیری / علت رد</th>
                    <th className="p-3.5 text-center">عملیات تسویه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <strong className="font-bold text-slate-900 block">
                          {p.merchantNameFa}
                        </strong>
                        <span className="text-slate-500 text-[11px]">
                          {toPersianDigits(p.merchantOwnerMobile)}
                        </span>
                      </td>
                      <td className="p-3.5 font-black text-slate-900 text-sm">
                        {formatToman(p.amountToman)}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block">
                          {p.bankAccount.bankName} — {p.bankAccount.accountHolder}
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium" dir="ltr">
                          {p.bankAccount.shabaNumber}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {p.status === "COMPLETED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 size={12} />
                            <span>تسویه شد</span>
                          </span>
                        )}
                        {p.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
                            <Clock size={12} />
                            <span>تایید شده (در نوبت پایا)</span>
                          </span>
                        )}
                        {p.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock size={12} />
                            <span>در صف بررسی</span>
                          </span>
                        )}
                        {p.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <XCircle size={12} />
                            <span>رد شده</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.trackingReference ? (
                          <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded" dir="ltr">
                            {p.trackingReference}
                          </span>
                        ) : p.rejectionReason ? (
                          <span className="text-rose-600 text-[11px] leading-relaxed block max-w-xs">
                            {p.rejectionReason}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApprovePayout(p.id)}
                              className="text-[11px] h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white"
                            >
                              تایید برای پایا
                            </Button>
                          )}

                          {(p.status === "PENDING" || p.status === "APPROVED") && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setTrackingReferenceInput("");
                                setActionError("");
                                setCompletePayoutModal({
                                  isOpen: true,
                                  payoutId: p.id,
                                  amountToman: p.amountToman,
                                  shabaNumber: p.bankAccount.shabaNumber,
                                });
                              }}
                              className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              تکمیل و ثبت کد پیگیری
                            </Button>
                          )}

                          {(p.status === "PENDING" || p.status === "APPROVED") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectionReasonInput("");
                                setActionError("");
                                setRejectPayoutModal({ isOpen: true, payoutId: p.id });
                              }}
                              className="text-[11px] h-7 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                            >
                              رد
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Reject Bank Account */}
      <Modal
        isOpen={rejectAccountModal.isOpen}
        onClose={() => setRejectAccountModal({ isOpen: false, accountId: "" })}
        title="رد حساب بانکی همکار"
      >
        <form onSubmit={handleRejectAccountSubmit} className="space-y-4 pt-2">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            لطفاً دلیل رد حساب بانکی را جهت اطلاع همکار وارد نمایید:
          </p>

          <div>
            <textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="مثال: مغایرت نام صاحب حساب با پروانه صنفی کسب‌وکار"
              className="w-full p-3 text-xs border rounded-xl border-slate-300 focus:border-rose-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setRejectAccountModal({ isOpen: false, accountId: "" })}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? <Spinner size="sm" /> : "ثبت رد حساب"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Payout */}
      <Modal
        isOpen={completePayoutModal.isOpen}
        onClose={() => setCompletePayoutModal({ isOpen: false, payoutId: "", amountToman: 0, shabaNumber: "" })}
        title="تکمیل تسویه بانکی و ثبت کد رهگیری"
      >
        <form onSubmit={handleCompletePayoutSubmit} className="space-y-4 pt-2">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">مبلغ تسویه:</span>
              <strong className="font-black text-slate-900 text-sm">
                {formatToman(completePayoutModal.amountToman)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">شماره شبا مقصد:</span>
              <span className="font-mono text-slate-700" dir="ltr">
                {completePayoutModal.shabaNumber}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              شماره پیگیری پایا / ساتنا <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={trackingReferenceInput}
              onChange={(e) => setTrackingReferenceInput(e.target.value)}
              placeholder="مثال: PAYA-14030723-982314"
              className="w-full h-11 px-3 font-mono text-sm border rounded-xl border-slate-300 focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCompletePayoutModal({ isOpen: false, payoutId: "", amountToman: 0, shabaNumber: "" })}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? <Spinner size="sm" /> : "تکمیل و نهایی‌سازی تسویه"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reject Payout */}
      <Modal
        isOpen={rejectPayoutModal.isOpen}
        onClose={() => setRejectPayoutModal({ isOpen: false, payoutId: "" })}
        title="رد درخواست تسویه همکار"
      >
        <form onSubmit={handleRejectPayoutSubmit} className="space-y-4 pt-2">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {actionError}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            توجه: با رد این درخواست، مبلغ تسویه مجدداً به مانده قابل برداشت کیف پول همکار بازگردانده خواهد شد
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              علت رد درخواست تسویه <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="علت رد درخواست تسویه…"
              className="w-full p-3 text-xs border rounded-xl border-slate-300 focus:border-rose-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setRejectPayoutModal({ isOpen: false, payoutId: "" })}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? <Spinner size="sm" /> : "رد درخواست تسویه"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
