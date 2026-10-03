"use client";
import { useSession } from "@/components/auth/SessionProvider";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toPersianDigits, isValidIranianMobile } from "@/lib/utils/persian";
import { safeLoginRedirect } from '@loqme/validation';
import { AlertCircle, UserX, UserPlus, LogIn, CheckCircle2, ArrowLeft } from "lucide-react";

interface OtpLoginFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
  audience?: 'customer' | 'business';
  embedded?: boolean;
  preventRedirect?: boolean;
  initialMode?: 'login' | 'register';
}

export const OtpLoginForm: React.FC<OtpLoginFormProps> = ({
  onSuccess,
  redirectPath,
  audience = 'customer',
  embedded = false,
  preventRedirect = false,
  initialMode,
}) => {
  const session = useSession();
  const searchParams = useSearchParams();

  const queryMobile = searchParams.get("mobile") || "";
  const queryMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState<'login' | 'register'>(initialMode || queryMode);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [mobile, setMobile] = useState(queryMobile);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);

  // Target destination after login
  const targetRedirect = safeLoginRedirect(
    redirectPath ||
    searchParams.get("redirect") ||
    searchParams.get("returnUrl") ||
    null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "OTP" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Request OTP
  const handleRequestOtp = async (targetMobile?: string) => {
    const phoneToSubmit = targetMobile || mobile;
    if (isLoading) return;
    setError(null);
    setAccountNotFound(false);
    setAccountAlreadyExists(false);

    if (!isValidIranianMobile(phoneToSubmit)) {
      setError(
        "لطفاً یک شماره موبایل معتبر ایران (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید",
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = { mobile: phoneToSubmit, mode, audience };

      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        if (data?.code === 'ACCOUNT_NOT_FOUND') {
          setAccountNotFound(true);
          setError(data?.message || "حسابی با این شماره موبایل یافت نشد.");
        } else if (data?.code === 'ACCOUNT_ALREADY_EXISTS') {
          setAccountAlreadyExists(true);
          setError(data?.message || "این شماره موبایل قبلاً در لقمه ثبت شده است.");
        } else {
          setError(data?.message || "خطا در ارسال کد تایید");
        }
        setIsLoading(false);
        return;
      }

      setMobile(data.mobile);
      setStep("OTP");
      setCountdown(data.expiresInSeconds || 120);
    } catch {
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    setError(null);

    if (!code || code.length !== 5) {
      setError("کد تایید باید ۵ رقم باشد");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.message || "کد تایید اشتباه است");
        setIsLoading(false);
        return;
      }

      // A successful OTP response alone does not prove the browser stored its cookie.
      const sessionResponse = await fetch('/api/auth/session', {
        cache: 'no-store', credentials: 'same-origin',
      });

      if (!sessionResponse.ok) {
        throw new Error('Session unavailable');
      }

      const persisted = await sessionResponse.json().catch(() => null);

      if (!persisted?.authenticated || !persisted?.user) {
        session.setUser(null);
        setError('ورود ذخیره نشد. کوکی‌های مرورگر را فعال کنید و دوباره وارد شوید.');
        return;
      }

      session.setUser(persisted.user);
      if (onSuccess) onSuccess();
      if (preventRedirect) {
        return;
      }

      const role = persisted.user.role;
      const merchant = role === 'MERCHANT_OWNER' || role === 'MERCHANT_STAFF';
      const destination = audience === 'business'
        ? merchant
          ? (targetRedirect && /^\/merchant(?:\/|\?|$)/.test(targetRedirect) ? targetRedirect : '/merchant')
          : role === 'ADMIN' ? '/admin' : '/business/status'
        : targetRedirect || (merchant ? '/merchant' : role === 'ADMIN' ? '/admin' : '/explore');

      // OTP uses a route handler: Next's existing anonymous Link-prefetch redirects
      // survive cookie changes. A new document clears that router cache at login.
      window.location.replace(destination);
    } catch {
      setError("خطا در تایید کد");
    } finally {
      setIsLoading(false);
    }
  };

  const digits = (value: string) =>
    value
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  const Heading = embedded ? 'h2' : 'h1';

  return (
    <div className="space-y-6">
      {(audience === 'customer' || embedded) && step === 'PHONE' && (
        <div className="flex p-1 bg-loqme-neutral-100 rounded-xl border border-loqme-neutral-200/80 text-sm font-medium">
          <button
            type="button"
            disabled={isLoading}
            aria-pressed={mode === 'login'}
            onClick={() => {
              setMode('login');
              setError(null);
              setAccountNotFound(false);
              setAccountAlreadyExists(false);
            }}
            className={`flex-1 py-2 rounded-lg transition-all text-center text-sm ${
              mode === 'login'
                ? 'bg-white text-loqme-primary-700 shadow-sm font-bold'
                : 'text-loqme-neutral-600 hover:text-loqme-neutral-900 font-normal'
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            disabled={isLoading}
            aria-pressed={mode === 'register'}
            onClick={() => {
              setMode('register');
              setError(null);
              setAccountNotFound(false);
              setAccountAlreadyExists(false);
            }}
            className={`flex-1 py-2 rounded-lg transition-all text-center text-sm ${
              mode === 'register'
                ? 'bg-white text-loqme-primary-700 shadow-sm font-bold'
                : 'text-loqme-neutral-600 hover:text-loqme-neutral-900 font-normal'
            }`}
          >
            ثبت‌نام
          </button>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-xs font-bold text-loqme-primary-700">
          به لقمه خوش آمدید
        </span>
        <Heading className={embedded ? 'text-xl font-bold' : 'text-2xl lg:text-3xl font-extrabold text-loqme-neutral-900'}>
          {step === "PHONE"
            ? (audience === 'business'
                ? 'ورود به حساب کسب‌وکار'
                : (mode === 'login' ? 'ورود به حساب کاربری' : 'ثبت‌نام در لقمه'))
            : "کد تایید را وارد کنید"}
        </Heading>
        <p className="text-sm text-loqme-neutral-600">
          {step === "PHONE"
            ? (audience === 'business'
                ? 'با شماره موبایل مالک یا همکار فروشگاه وارد شوید.'
                : (mode === 'login'
                    ? 'با شماره موبایل خود وارد شوید و به لقمه‌های ذخیره‌شده دسترسی پیدا کنید.'
                    : 'با شماره موبایل ثبت‌نام کنید و لذت کشف طعم‌های تازه را تجربه کنید.'))
            : `کد ۵ رقمی به ${toPersianDigits(mobile)} ارسال شد.`}
        </p>
      </div>

      {step === 'PHONE' && accountNotFound && (
        <div
          className="p-4 rounded-xl border border-amber-300 bg-amber-50/95 text-amber-950 space-y-3 shadow-sm transition-all"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <UserX size={18} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-amber-900">حساب کاربری با این شماره یافت نشد</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                {audience === 'business'
                  ? 'این شماره موبایل در سیستم همکاران لقمه ثبت نشده است. برای ثبت فروشگاه، از بخش ثبت کسب‌وکار اقدام فرمایید.'
                  : 'هنوز با این شماره در لقمه حساب ندارید. برای ادامه، ثبت‌نام کنید.'}
              </p>
            </div>
          </div>
          <div className="pt-1">
            {audience === 'business' ? (
              <Link
                href="/business"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-loqme-primary-700 text-white hover:bg-loqme-primary-800 transition-colors shadow-sm gap-1.5"
              >
                ثبت‌نام کسب‌وکار در لقمه
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setAccountNotFound(false);
                  setError(null);
                }}
                className="inline-flex items-center justify-center w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-loqme-primary-700 text-white hover:bg-loqme-primary-800 transition-colors shadow-sm gap-1.5"
              >
                <UserPlus size={16} aria-hidden="true" />
                ثبت‌نام با همین شماره ({toPersianDigits(mobile)})
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'PHONE' && accountAlreadyExists && (
        <div
          className="p-4 rounded-xl border border-teal-300 bg-teal-50/95 text-teal-950 space-y-3 shadow-sm transition-all"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700 shrink-0 mt-0.5">
              <CheckCircle2 size={18} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-teal-900">حساب کاربری از قبل وجود دارد</h3>
              <p className="text-xs text-teal-800 leading-relaxed">
                این شماره موبایل قبلاً در لقمه ثبت شده است. نیازی به ثبت‌نام مجدد ندارید و می‌توانید مستقیماً وارد شوید.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setAccountAlreadyExists(false);
                setError(null);
              }}
              className="inline-flex items-center justify-center w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-loqme-primary-700 text-white hover:bg-loqme-primary-800 transition-colors shadow-sm gap-1.5"
            >
              <LogIn size={16} aria-hidden="true" />
              ورود به حساب کاربری ({toPersianDigits(mobile)})
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "PHONE") handleRequestOtp();
          else handleVerifyOtp();
        }}
        className="space-y-5"
      >
        {step === "PHONE" ? (
          <Input
            key="phone"
            label="شماره موبایل"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            value={mobile}
            onChange={(e) => {
              setMobile(digits(e.target.value));
              if (error) setError(null);
              if (accountNotFound) setAccountNotFound(false);
              if (accountAlreadyExists) setAccountAlreadyExists(false);
            }}
            error={error || undefined}
            dir="ltr"
          />
        ) : (
          <Input
            key="otp"
            label="کد تایید ۵ رقمی"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={5}
            placeholder="۱۲۳۴۵"
            autoFocus
            value={code}
            onChange={(e) =>
              setCode(digits(e.target.value).replace(/\D/g, "").slice(0, 5))
            }
            error={error || undefined}
            dir="ltr"
            className="text-center text-xl"
          />
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isLoading}
          disabled={step === "PHONE" ? !mobile : code.length !== 5}
        >
          {step === "PHONE" ? "دریافت کد تایید" : "تایید و ورود"}
        </Button>
        {step === "OTP" && (
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setStep("PHONE");
                setCode("");
                setError(null);
              }}
            >
              ویرایش شماره
            </Button>
            <Button
              variant="ghost"
              type="button"
              disabled={countdown > 0 || isLoading}
              onClick={() => handleRequestOtp()}
            >
              {countdown > 0
                ? `ارسال مجدد تا ${toPersianDigits(countdown)} ثانیه`
                : "ارسال مجدد کد"}
            </Button>
          </div>
        )}
      </form>

      {!embedded && audience === 'customer' && step === 'PHONE' && (
        <div className="text-center pt-1 border-t border-loqme-neutral-100">
          {mode === 'login' ? (
            <p className="text-xs text-loqme-neutral-600">
              هنوز در لقمه حساب کاربری ندارید؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setAccountNotFound(false);
                  setAccountAlreadyExists(false);
                }}
                className="text-loqme-primary-700 font-bold hover:underline underline-offset-4"
              >
                ثبت‌نام کنید
              </button>
            </p>
          ) : (
            <p className="text-xs text-loqme-neutral-600">
              قبلاً در لقمه ثبت‌نام کرده‌اید؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setAccountNotFound(false);
                  setAccountAlreadyExists(false);
                }}
                className="text-loqme-primary-700 font-bold hover:underline underline-offset-4"
              >
                ورود به حساب
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
