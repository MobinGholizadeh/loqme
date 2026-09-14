import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LoqmeLogo } from "@/components/ui/LoqmeLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-lg p-8 shadow-sm border border-stone-200/80 flex flex-col items-center">
        <LoqmeLogo size="md" variant="horizontal" theme="dark" />

        <div className="w-24 h-24 my-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
          <span className="text-3xl font-black text-loqme-primary-600">
            ۴۰۴
          </span>
        </div>

        <h1 className="text-xl font-bold text-loqme-neutral-900 mb-2">
          صفحه مورد نظر پیدا نشد
        </h1>

        <p className="text-sm text-loqme-neutral-600 leading-relaxed mb-6">
          نشانی وارد شده معتبر نیست یا ممکن است این بسته یا فروشگاه تغییر یافته
          باشد.
        </p>

        <div className="w-full space-y-3">
          <Link
            href="/explore"
            className="action-link block w-full w-full bg-loqme-primary-600 hover:bg-[#0e484e] text-white rounded-full py-2.5 text-sm font-medium shadow-sm"
          >
            🔍 جستجو و کاوش بسته‌ها
          </Link>

          <Link
            href="/"
            className="action-link secondary block w-full w-full border-loqme-neutral-200 text-loqme-neutral-700 hover:bg-stone-50 rounded-full py-2.5 text-sm font-medium"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
