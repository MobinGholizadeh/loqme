'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker in browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Service worker registered successfully
        })
        .catch((err) => {
          console.warn('ServiceWorker registration failed:', err);
        });
    }

    // 2. Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. Check if previously dismissed in this session
    const isDismissed = sessionStorage.getItem('loqme_pwa_dismissed');
    if (isDismissed) {
      return;
    }

    // 4. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // Delay showing prompt slightly for natural feel
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // 5. Handle Android/Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    sessionStorage.setItem('loqme_pwa_dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom PWA Banner */}
      <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-50 bg-[#135E66] text-white rounded-2xl p-4 shadow-2xl border border-teal-600/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm">
            <img src="/logo.png" alt="لقمه" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-xs font-bold leading-snug">نصب برنامه وب لقمه</div>
            <div className="text-[11px] text-teal-100 opacity-90 mt-0.5">
              دسترسی سریع‌تر، رزرو آسان‌تر و ذخیره آفلاین
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="bg-white text-[#135E66] hover:bg-stone-100 text-xs font-bold py-1.5 px-3 rounded-full shadow-sm"
          >
            نصب
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="بستن"
            className="text-teal-200 hover:text-white p-1.5 rounded-lg text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="bg-white text-stone-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-sm text-[#135E66]">نصب در آیفون و آیپد (iOS)</h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-stone-400 hover:text-stone-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 my-5 text-xs text-stone-600 leading-relaxed">
              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="w-6 h-6 rounded-full bg-[#135E66] text-white flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                  ۱
                </span>
                <span>
                  در نوار پایین مرورگر سافاری روی دکمه <strong className="text-stone-800">اشتراک‌گذاری (Share 📤)</strong> بزنید.
                </span>
              </div>

              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="w-6 h-6 rounded-full bg-[#135E66] text-white flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                  ۲
                </span>
                <span>
                  منو را بالا بکشید و گزینه <strong className="text-stone-800">«Add to Home Screen» (افزودن به صفحه اصلی ➕)</strong> را انتخاب کنید.
                </span>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              className="w-full bg-[#135E66] hover:bg-[#0e484e] text-white rounded-full py-2.5 text-xs font-semibold"
            >
              متوجه شدم
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
