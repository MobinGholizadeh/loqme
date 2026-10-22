"use client";
import { RippleButton } from "@/components/magicui/ripple-button";

import { DialogSurface } from "@/components/ui/DialogSurface";
import * as RedesignIcons from "lucide-react";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CustomerPickupCredentialsDto } from "@loqme/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toPersianDigits, formatToman } from "@/lib/utils/persian";

interface CustomerPickupPassModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

export const CustomerPickupPassModal: React.FC<
  CustomerPickupPassModalProps
> = ({ orderId, isOpen, onClose, onVerified }) => {
  const [credentials, setCredentials] =
    useState<CustomerPickupCredentialsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch or refresh credentials
  const fetchCredentials = useCallback(
    async (silent = false) => {
      if (!orderId) return;
      const version = ++requestVersion.current;
      if (!silent) setIsLoading(true);
      try {
        const res = await fetch(`/api/pickup/credentials/${orderId}`);
        const json = await res.json();
        if (version !== requestVersion.current) return;
        if (res.ok && json.success && json.data) {
          setErrorMsg(null);
          setCredentials(json.data);
          setSecondsRemaining(json.data.expiresInSeconds || 60);
          if (json.data.isVerified && onVerified) {
            onVerified();
          }
        } else {
          setErrorMsg(json.message || "خطا در دریافت اطلاعات تحویل");
        }
      } catch {
        if (version === requestVersion.current) setErrorMsg("ارتباط با سرور برقرار نشد");
      } finally {
        if (!silent && version === requestVersion.current) setIsLoading(false);
      }
    },
    [orderId, onVerified],
  );

  // Initial load
  useEffect(() => {
    if (isOpen) {
      setCredentials(null);
      fetchCredentials();
    }
    return () => {
      requestVersion.current += 1;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [isOpen, fetchCredentials]);

  // 1-second interval countdown for 60s rotation
  useEffect(() => {
    if (!isOpen || !credentials || credentials.isVerified) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Token expired, silently fetch fresh dynamic token
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

  const copyToClipboard = async () => {
    if (!credentials?.otpCode) return;
    try {
      await navigator.clipboard.writeText(credentials.otpCode);
      setCopiedOtp(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedOtp(false), 2000);
    } catch {
      setCopiedOtp(false);
    }
  };

  return (
    <DialogSurface onClose={onClose} label="کارت تحویل حضوری لقمه">
      <div
        className={`relative w-full max-w-md rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${
          highContrast
            ? "bg-white text-black ring-8 ring-white"
            : "bg-white text-loqme-neutral-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-loqme-neutral-100 bg-loqme-neutral-50/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟️</span>
            <div>
              <h2 className="font-black text-sm text-loqme-neutral-900">
                کارت تحویل حضوری لقمه
              </h2>
              <span className="text-[11px] text-loqme-neutral-500 font-mono">
                {credentials?.orderNumber || "..."}
              </span>
            </div>
          </div>
          <RippleButton
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-loqme-neutral-500 hover:text-loqme-neutral-700 hover:bg-loqme-neutral-100 transition-colors"
            aria-label="بستن"
          >
            ✕
          </RippleButton>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Spinner size="lg" variant="primary" className="mx-auto" />
              <p className="text-xs text-loqme-neutral-500">
                در حال تولید بارکد امن و دریافت اطلاعات…
              </p>
            </div>
          ) : errorMsg ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-3xl">
                <RedesignIcons.TriangleAlert size={20} aria-hidden="true" />
              </div>
              <p className="text-sm text-loqme-danger-600 font-bold">
                {errorMsg}
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fetchCredentials()}
              >
                تلاش مجدد
              </Button>
            </div>
          ) : credentials?.isVerified ? (
            /* Warm celebration view upon completed handoff */
            <div className="py-8 text-center space-y-4 animate-scale-up">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-md">
                ✓
              </div>
              <div className="space-y-1.5">
                <Badge variant="success" size="md">
                  تحویل با موفقیت تایید شد
                </Badge>
                <h3 className="text-2xl font-black text-loqme-neutral-900 pt-2">
                  نوش جان!
                </h3>
                <p className="text-xs text-loqme-neutral-600 leading-relaxed max-w-xs mx-auto">
                  امیدواریم از لقمه‌تان لذت ببرید؛ از همراهی شما در نجات خوراکی‌های خوشمزه
                  و مراقبت از طبیعت و محله سپاسگزاریم
                </p>
              </div>

              {credentials.verifiedAt && (
                <div className="p-3 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-100 text-xs text-loqme-neutral-500">
                  زمان ثبت تحویل:{" "}
                  {new Date(credentials.verifiedAt).toLocaleTimeString("fa-IR")}
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                className="w-full mt-4"
                onClick={onClose}
              >
                متشکرم
              </Button>
            </div>
          ) : (
            /* Active Pickup Pass */
            <>
              {/* High Brightness helper toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-loqme-primary-50 border border-loqme-primary-200 text-xs">
                <span className="text-loqme-primary-900 font-medium">
                  نمایش بارکد با کنتراست بیشتر
                </span>
                <RippleButton
                  onClick={() => setHighContrast(!highContrast)}
                  role="switch"
                  aria-checked={highContrast}
                  className="px-2.5 py-1 rounded-lg bg-loqme-primary-600 text-white text-[11px] font-bold hover:bg-loqme-primary-700 transition-colors shadow-xs"
                >
                  {highContrast ? "فعال" : "غیرفعال"}
                </RippleButton>
              </div>

              {/* Dynamic QR Code Display */}
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-56 h-56 p-2 bg-white rounded-lg border-2 border-loqme-primary-500 shadow-card flex items-center justify-center">
                  {credentials?.qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={credentials.qrDataUrl}
                      alt="بارکد تحویل حضوری"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Spinner size="md" variant="primary" />
                  )}

                  {/* Corner brackets overlay */}
                  <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-loqme-primary-600 rounded-tr-lg pointer-events-none" />
                  <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-loqme-primary-600 rounded-tl-lg pointer-events-none" />
                  <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-loqme-primary-600 rounded-br-lg pointer-events-none" />
                  <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-loqme-primary-600 rounded-bl-lg pointer-events-none" />
                </div>

                {/* 60-Second Auto-refresh indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-loqme-neutral-500">
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-loqme-primary-500 animate-ping absolute" />
                    <span className="w-2 h-2 rounded-full bg-loqme-primary-600 relative" />
                  </div>
                  <span>
                    بارکد امن پویا • بروزرسانی خودکار در{" "}
                    <span className="font-mono font-bold text-loqme-primary-800">
                      {toPersianDigits(secondsRemaining)}
                    </span>{" "}
                    ثانیه
                  </span>
                </div>
              </div>

              {/* Backup 4-Digit OTP Display */}
              <div className="p-4 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-200 text-center space-y-2">
                <span className="text-[11px] text-loqme-neutral-500 block">
                  کد ۴ رقمی جایگزین (در صورت عدم اسکن بارکد):
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono font-black text-3xl tracking-widest text-loqme-primary-800 bg-white px-5 py-2 rounded-lg border-2 border-loqme-primary-300 shadow-xs">
                    {credentials?.otpCodePersian || "----"}
                  </span>
                  <RippleButton
                    onClick={copyToClipboard}
                    className="p-2.5 rounded-lg border border-loqme-neutral-200 bg-white text-xs text-loqme-neutral-600 hover:text-loqme-primary-700 hover:border-loqme-primary-300 transition-colors"
                    title="کپی کد"
                  >
                    {copiedOtp ? "کپی شد" : "کپی کد"}
                  </RippleButton>
                </div>
                <p className="text-[11px] text-loqme-neutral-500">
                  این کد را هنگام مراجعه حضوری به فروشنده اعلام نمایید
                </p>
              </div>

              {/* Order & Store Details */}
              <div className="space-y-2.5 text-xs text-loqme-neutral-700 pt-1">
                <div className="p-3 rounded-lg bg-loqme-neutral-50 border border-loqme-neutral-100 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-loqme-neutral-900">
                    <span>{credentials?.merchant.businessNameFa}</span>
                    <span className="text-loqme-primary-700">
                      {toPersianDigits(credentials?.quantity || 1)} ×{" "}
                      {credentials?.listingTitleFa}
                    </span>
                  </div>

                  {credentials?.merchant.addressFa && (
                    <p className="text-[11px] text-loqme-neutral-500">
                      📍 {credentials.merchant.addressFa}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 text-loqme-neutral-500 border-t border-loqme-neutral-100">
                    <span>بازه تحویل امروز:</span>
                    <span className="font-bold text-loqme-neutral-800">
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
                      className="action-link secondary flex-1 w-full gap-1.5 text-xs"
                    >
                      <span>🗺️</span>
                      <span>مسیریابی نقشه</span>
                    </a>
                  )}

                  {credentials?.merchant.phone && (
                    <a
                      href={`tel:${credentials.merchant.phone}`}
                      className="action-link secondary flex-1 w-full gap-1.5 text-xs"
                    >
                      <span>
                        <RedesignIcons.Phone size={20} aria-hidden="true" />
                      </span>
                      <span>تماس با فروشگاه</span>
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DialogSurface>
  );
};
