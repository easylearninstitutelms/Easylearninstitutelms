"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationSetup() {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        Notification.permission === "denied"
      ) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setEnabled(true);
        } else if (!cancelled) {
          setVisible(true);
        }
      } catch (error) {
        console.error("Push setup check failed:", error);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  async function enablePush() {
    setBusy(true);
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const keyResponse = await fetch("/api/notifications/subscribe", { cache: "no-store" });
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(keyData?.error || "Push notifications are not configured.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        }));

      const saveResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData?.error || "Failed to enable notifications.");
      }

      setEnabled(true);
      setVisible(false);
    } catch (error) {
      console.error("Push notification setup failed:", error);
      window.alert(error instanceof Error ? error.message : "Failed to enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible && !enabled) return null;

  return (
    <>
      {!visible && enabled && (
        <button type="button" className="fixed bottom-5 left-5 z-[65] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-lg">
          🔔 Notifications On
        </button>
      )}
    <div className="fixed bottom-5 right-5 z-[70] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl">
      <p className="font-bold text-slate-800">🔔 Turn on notifications</p>
      <p className="mt-1 text-sm text-slate-500">
        Get Easylearn notices on your device even when the student portal is not open.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => setVisible(false)} className="btn btn-outline btn-sm">Later</button>
        <button type="button" onClick={enablePush} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Enabling..." : "Enable Notifications"}
        </button>
      </div>
    </div>
      {visible && null}
    </>
  );
}
