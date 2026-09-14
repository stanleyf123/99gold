"use client";

import { useState } from "react";
import type { NewsLocale } from "./editorial";

const copy = {
  zh: { share: "分享這則快訊", copied: "連結已複製", copy: "複製連結", line: "LINE", native: "分享", fail: "無法複製連結" },
  en: { share: "Share this brief", copied: "Link copied", copy: "Copy link", line: "LINE", native: "Share", fail: "Could not copy link" },
  ja: { share: "この速報を共有", copied: "リンクをコピーしました", copy: "リンクをコピー", line: "LINE", native: "共有", fail: "コピーできませんでした" },
} as const;

export default function ShareBrief({
  locale,
  title,
  url,
}: {
  locale: NewsLocale;
  title: string;
  url: string;
}) {
  const t = copy[locale];
  const [status, setStatus] = useState("");
  const lineHref = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(t.copied);
    } catch {
      setStatus(t.fail);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, url });
      setStatus(t.copied);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  };

  return (
    <div className="briefShare">
      <p>{t.share}</p>
      <div>
        <button type="button" onClick={() => void nativeShare()}>{t.native}</button>
        <button type="button" onClick={() => void copyLink()}>{t.copy}</button>
        <a href={lineHref} target="_blank" rel="noreferrer">{t.line}</a>
      </div>
      {status ? <small role="status">{status}</small> : null}
    </div>
  );
}
