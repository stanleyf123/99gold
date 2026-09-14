"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewsQueue from "./news-queue";

type Settings = {
  brandName: string;
  fullName: string;
  englishName: string;
  tagline: string;
  announcement: string;
  alertEmailTo: string;
  lineUserId: string;
};
type ChannelStatus = {
  email?: { configured?: boolean; transport?: string | null };
  line?: { configured?: boolean; transport?: string | null };
};

const fallback: Settings = {
  brandName: "玖久黃金報價網",
  fullName: "玖久黃金報價網",
  englishName: "99GOLD.NET",
  tagline: "真金價值，長久相伴。",
  announcement: "",
  alertEmailTo: "",
  lineUserId: "",
};

export default function AdminSettings({ userName, tokenAuth = false }: { userName: string; tokenAuth?: boolean }) {
  const [settings, setSettings] = useState(fallback);
  const [status, setStatus] = useState("讀取網站內容中…");
  const [channels, setChannels] = useState<ChannelStatus>({});

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((r) => r.json() as Promise<Partial<Settings>>)
      .then((data) => {
        setSettings({ ...fallback, ...data });
        setStatus("內容已同步");
      })
      .catch(() => setStatus("暫時無法讀取內容"));
    fetch("/api/price-alerts", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ channels?: ChannelStatus }>)
      .then((data) => setChannels(data.channels ?? {}))
      .catch(() => undefined);
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
    <main className="adminShell">
      <aside>
        <Link className="adminBrand" href="/">
          <b>99</b>
          <span>玖久黃金報價網<small>99GOLD.NET</small></span>
        </Link>
        <nav>
          <Link className="active" href="/admin">網站內容</Link>
          <Link href="/admin#news-schedule">新聞排程</Link>
          <Link href="/admin#price-alerts">到價提醒</Link>
          <Link href="/" target="_blank">查看前台 ↗</Link>
        </nav>
        <div className="adminUser">
          <span>管理者</span>
          <strong>{userName}</strong>
          {tokenAuth ? (
            <button type="button" className="adminLogout" onClick={() => {
              void fetch("/api/admin/session", { method: "DELETE" }).then(() => {
                window.location.href = "/admin/login";
              });
            }}>登出</button>
          ) : (
            <Link href="/signout-with-chatgpt?return_to=/">登出</Link>
          )}
        </div>
      </aside>
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
        <section className="newsQueue" id="price-alerts">
          <header>
            <p>PRICE ALERTS</p>
            <h2>Email／LINE 到價提醒</h2>
          </header>
          <p className="newsQueueStatus">
            瀏覽器通知仍在訪客裝置上運作。Email 與 LINE 的<strong>金鑰只寫在伺服器</strong>
            <code> /etc/99gold.env </code>
            一次即可；這裡只存收件人與 LINE 使用者 ID，不存 token。
          </p>
          <div className="newsScheduleSummary">
            <article>
              <span>Email</span>
              <strong>{channels.email?.configured ? `已可發送（${channels.email.transport ?? "env"}）` : "尚未設定 RESEND_API_KEY 或 SMTP_HOST"}</strong>
              <small>收件人：ALERT_EMAIL_TO 或下方欄位</small>
            </article>
            <article>
              <span>LINE</span>
              <strong>{channels.line?.configured ? `已可發送（${channels.line.transport ?? "env"}）` : "尚未設定 LINE Messaging／Notify／Webhook"}</strong>
              <small>LINE Notify 已停用；請優先 Messaging API</small>
            </article>
            <article>
              <span>冷卻</span>
              <strong>同一目標 6 小時內不重發</strong>
              <small>systemd timer：npm run alerts:dispatch</small>
            </article>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <label>
              提醒收件 Email
              <input
                type="email"
                value={settings.alertEmailTo}
                onChange={(e) => update("alertEmailTo", e.target.value)}
                placeholder="與 ALERT_EMAIL_TO 相同或覆寫"
              />
            </label>
            <label>
              LINE 使用者 ID
              <input
                value={settings.lineUserId}
                onChange={(e) => update("lineUserId", e.target.value)}
                placeholder="Uxxxxxxxx（Messaging API 的 to）"
              />
            </label>
            <button type="submit">儲存提醒對象</button>
          </form>
        </section>
        <NewsQueue />
      </section>
    </main>
  );
}
