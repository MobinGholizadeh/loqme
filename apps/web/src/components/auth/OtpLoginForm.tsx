"use client";
import { useSession } from "@/components/auth/SessionProvider";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toPersianDigits, isValidIranianMobile } from "@/lib/utils/persian";

interface OtpLoginFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
}

export const OtpLoginForm: React.FC<OtpLoginFormProps> = ({
  onSuccess,
  redirectPath,
}) => {
  const router = useRouter();
  const session = useSession();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);

  // Target destination after login
  const targetRedirect =
    redirectPath ||
    searchParams.get("redirect") ||
    searchParams.get("returnUrl") ||
    null;

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

    if (!isValidIranianMobile(phoneToSubmit)) {
      setError(
        "لطفاً یک شماره موبایل معتبر ایران (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید",
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phoneToSubmit }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "خطا در ارسال کد تایید");
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

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "کد تایید اشتباه است");
        setIsLoading(false);
        return;
      }

      // Success
      if (data.user) session.setUser(data.user);
      else await session.refresh();
      if (onSuccess) {
        onSuccess();
      }

      // Smart redirect
      if (targetRedirect) {
        router.push(targetRedirect);
      } else if (
        data.user?.role === "MERCHANT_OWNER" ||
        data.user?.role === "MERCHANT_STAFF"
      ) {
        router.push("/merchant");
      } else if (data.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/explore");
      }
      router.refresh();
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
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <span className="text-xs font-bold text-loqme-primary-700">
          به لقمه خوش آمدید
        </span>
        <h1 className="text-3xl font-extrabold">
          {step === "PHONE" ? "ورود یا ثبت‌نام" : "کد تایید را وارد کنید"}
        </h1>
        <p className="text-sm text-loqme-neutral-600">
          {step === "PHONE"
            ? "با شماره موبایل وارد شوید و لقمه بعدی‌تان را کشف کنید."
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
