"use client";

import { useEffect, useState } from "react";
import NewsQueue from "./news-queue";
import AdminFrame, { type AdminAuthSource } from "./AdminFrame";

type Settings = {
  brandName: string;
  fullName: string;
  englishName: string;
  tagline: string;
  announcement: string;
};

const fallback: Settings = {
  brandName: "玖久黃金報價網",
  fullName: "玖久黃金報價網",
  englishName: "99GOLD.NET",
  tagline: "真金價值，長久相伴。",
  announcement: "",
};

export default function AdminSettings({ userName, authSource = "token" }: { userName: string; authSource?: AdminAuthSource }) {
  const [settings, setSettings] = useState(fallback);
  const [status, setStatus] = useState("讀取網站內容中…");

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((r) => r.json() as Promise<Partial<Settings>>)
      .then((data) => {
        setSettings({ ...fallback, ...data });
        setStatus("內容已同步");
      })
      .catch(() => setStatus("暫時無法讀取內容"));
  }, []);

  const update = (key: keyof Settings, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setStatus("儲存中…");
    const response = await fetch("/api/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      setStatus("儲存失敗，請重新登入後再試");
      return;
    }
    setSettings({ ...fallback, ...(await response.json() as Partial<Settings>) });
    setStatus("已儲存並立即套用到網站");
  };

  return (
    <AdminFrame active="content" userName={userName} authSource={authSource}>
      <section className="adminMain">
        <header>
          <div>
            <p>CONTENT MANAGEMENT</p>
            <h1>網站內容管理</h1>
          </div>
          <span>{status}</span>
        </header>
        <div className="adminGrid">
          <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <h2>品牌設定</h2>
            <label>品牌簡稱<input value={settings.brandName} onChange={(e) => update("brandName", e.target.value)} /></label>
            <label>完整名稱<input value={settings.fullName} onChange={(e) => update("fullName", e.target.value)} /></label>
            <label>英文／網址<input value={settings.englishName} onChange={(e) => update("englishName", e.target.value)} /></label>
            <label>首頁標語<input value={settings.tagline} onChange={(e) => update("tagline", e.target.value)} /></label>
            <label>首頁公告（留白即不顯示）<textarea rows={4} value={settings.announcement} onChange={(e) => update("announcement", e.target.value)} /></label>
            <button type="submit">儲存並發布內容</button>
          </form>
          <div className="adminPreview">
            <p>即時預覽</p>
            <div>
              <small>TAIWAN GOLD MARKET INTELLIGENCE</small>
              <h2>{settings.fullName}</h2>
              <b>{settings.englishName}</b>
              <p>{settings.tagline}</p>
              {settings.announcement ? <em>{settings.announcement}</em> : null}
            </div>
          </div>
        </div>
        <NewsQueue />
      </section>
    </AdminFrame>
  );
}
