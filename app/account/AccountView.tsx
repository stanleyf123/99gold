"use client";

import { useState } from "react";
import Link from "next/link";
import { persistLocale, type Locale } from "../locale";
import { localizedHref } from "../../lib/locale-path";

type Props = {
  member: {
    id: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    locale: Locale;
    role: "member" | "admin";
    providers: Array<"google" | "line">;
    createdAt: string;
  };
  uiLocale: Locale;
  googleReady: boolean;
  lineReady: boolean;
  googleHref: string;
  lineHref: string;
};

const copy = {
  heading: { zh: "會員中心", en: "Account", ja: "会員センター" },
  email: { zh: "Email", en: "Email", ja: "メール" },
  providers: { zh: "已連結的登入方式", en: "Linked sign-in methods", ja: "連携済みのログイン" },
  connectGoogle: { zh: "連結 Google", en: "Link Google", ja: "Google を連携" },
  connectLine: { zh: "連結 LINE", en: "Link LINE", ja: "LINE を連携" },
  locale: { zh: "介面語系偏好", en: "Preferred language", ja: "表示言語" },
  save: { zh: "儲存偏好", en: "Save preference", ja: "設定を保存" },
  saved: { zh: "已儲存", en: "Saved", ja: "保存しました" },
  logout: { zh: "登出", en: "Sign out", ja: "ログアウト" },
  admin: { zh: "前往管理後台", en: "Open admin", ja: "管理画面へ" },
  none: { zh: "（未提供）", en: "(not provided)", ja: "（未設定）" },
};

export default function AccountView({
  member,
  uiLocale,
  googleReady,
  lineReady,
  googleHref,
  lineHref,
}: Props) {
  const [locale, setLocale] = useState<Locale>(member.locale);
  const [status, setStatus] = useState("");
  const initial = member.displayName.trim().charAt(0) || "9";

  const save = async () => {
    setStatus("");
    const response = await fetch("/api/auth/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (!response.ok) {
      setStatus(uiLocale === "ja" ? "保存に失敗しました" : uiLocale === "en" ? "Could not save" : "儲存失敗");
      return;
    }
    persistLocale(locale);
    setStatus(copy.saved[uiLocale]);
  };

  const logout = () => {
    void fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = localizedHref("/", uiLocale);
    });
  };

  return (
    <main className="memberPage">
      <section className="memberCard">
        <h1>{copy.heading[uiLocale]}</h1>
        <div className="memberProfile">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="memberAvatarFallback" aria-hidden>{initial}</span>
          )}
          <div className="memberMeta">
            <strong>{member.displayName}</strong>
            <small>{copy.email[uiLocale]}：{member.email || copy.none[uiLocale]}</small>
          </div>
        </div>
        <div>
          <p>{copy.providers[uiLocale]}</p>
          <div className="memberProviders">
            {member.providers.includes("google") ? <span>Google</span> : googleReady ? (
              <a href={googleHref}>{copy.connectGoogle[uiLocale]}</a>
            ) : null}
            {member.providers.includes("line") ? <span>LINE</span> : lineReady ? (
              <a href={lineHref}>{copy.connectLine[uiLocale]}</a>
            ) : null}
          </div>
        </div>
        <form className="memberForm" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label>
            {copy.locale[uiLocale]}
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="zh">繁體中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </label>
          <button type="submit">{copy.save[uiLocale]}</button>
          {status ? <p className="memberHint">{status}</p> : null}
        </form>
        {member.role === "admin" ? (
          <Link className="memberAdminLink" href="/admin">{copy.admin[uiLocale]}</Link>
        ) : null}
        <button type="button" className="memberLogout" onClick={logout}>{copy.logout[uiLocale]}</button>
      </section>
    </main>
  );
}
