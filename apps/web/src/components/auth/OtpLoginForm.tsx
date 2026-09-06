'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toPersianDigits, isValidIranianMobile } from '@/lib/utils/persian';

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

      // Determine smart redirect based on role or URL param
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
    <Card className="auth-card max-w-md w-full mx-auto p-6" variant="elevated">
      <div className="auth-header text-center mb-6">
        <div className="brand-badge mb-2">
          <span className="brand-logo-text">لقمه</span>
          <span className="brand-subtitle">Loqme</span>
        </div>
        <h2 className="auth-title">
          {step === 'PHONE' ? 'ورود یا ثبت‌نام در لقمه' : 'کد تایید پیامک‌شده'}
        </h2>
        <p className="auth-desc">
          {step === 'PHONE'
            ? 'برای دسترسی به بسته‌های شگفت‌انگیز و پنل مدیریت، شماره خود را وارد کنید.'
            : `کد تایید به شماره ${toPersianDigits(mobile)} ارسال شد.`}
        </p>
      </div>

      {step === 'PHONE' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRequestOtp();
          }}
          className="auth-form space-y-4"
        >
          <Input
            label="شماره موبایل"
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            error={error || undefined}
            autoFocus
            dir="ltr"
            prefixElement={<span className="text-muted">🇮🇷 +۹۸</span>}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            disabled={!mobile}
          >
            دریافت کد تایید
          </Button>

          {/* Quick Demo Test Buttons */}
          <div className="demo-presets-box mt-6 p-4 rounded-xl border border-dashed border-loqme-neutral-300 bg-loqme-neutral-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-loqme-neutral-700">
                🚀 ورود سریع با حساب‌های آزمایشی:
              </span>
              <Badge variant="brand" size="sm">
                تست سریع M01
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                className="preset-btn"
                onClick={() => selectPreset('09121111111')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">👤 سارا محمدی</span>
                  <Badge variant="neutral" size="sm">
                    مشتری (Customer)
                  </Badge>
                </div>
                <span className="text-xs text-muted font-mono dir-ltr text-right">09121111111</span>
              </button>

              <button
                type="button"
                className="preset-btn"
                onClick={() => selectPreset('09122222222')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">🥖 علی رضایی (نانوایی برکت)</span>
                  <Badge variant="brand" size="sm">
                    فروشگاه (Merchant)
                  </Badge>
                </div>
                <span className="text-xs text-muted font-mono dir-ltr text-right">09122222222</span>
              </button>

              <button
                type="button"
                className="preset-btn"
                onClick={() => selectPreset('09123333333')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">🛡️ مدیر ارشد سامانه</span>
                  <Badge variant="danger" size="sm">
                    مدیر (Admin)
                  </Badge>
                </div>
                <span className="text-xs text-muted font-mono dir-ltr text-right">09123333333</span>
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
          className="auth-form space-y-4"
        >
          {/* Dev OTP Helper Box */}
          {devReceivedOtp && (
            <div className="p-3 bg-loqme-primary-50 border border-loqme-primary-200 rounded-lg flex items-center justify-between mb-2 animate-fadeIn">
              <div className="text-xs text-loqme-primary-900">
                💡 <span className="font-semibold">کد تایید آزمایشی شما:</span>{' '}
                <span className="font-bold text-sm tracking-widest text-loqme-primary-600 font-mono">
                  {devReceivedOtp}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCode(devReceivedOtp)}
              >
                درج خودکار
              </Button>
            </div>
          )}

          <Input
            label="کد تایید ۵ رقمی"
            placeholder="مثال: ۱۲۳۴۵"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error || undefined}
            maxLength={5}
            autoFocus
            dir="ltr"
            className="text-center font-mono text-xl tracking-widest"
          />

          <div className="flex items-center justify-between text-xs text-loqme-neutral-600">
            <span>
              {countdown > 0 ? (
                <>اعتبار کد: {toPersianDigits(countdown)} ثانیه</>
              ) : (
                <span className="text-loqme-danger-500">کد منقضی شد</span>
              )}
            </span>

            <button
              type="button"
              className="text-loqme-primary-600 hover:underline disabled:opacity-50 text-xs"
              onClick={() => handleRequestOtp()}
              disabled={countdown > 0 || isLoading}
            >
              ارسال مجدد کد
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            disabled={code.length !== 5}
          >
            تایید و ورود
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted"
            onClick={() => {
              setStep('PHONE');
              setCode('');
              setError(null);
            }}
          >
            ویرایش شماره موبایل
          </Button>
        </form>
      )}

      <style jsx>{`
        .auth-card {
          border-radius: var(--radius-xl);
          background: var(--color-bg-surface);
        }

        .brand-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--loqme-primary-50);
          padding: 4px 16px;
          border-radius: var(--radius-full);
          border: 1px solid var(--loqme-primary-200);
        }

        .brand-logo-text {
          font-weight: 800;
          font-size: 1.25rem;
          color: var(--loqme-primary-600);
        }

        .brand-subtitle {
          font-size: 0.75rem;
          color: var(--loqme-primary-400);
          font-weight: 600;
        }

        .auth-title {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-top: var(--space-2);
        }

        .auth-desc {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-1);
        }

        .preset-btn {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: right;
          background: #ffffff;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-subtle);
          cursor: pointer;
          transition: border-color 150ms var(--ease-out), transform 150ms var(--ease-out);
        }

        .preset-btn:hover {
          border-color: var(--loqme-primary-400);
          transform: translateY(-1px);
        }

        .preset-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </Card>
  );
};
