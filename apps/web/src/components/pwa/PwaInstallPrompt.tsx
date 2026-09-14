"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Download, X, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    // 1. Register Service Worker in browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    }

    // 2. Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. Check if previously dismissed in this session
    const isDismissed = sessionStorage.getItem("loqme_pwa_dismissed");
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

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
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
    if (choiceResult.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    sessionStorage.setItem("loqme_pwa_dismissed", "true");
  };

  if (/^\/(checkout|listings|orders|merchant|admin|login)(\/|$)/.test(pathname))
    return null;
  return (
    <>
      {showPrompt && (
        <aside className="pwa-banner" aria-label="نصب لقمه">
          <div>
            <strong>لقمه در صفحه اصلی</strong>
            <p>دسترسی سریع به بسته‌های محله</p>
          </div>
          <Button
            size="sm"
            rightIcon={<Download size={18} />}
            onClick={handleInstallClick}
          >
            نصب
          </Button>
          <button
            className="icon-button"
            aria-label="بستن اعلان"
            onClick={handleDismiss}
          >
            <X size={18} />
          </button>
        </aside>
      )}
      <Modal
        isOpen={showIosGuide}
        onClose={() => setShowIosGuide(false)}
        title="افزودن لقمه به صفحه اصلی"
        footer={<Button onClick={handleDismiss}>متوجه شدم</Button>}
      >
        <ol className="space-y-5 text-sm">
          <li className="flex gap-3">
            <Share size={22} className="shrink-0" />
            در سافاری، منوی اشتراک‌گذاری (Share) را باز کنید.
          </li>
          <li className="flex gap-3">
            <PlusSquare size={22} className="shrink-0" />
            گزینه «افزودن به صفحه اصلی» (Add to Home Screen) را انتخاب کنید.
          </li>
        </ol>
      </Modal>
    </>
  );
};
