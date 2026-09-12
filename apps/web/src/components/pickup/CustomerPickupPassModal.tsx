'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CustomerPickupCredentialsDto } from '@loqme/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { toPersianDigits } from '@/lib/utils/persian';

interface CustomerPickupPassModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export const CustomerPickupPassModal: React.FC<CustomerPickupPassModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onVerified,
}) => {
  const [credentials, setCredentials] = useState<CustomerPickupCredentialsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch or refresh credentials
  const fetchCredentials = useCallback(async (silent = false) => {
    if (!orderId) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/pickup/credentials/${orderId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCredentials(json.data);
        setSecondsRemaining(json.data.expiresInSeconds || 60);
        if (json.data.isVerified && onVerified) {
          onVerified();
        }
      } else {
        setErrorMsg(json.message || 'خطا در دریافت اطلاعات تحویل');
      }
    } catch {
      setErrorMsg('ارتباط با سرور برقرار نشد');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [orderId, onVerified]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      fetchCredentials();
    }
  }, [isOpen, fetchCredentials]);

  // 1-second interval countdown for 60s rotation
  useEffect(() => {
    if (!isOpen || !credentials || credentials.isVerified) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchCredentials(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, credentials, fetchCredentials]);

  // Periodic status poll (every 4 seconds) to detect when merchant scans QR
  useEffect(() => {
    if (!isOpen || !credentials || credentials.isVerified) return;

    const poll = setInterval(() => {
      fetchCredentials(true);
    }, 4000);

    return () => clearInterval(poll);
  }, [isOpen, credentials, fetchCredentials]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    if (!credentials?.otpCode) return;
    navigator.clipboard.writeText(credentials.otpCode).then(() => {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      dir="rtl"
    >
      <div
        className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
          highContrast ? 'bg-white text-black ring-8 ring-white' : 'bg-surface text-on-surface'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-outline-variant/30 bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-secondary">confirmation_number</span>
            <div>
              <h2 className="font-black text-sm text-primary">ووچر دریافت حضوری لقمه</h2>
              <span className="text-[11px] text-outline font-mono">
                {credentials?.orderNumber || '...'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="بستن"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Spinner size="lg" variant="primary" className="mx-auto" />
              <p className="text-xs text-on-surface-variant">در حال تولید بارکد امن و دریافت اطلاعات...</p>
            </div>
          ) : errorMsg ? (
            <div className="py-10 text-center space-y-3">
              <span className="material-symbols-outlined text-[36px] text-error">warning</span>
              <p className="text-sm text-error font-bold">{errorMsg}</p>
              <Button size="sm" variant="secondary" onClick={() => fetchCredentials()}>
                تلاش مجدد
              </Button>
            </div>
          ) : credentials?.isVerified ? (
            /* Celebration view */
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center text-4xl mx-auto shadow-md">
                <span className="material-symbols-outlined text-[40px] text-secondary">check</span>
              </div>
              <div className="space-y-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container">
                  تحویل با موفقیت تایید شد
                </span>
                <h3 className="text-2xl font-black text-primary pt-2">
                  نوش جان!
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                  امیدواریم از لقمه‌تان نهایت لذت را ببرید. از همراهی شما در کاهش هدررفت و نجات غذا سپاسگزاریم.
                </p>
              </div>

              {credentials.verifiedAt && (
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs text-outline">
                  زمان ثبت تحویل: {new Date(credentials.verifiedAt).toLocaleTimeString('fa-IR')}
                </div>
              )}

              <Button variant="primary" size="md" rounded="pill" className="w-full mt-4 bg-primary hover:bg-primary-container text-white" onClick={onClose}>
                متشکرم
              </Button>
            </div>
          ) : (
            /* Active Pickup Pass */
            <>
              {/* High Brightness helper toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-xs">
                <span className="text-on-surface font-medium">
                  نور صفحه را برای اسکن سریع‌تر افزایش دهید
                </span>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className="px-3 py-1 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-container transition-colors shadow-xs"
                >
                  {highContrast ? 'حالت عادی' : '☀️ نور حداکثر'}
                </button>
              </div>

              {/* Dynamic QR Code Display with Stitch Corners */}
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-56 h-56 p-3 bg-white rounded-3xl border-2 border-primary-container shadow-md flex items-center justify-center">
                  {credentials?.qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={credentials.qrDataUrl}
                      alt="بارکد تحویل حضوری"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  ) : (
                    <Spinner size="md" variant="primary" />
                  )}

                  {/* Corner accents */}
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg pointer-events-none" />
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg pointer-events-none" />
                </div>

                {/* 60-Second Auto-refresh indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-secondary relative" />
                  </div>
                  <span>
                    بارکد امن پویا • انقضا و تازه‌سازی در{' '}
                    <span className="font-mono font-bold text-primary">
                      {toPersianDigits(secondsRemaining)}
                    </span>{' '}
                    ثانیه
                  </span>
                </div>
              </div>

              {/* Backup 4-Digit OTP Display */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-center space-y-2">
                <span className="text-[11px] text-on-surface-variant block">
                  کد ۴ رقمی جایگزین (در صورت عدم اسکن بارکد):
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono font-black text-3xl tracking-widest text-primary bg-white px-5 py-2 rounded-2xl border-2 border-primary-container shadow-xs">
                    {credentials?.otpCodePersian || '----'}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="p-2.5 rounded-xl border border-outline-variant/40 bg-white text-xs text-on-surface hover:text-primary hover:border-primary transition-colors"
                    title="کپی کد"
                  >
                    {copiedOtp ? '✓ کپی شد' : 'کپی'}
                  </button>
                </div>
                <p className="text-[11px] text-outline">
                  این کد را هنگام مراجعه حضوری به متصدی فروشگاه اعلام فرمایید.
                </p>
              </div>

              {/* Order & Store Details */}
              <div className="space-y-2.5 text-xs text-on-surface pt-1">
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-on-surface">
                    <span>{credentials?.merchant.businessNameFa}</span>
                    <span className="text-primary font-black">
                      {toPersianDigits(credentials?.quantity || 1)} × {credentials?.listingTitleFa}
                    </span>
                  </div>

                  {credentials?.merchant.addressFa && (
                    <p className="text-[11px] text-on-surface-variant">
                      📍 {credentials.merchant.addressFa}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 text-outline border-t border-outline-variant/20">
                    <span>بازه تحویل امروز:</span>
                    <span className="font-bold text-on-surface">
                      {credentials?.pickupWindowFa}
                    </span>
                  </div>
                </div>

                {/* Direction and Call CTAs */}
                <div className="flex items-center gap-2 pt-1">
                  {credentials?.merchant.directionsUrl && (
                    <a
                      href={credentials.merchant.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" rounded="pill" className="w-full gap-1.5 text-xs border-outline-variant text-on-surface">
                        <span className="material-symbols-outlined text-[16px]">navigation</span>
                        <span>مسیریابی نقشه</span>
                      </Button>
                    </a>
                  )}

                  {credentials?.merchant.phone && (
                    <a href={`tel:${credentials.merchant.phone}`} className="flex-1">
                      <Button variant="outline" size="sm" rounded="pill" className="w-full gap-1.5 text-xs border-outline-variant text-on-surface">
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        <span>تماس با فروشگاه</span>
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
