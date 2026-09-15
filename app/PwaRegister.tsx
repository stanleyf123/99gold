"use client";

import { useEffect, useState } from "react";
import { LOCALE_STORAGE_KEY, t, type Locale } from "./locale";

function localeFromDevice(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "ja" || stored === "zh") return stored;
  } catch {
    /* ignore */
  }
  return "zh";
}

export default function PwaRegister() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [offline, setOffline] = useState(false);
  const [cachedQuotes, setCachedQuotes] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLocale(localeFromDevice()));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    let reloading = false;
    const staleServerAction = (reason: unknown) => {
      const message = String(
        reason && typeof reason === "object" && "message" in reason
          ? (reason as { message?: unknown }).message
          : reason ?? "",
      );
      if (reloading) return;
      if (!/Failed to find Server Action/i.test(message)) return;
      reloading = true;
      window.location.reload();
    };
    const onRejection = (event: PromiseRejectionEvent) => staleServerAction(event.reason);
    const onError = (event: ErrorEvent) => staleServerAction(event.error ?? event.message);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    if (!offline || !("caches" in window)) return;
    caches.open("99gold-quotes-v2")
      .then((cache) => cache.keys())
      .then((keys) => setCachedQuotes(keys.some((request) => new URL(request.url).pathname === "/api/global-quotes")))
      .catch(() => setCachedQuotes(false));
  }, [offline]);

  if (!offline) return null;
  return (
    <div className="offlineBanner" role="status">
      {cachedQuotes
        ? t(locale, "目前離線，顯示最後成功快取的行情，請看頁面上的「行情時間／本站檢查」。", "You are offline. Showing the last cached quotes — use the on-page quote/check times.", "オフラインです。最後にキャッシュした相場を表示します。ページの相場時刻／確認時刻をご覧ください。")
        : t(locale, "目前離線，且本機尚無快取行情。連上網路後會自動重試。", "You are offline and no cached quotes are stored yet. The site will retry when you are back online.", "オフラインで、キャッシュされた相場もありません。再接続後に再試行します。")}
    </div>
  );
}
