"use client";

import Link from "next/link";
import { localizedHref } from "../lib/locale-path";
import { type Locale, t, useSiteLocale } from "./locale";

const items = [
  { href: "/", key: "home" as const },
  { href: "/jewelry", key: "jewelry" as const },
  { href: "/international", key: "international" as const },
  { href: "/recycling", key: "recycling" as const },
  { href: "/#tools", key: "tools" as const },
  { href: "/global", key: "global" as const },
  { href: "/news", key: "news" as const },
];

function label(locale: Locale, key: (typeof items)[number]["key"]) {
  switch (key) {
    case "home":
      return t(locale, "今日金價", "Gold prices", "本日の金価格");
    case "jewelry":
      return t(locale, "銀樓價格", "Jewelry prices", "店頭価格");
    case "international":
      return t(locale, "國際金價", "International", "国際金価格");
    case "recycling":
      return t(locale, "黃金回收", "Recycling", "金の買取");
    case "tools":
      return t(locale, "回收試算", "Recycle calculator", "買取試算");
    case "global":
      return t(locale, "全球報價", "Global quotes", "世界相場");
    case "news":
      return t(locale, "市場新聞", "Market news", "市場ニュース");
  }
}

export default function SiteLinks({ current }: { current?: string }) {
  const { locale } = useSiteLocale();
  return (
    <nav className="siteLinks" aria-label={t(locale, "站內相關頁面", "Related pages", "関連ページ")}>
      {items.map((item) => {
        const href = localizedHref(item.href, locale);
        const active = current === item.key;
        return (
          <Link key={item.key} href={href} aria-current={active ? "page" : undefined}>
            {label(locale, item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
