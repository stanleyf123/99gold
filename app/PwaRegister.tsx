"use client";

import { useEffect, useState } from "react";
import { t, useSiteLocale } from "./locale";

export default function PwaRegister() {
  const { locale } = useSiteLocale();
  const [offline, setOffline] = useState(false);
  const [cachedQuotes, setCachedQuotes] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!offline || !("caches" in window)) return;
    caches.open("99gold-quotes-v1")
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
