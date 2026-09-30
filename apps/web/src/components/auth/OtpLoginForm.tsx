"use client";
import { useSession } from "@/components/auth/SessionProvider";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toPersianDigits, isValidIranianMobile } from "@/lib/utils/persian";
import { safeLoginRedirect } from '@loqme/validation';

interface OtpLoginFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
  audience?: 'customer' | 'business';
  embedded?: boolean;
  preventRedirect?: boolean;
}

export const OtpLoginForm: React.FC<OtpLoginFormProps> = ({
  onSuccess,
  redirectPath,
  audience = 'customer',
  embedded = false,
  preventRedirect = false,
}) => {
  const session = useSession();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [mobile, setMobile] = useState("");
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
    setError(null);
    console.log('[LOGIN-TRACE][Client] handleRequestOtp called', { phoneToSubmit });

    if (!isValidIranianMobile(phoneToSubmit)) {
      console.warn('[LOGIN-TRACE][Client] Invalid Iranian mobile number entered', { phoneToSubmit });
      setError(
        "لطفاً یک شماره موبایل معتبر ایران (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید",
      );
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOGIN-TRACE][Client] Sending POST /api/auth/request-otp');
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phoneToSubmit }),
      });

      const data = await res.json().catch(() => null);
      console.log('[LOGIN-TRACE][Client] POST /api/auth/request-otp response', {
        status: res.status,
        ok: res.ok,
        data,
      });

      if (!res.ok || !data?.success) {
        const errorMsg = data?.message || "خطا در ارسال کد تایید";
        console.warn('[LOGIN-TRACE][Client] Request OTP rejected', { errorMsg });
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      setMobile(data.mobile);
      setStep("OTP");
      setCountdown(data.expiresInSeconds || 120);
      console.log('[LOGIN-TRACE][Client] Transitioned to step OTP', { mobile: data.mobile });
    } catch (err) {
      console.error('[LOGIN-TRACE][Client] Request OTP fetch error', err);
      setError("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    setError(null);
    console.log('[LOGIN-TRACE][Client] handleVerifyOtp called', { mobile, codeLength: code?.length });

    if (!code || code.length !== 5) {
      console.warn('[LOGIN-TRACE][Client] Code length invalid', { codeLength: code?.length });
      setError("کد تایید باید ۵ رقم باشد");
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOGIN-TRACE][Client] Sending POST /api/auth/verify-otp', { mobile });
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code }),
      });

      const data = await res.json().catch(() => null);
      console.log('[LOGIN-TRACE][Client] POST /api/auth/verify-otp response', {
        status: res.status,
        ok: res.ok,
        data,
      });

      if (!res.ok || !data?.success) {
        const errorMsg = data?.message || "کد تایید اشتباه است";
        console.warn('[LOGIN-TRACE][Client] verify-otp failed', { status: res.status, errorMsg });
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // A successful OTP response alone does not prove the browser stored its cookie.
      console.log('[LOGIN-TRACE][Client] Fetching /api/auth/session to confirm cookie persistence');
      const sessionResponse = await fetch('/api/auth/session', {
        cache: 'no-store', credentials: 'same-origin',
      });
      console.log('[LOGIN-TRACE][Client] /api/auth/session status', { status: sessionResponse.status, ok: sessionResponse.ok });

      if (!sessionResponse.ok) {
        console.error('[LOGIN-TRACE][Client] /api/auth/session returned non-200');
        throw new Error('Session unavailable');
      }

      const persisted = await sessionResponse.json().catch(() => null);
      console.log('[LOGIN-TRACE][Client] /api/auth/session payload', persisted);

      if (!persisted?.authenticated || !persisted?.user) {
        console.warn('[LOGIN-TRACE][Client] Cookie was not persisted by browser', persisted);
        session.setUser(null);
        setError('ورود ذخیره نشد. کوکی‌های مرورگر را فعال کنید و دوباره وارد شوید.');
        return;
      }

      session.setUser(persisted.user);
      if (onSuccess) onSuccess();
      if (preventRedirect) {
        console.log('[LOGIN-TRACE][Client] preventRedirect is true, halting redirect');
        return;
      }

      const role = persisted.user.role;
      const merchant = role === 'MERCHANT_OWNER' || role === 'MERCHANT_STAFF';
      const destination = audience === 'business'
        ? merchant
          ? (targetRedirect && /^\/merchant(?:\/|\?|$)/.test(targetRedirect) ? targetRedirect : '/merchant')
          : role === 'ADMIN' ? '/admin' : '/business/status'
        : targetRedirect || (merchant ? '/merchant' : role === 'ADMIN' ? '/admin' : '/explore');

      console.log('[LOGIN-TRACE][Client] Redirecting to destination:', destination);
      // OTP uses a route handler: Next's existing anonymous Link-prefetch redirects
      // survive cookie changes. A new document clears that router cache at login.
      window.location.replace(destination);
    } catch (err) {
      console.error('[LOGIN-TRACE][Client] Error in handleVerifyOtp exception caught:', err);
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
    <div className="space-y-7">
      <div className="space-y-3">
        <span className="text-xs font-bold text-loqme-primary-700">
          به لقمه خوش آمدید
        </span>
        <Heading className={embedded ? 'text-xl font-bold' : 'text-3xl font-extrabold'}>
          {step === "PHONE" ? (audience === 'business' ? 'ورود به حساب کسب‌وکار' : 'ورود یا ثبت‌نام') : "کد تایید را وارد کنید"}
        </Heading>
        <p className="text-sm text-loqme-neutral-600">
          {step === "PHONE"
            ? (audience === 'business' ? 'با شماره موبایل مالک یا همکار فروشگاه وارد شوید.' : "با شماره موبایل وارد شوید و لقمه بعدی‌تان را کشف کنید.")
            : `کد ۵ رقمی به ${toPersianDigits(mobile)} ارسال شد.`}
        </p>
      </div>
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
            onChange={(e) => setMobile(digits(e.target.value))}
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
    </div>
  );
};
