"use client";

import React, { Suspense } from "react";
import { MerchantBankAccountsSection } from "@/components/merchant/MerchantBankAccountsSection";
import { MerchantWalletWithdrawalsSection } from "@/components/merchant/MerchantWalletWithdrawalsSection";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";
import { Wallet, ArrowLeft } from "lucide-react";

export default function MerchantAccountsPage() {
  const [activeTab, setActiveTab] = React.useState<"accounts" | "withdrawals">("accounts");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            حساب‌های بانکی و تسویه
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت حساب‌های بانکی متصل به شتاب، تعیین حساب پیش‌فرض و درخواست تسویه کیف پول
          </p>
        </div>

        <Link
          href="/merchant/finance"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D616A] hover:underline"
        >
          <Wallet size={16} />
          <span>مشاهده صورت‌حساب دفاتر کل</span>
          <ArrowLeft size={14} />
        </Link>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "accounts"
              ? "bg-[#1D616A] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>حساب‌های بانکی همکار</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("withdrawals")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "withdrawals"
              ? "bg-[#1D616A] text-white shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>درخواست‌های تسویه و برداشت</span>
        </button>
      </div>

      {activeTab === "accounts" ? (
        <MerchantBankAccountsSection />
      ) : (
        <MerchantWalletWithdrawalsSection onNavigateToAccounts={() => setActiveTab("accounts")} />
      )}
    </div>
  );
}
