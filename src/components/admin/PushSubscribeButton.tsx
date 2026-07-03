"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

// VAPID public key는 공개값이라 상수로 둔다(어차피 클라이언트 번들에 노출됨).
const VAPID_PUBLIC_KEY =
  "BKT9nzN7VDCOKvG0NPqNz0Ll1O3zACtd1EOkCfc0mpC-aewUnDG25Zhmf5aoZHGVJPoFBfcQwj77YW2OYKDFhhk";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushSubscribeButton({
  password,
}: {
  password: string;
}) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setSubscribed(true);
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-foreground/30 disabled:opacity-40"
      title={subscribed ? "이 브라우저 알림 끄기" : "이 브라우저로 알림 받기"}
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" />
      ) : subscribed ? (
        <BellOff size={16} />
      ) : (
        <Bell size={16} />
      )}
      {subscribed ? "알림 끄기" : "알림 받기"}
    </button>
  );
}
