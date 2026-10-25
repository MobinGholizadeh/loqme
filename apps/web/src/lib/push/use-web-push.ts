"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Convert a base64url string to a Uint8Array for PushManager subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function subscribeUserToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "مرورگر شما از پوش نوتیفیکیشن پشتیبانی نمی‌کند" };
  }

  try {
    // 1. Request permission if not already granted
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "مجوز ارسال اعلان توسط شما صادر نشد" };
    }

    // 2. Fetch server public VAPID key
    const res = await fetch("/api/notifications/push/public-key");
    if (!res.ok) {
      return { success: false, error: "خطا در دریافت کلید عمومی اعلان" };
    }
    const { publicKey } = await res.json();
    if (!publicKey) {
      return { success: false, error: "کلید عمومی اعلان پیکربندی نشده است" };
    }

    // 3. Wait for service worker ready
    const registration = await navigator.serviceWorker.ready;

    // 4. Subscribe to PushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });

    // 5. Send subscription to backend
    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: "اطلاعات اشتراک نامعتبر است" };
    }

    const saveRes = await fetch("/api/notifications/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    });

    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      return { success: false, error: err.message || "خطا در ذخیره اشتراک اعلان در سرور" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[WebPush] Subscribe error:", error);
    return { success: false, error: error?.message || "خطا در فعال‌سازی پوش نوتیفیکیشن" };
  }
}

export async function unsubscribeUserFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "مرورگر شما از پوش نوتیفیکیشن پشتیبانی نمی‌کند" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch("/api/notifications/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }

    return { success: true };
  } catch (error: any) {
    console.error("[WebPush] Unsubscribe error:", error);
    return { success: false, error: error?.message || "خطا در لغو اشتراک پوش نوتیفیکیشن" };
  }
}

export function useWebPush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    const isSup = isPushSupported();
    setSupported(isSup);
    if (!isSup) {
      setPermission("unsupported");
      setIsSubscribed(false);
      return;
    }

    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const result = await subscribeUserToPush();
      await checkStatus();
      return result;
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const result = await unsubscribeUserFromPush();
      await checkStatus();
      return result;
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);

  return {
    isSupported: supported,
    permission,
    isSubscribed,
    isLoading: loading,
    subscribe,
    unsubscribe,
    refreshStatus: checkStatus,
  };
}
