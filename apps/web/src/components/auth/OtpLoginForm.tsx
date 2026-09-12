'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoqmeLogo } from '@/components/ui/LoqmeLogo';
import { toPersianDigits, isValidIranianMobile } from '@/lib/utils/persian';
import {
  UserIcon,
  Store01Icon,
  SparklesIcon,
  ArrowRight01Icon,
} from 'hugeicons-react';
import { Icons } from '@/components/ui/icons';

interface OtpLoginFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
}

export const OtpLoginForm: React.FC<OtpLoginFormProps> = ({
  onSuccess,
  redirectPath,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [devReceivedOtp, setDevReceivedOtp] = useState<string | null>(null);

  // Target destination after login
  const targetRedirect =
    redirectPath || searchParams.get('redirect') || searchParams.get('returnUrl') || null;

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
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
      setError('لطفاً یک شماره موبایل معتبر ایران (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phoneToSubmit }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'خطا در ارسال کد تایید');
        setIsLoading(false);
        return;
      }

      setMobile(data.mobile);
      setStep('OTP');
      setCountdown(data.expiresInSeconds || 120);

      // Fetch the dev OTP automatically for testing convenience
      try {
        const devRes = await fetch(`/api/auth/dev-otp?mobile=${encodeURIComponent(data.mobile)}`);
        const devData = await devRes.json();
        if (devData.record?.code) {
          setDevReceivedOtp(devData.record.code);
        }
      } catch {
        // dev endpoint not active or in prod
      }
    } catch {
      setError('خطا در برقراری ارتباط با سرور');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    setError(null);
    if (!code || code.length !== 5) {
      setError('کد تایید باید ۵ رقم باشد');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'کد تایید اشتباه است');
        setIsLoading(false);
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }

      // Smart redirect
      if (targetRedirect) {
        router.push(targetRedirect);
      } else if (data.user?.role === 'MERCHANT_OWNER' || data.user?.role === 'MERCHANT_STAFF') {
        router.push('/merchant');
      } else if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/explore');
      }
      router.refresh();
    } catch {
      setError('خطا در تایید کد');
    } finally {
      setIsLoading(false);
    }
  };

  // Preset demo account selection
  const selectPreset = (phone: string) => {
    setMobile(phone);
    handleRequestOtp(phone);
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-right space-y-2">
        <div className="md:hidden flex justify-center mb-4">
          <LoqmeLogo size="md" variant="stacked" theme="teal" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight">
          {step === 'PHONE' ? 'ورود به حساب کاربری' : 'کد تایید پیامک‌شده'}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
          {step === 'PHONE'
            ? 'برای دسترسی به بسته‌های شگفت‌انگیز محله خود و مدیریت سفارشات، شماره همراه خود را وارد کنید.'
            : `کد تایید ۵ رقمی به شماره ${toPersianDigits(mobile)} ارسال گردید.`}
        </p>
      </div>

      {step === 'PHONE' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRequestOtp();
          }}
          className="space-y-4"
        >
          <div className="space-y-1 text-right">
            <Input
              label="شماره موبایل"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              error={error || undefined}
              autoFocus
              dir="ltr"
              prefixElement={<span className="text-stone-400 font-mono text-xs select-none">IR +۹۸</span>}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#135E66] hover:bg-[#0e484e] text-white font-black rounded-full h-12 shadow-sm transition-all"
            isLoading={isLoading}
            disabled={!mobile}
          >
            دریافت کد تایید
          </Button>

          {/* Business Sign Up CTA (Matching Screenshot 2 & 3) */}
          <div className="pt-2">
            <Link href="/merchant/register" className="block w-full">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full border-2 border-[#135E66] text-[#135E66] hover:bg-teal-50 rounded-full h-12 font-bold transition-all text-xs sm:text-sm"
              >
                ثبت‌نام و همکاری فروشگاه‌ها (Sign up your food business)
              </Button>
            </Link>
          </div>

          {/* Quick Demo Test Buttons */}
          <div className="mt-6 p-4 rounded-2xl border border-stone-200 bg-stone-50/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <SparklesIcon size={15} className="text-teal-600" />
                <span>ورود سریع با حساب‌های آزمایشی:</span>
              </span>
              <Badge variant="neutral" size="sm">
                تستی
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                className="flex flex-col gap-1 text-right bg-white hover:bg-teal-50/50 p-3 rounded-xl border border-stone-200 hover:border-teal-400 cursor-pointer transition-all active:scale-[0.99] shadow-xs"
                onClick={() => selectPreset('09121111111')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                    <UserIcon size={14} className="text-stone-500" />
                    <span>سارا محمدی</span>
                  </span>
                  <Badge variant="neutral" size="sm">
                    مشتری (Customer)
                  </Badge>
                </div>
                <span className="text-[11px] text-stone-400 font-mono dir-ltr text-right">09121111111</span>
              </button>

              <button
                type="button"
                className="flex flex-col gap-1 text-right bg-white hover:bg-teal-50/50 p-3 rounded-xl border border-stone-200 hover:border-teal-400 cursor-pointer transition-all active:scale-[0.99] shadow-xs"
                onClick={() => selectPreset('09122222222')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                    <Store01Icon size={14} className="text-teal-600" />
                    <span>علی رضایی (نانوایی برکت)</span>
                  </span>
                  <Badge variant="brand" size="sm">
                    فروشگاه (Merchant)
                  </Badge>
                </div>
                <span className="text-[11px] text-stone-400 font-mono dir-ltr text-right">09122222222</span>
              </button>

              <button
                type="button"
                className="flex flex-col gap-1 text-right bg-white hover:bg-teal-50/50 p-3 rounded-xl border border-stone-200 hover:border-teal-400 cursor-pointer transition-all active:scale-[0.99] shadow-xs"
                onClick={() => selectPreset('09123333333')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                    <Icons.Shield size={14} className="text-stone-600" />
                    <span>مدیر ارشد سامانه</span>
                  </span>
                  <Badge variant="danger" size="sm">
                    مدیر (Admin)
                  </Badge>
                </div>
                <span className="text-[11px] text-stone-400 font-mono dir-ltr text-right">09123333333</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyOtp();
          }}
          className="space-y-4"
        >
          {/* Dev OTP Helper Box */}
          {devReceivedOtp && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between mb-2">
              <div className="text-xs text-teal-900">
                <span className="font-semibold">کد تایید آزمایشی:</span>{' '}
                <span className="font-black text-sm tracking-widest text-[#135E66] font-mono">
                  {devReceivedOtp}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCode(devReceivedOtp)}
                className="text-xs py-1 px-3"
              >
                درج خودکار
              </Button>
            </div>
          )}

          <Input
            label="کد تایید ۵ رقمی"
            placeholder="۱۲۳۴۵"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            error={error || undefined}
            autoFocus
            dir="ltr"
            maxLength={5}
            hint={`ارسال مجدد کد پس از ${toPersianDigits(countdown)} ثانیه`}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#135E66] hover:bg-[#0e484e] text-white font-black rounded-full h-12 shadow-sm transition-all"
            isLoading={isLoading}
            disabled={code.length !== 5}
          >
            تایید و ورود
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs text-stone-500 hover:text-stone-800"
            onClick={() => {
              setStep('PHONE');
              setCode('');
              setError(null);
            }}
          >
            <ArrowRight01Icon size={14} className="ml-1" />
            <span>ویرایش شماره موبایل</span>
          </Button>
        </form>
      )}
    </div>
  );
};
