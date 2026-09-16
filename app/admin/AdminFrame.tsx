"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type AdminAuthSource = "chatgpt" | "token" | "member";

export default function AdminFrame({
  active,
  userName,
  authSource,
  children,
}: {
  active: "content" | "members";
  userName: string;
  authSource: AdminAuthSource;
  children: ReactNode;
}) {
  const logout = () => {
    if (authSource === "token") {
      void fetch("/api/admin/session", { method: "DELETE" }).then(() => {
        window.location.href = "/admin/login";
      });
      return;
    }
    if (authSource === "member") {
      void fetch("/api/auth/logout", { method: "POST" }).then(() => {
        window.location.href = "/admin/login";
      });
      return;
    }
    window.location.href = "/signout-with-chatgpt?return_to=/";
  };

  return (
    <main className="adminShell">
      <aside>
        <Link className="adminBrand" href="/">
          <b>99</b>
          <span>玖久黃金報價網<small>99GOLD.NET</small></span>
        </Link>
        <nav>
          <Link className={active === "content" ? "active" : ""} href="/admin">網站內容</Link>
          <Link href="/admin#news-schedule">新聞排程</Link>
          <Link className={active === "members" ? "active" : ""} href="/admin/members">會員</Link>
          <Link href="/" target="_blank">查看前台 ↗</Link>
        </nav>
        <div className="adminUser">
          <span>管理者</span>
          <strong>{userName}</strong>
          {authSource === "chatgpt" ? (
            <Link href="/signout-with-chatgpt?return_to=/">登出</Link>
          ) : (
            <button type="button" className="adminLogout" onClick={logout}>登出</button>
          )}
        </div>
      </aside>
      {children}
    </main>
  );
}
