'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download01Icon, Cancel01Icon } from 'hugeicons-react';

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

  return (
    <AnimatePresence mode="wait">
      {showPrompt && (
        <motion.div
          key="pwa-install-banner"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: 40,
            scale: 0.92,
            transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 inset-x-4 max-w-md mx-auto z-50 bg-[#135E66] text-white rounded-2xl p-4 shadow-2xl border border-teal-600/50 flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-black/5">
              <img src="/logo.png" alt="لقمه" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-black text-white leading-snug">نصب برنامه وب لقمه</div>
              <div className="text-[11px] text-teal-100/90 mt-0.5 font-medium">
                دسترسی سریع‌تر، رزرو آسان‌تر و ذخیره آفلاین
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-white hover:bg-teal-50 text-[#135E66] font-black text-xs py-2 px-4 rounded-full shadow-md transition-all active:scale-95 flex items-center gap-1.5 border border-white cursor-pointer"
            >
              <Download01Icon size={14} className="stroke-[2.5]" />
              <span>نصب</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="بستن اعلان"
              className="text-teal-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
            >
              <Cancel01Icon size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* iOS Safari Instruction Modal */}
      {showIosGuide && (
        <motion.div
          key="ios-guide-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIosGuide(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.25 } }}
            className="bg-white text-stone-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-sm text-[#135E66]">نصب در آیفون و آیپد (iOS)</h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <Cancel01Icon size={18} />
              </button>
            </div>

            <div className="space-y-3.5 my-5 text-xs text-stone-600 leading-relaxed">
              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                <span className="w-6 h-6 rounded-full bg-[#135E66] text-white flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                  ۱
                </span>
                <span>
                  در نوار پایین مرورگر سافاری روی دکمه <strong className="text-stone-800">اشتراک‌گذاری (Share)</strong> بزنید.
                </span>
              </div>

              <div className="flex items-start gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                <span className="w-6 h-6 rounded-full bg-[#135E66] text-white flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                  ۲
                </span>
                <span>
                  منو را بالا بکشید و گزینه <strong className="text-stone-800">«Add to Home Screen» (افزودن به صفحه اصلی)</strong> را انتخاب کنید.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full bg-[#135E66] hover:bg-[#0e484e] text-white rounded-full py-2.5 text-xs font-bold shadow-md transition-all active:scale-98 cursor-pointer"
            >
              متوجه شدم
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
