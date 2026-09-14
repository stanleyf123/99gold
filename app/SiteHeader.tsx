"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type Locale = "zh" | "en" | "ja";

const STORAGE_KEY = "golden-tide-locale";

const navCopy = {
  zh: {
    today: "今日金價",
    global: "全球報價",
    international: "國際金價",
    jewelry: "銀樓價格",
    recycle: "黃金回收",
    news: "市場情報",
    menu: "開啟選單",
    close: "關閉選單",
  },
  en: {
    today: "Gold Prices",
    global: "Global Quotes",
    international: "International",
    jewelry: "Retail Prices",
    recycle: "Gold Recycling",
    news: "Market Insights",
    menu: "Open menu",
    close: "Close menu",
  },
  ja: {
    today: "本日の金価格",
    global: "世界相場",
    international: "国際金価格",
    jewelry: "店頭価格",
    recycle: "金の買取",
    news: "市場情報",
    menu: "メニューを開く",
    close: "メニューを閉じる",
  },
} as const;

const navItems = [
  { href: "/", key: "today" as const, match: (path: string) => path === "/" },
  { href: "/global", key: "global" as const, match: (path: string) => path.startsWith("/global") },
  { href: "/international", key: "international" as const, match: (path: string) => path.startsWith("/international") },
  { href: "/jewelry", key: "jewelry" as const, match: (path: string) => path.startsWith("/jewelry") },
  { href: "/recycling", key: "recycle" as const, match: (path: string) => path.startsWith("/recycling") },
  { href: "/news", key: "news" as const, match: (path: string) => path.startsWith("/news") || path.startsWith("/insights") },
];

function applyDocumentLang(locale: Locale) {
  document.documentElement.lang = locale === "zh" ? "zh-Hant" : locale;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* device storage may be unavailable */
  }
  applyDocumentLang(locale);
}

type SiteHeaderProps = {
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  localeHrefs?: Partial<Record<Locale, string>>;
  brandName?: string;
  englishName?: string;
  extras?: ReactNode;
};

export default function SiteHeader({
  locale: controlledLocale,
  onLocaleChange,
  localeHrefs,
  brandName = "玖久黃金報價網",
  englishName = "99GOLD.NET",
  extras,
}: SiteHeaderProps) {
  const pathname = usePathname() || "/";
  const [locale, setLocale] = useState<Locale>(controlledLocale ?? "zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const copy = navCopy[locale];

  useEffect(() => {
    if (controlledLocale) {
      setLocale(controlledLocale);
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in navCopy) setLocale(saved);
  }, [controlledLocale]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const changeLocale = (next: Locale) => {
    persistLocale(next);
    setLocale(next);
    onLocaleChange?.(next);
  };

  const newsHref = locale === "zh" ? "/news" : `/news?lang=${locale}`;
  const links = navItems.map((item) => ({
    ...item,
    href: item.key === "news" ? (localeHrefs?.[locale] ?? newsHref) : item.href,
  }));

  const languageControl = (code: Locale) => {
    const label = code === "zh" ? "中" : code === "en" ? "EN" : "日";
    const href = localeHrefs?.[code];
    const className = locale === code ? "active" : "";
    if (href) {
      return (
        <Link
          key={code}
          href={href}
          className={className}
          aria-current={locale === code ? "true" : undefined}
          lang={code === "zh" ? "zh-Hant" : code}
          onClick={() => {
            persistLocale(code);
            setMenuOpen(false);
          }}
        >
          {label}
        </Link>
      );
    }
    return (
      <button
        key={code}
        type="button"
        className={className}
        aria-pressed={locale === code}
        lang={code === "zh" ? "zh-Hant" : code}
        onClick={() => {
          changeLocale(code);
          setMenuOpen(false);
        }}
      >
        {label}
      </button>
    );
  };

  const navLinks = (className: string, onNavigate?: () => void) => (
    <div className={className}>
      {links.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.match(pathname) ? "active" : ""}
          aria-current={item.match(pathname) ? "page" : undefined}
          onClick={onNavigate}
        >
          {copy[item.key]}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="siteHeader">
      <Link className="brand" href="/">
        <i>99</i>
        <span>
          {brandName}
          <br />
          <em>{englishName}</em>
        </span>
      </Link>
      {navLinks("navlinks")}
      <div className="languageSwitch" aria-label="Language">
        {(["zh", "en", "ja"] as Locale[]).map(languageControl)}
      </div>
      <button
        type="button"
        className="menu"
        aria-label={copy.menu}
        aria-expanded={menuOpen}
        aria-controls="siteMenu"
        onClick={() => setMenuOpen(true)}
      >
        ☰
      </button>

      {menuOpen && (
        <div
          className="menuOverlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <aside className="mobileMenu" id="siteMenu" aria-label={brandName}>
            <div className="menuHead">
              <div>
                <span>{brandName}</span>
                <small>{englishName}</small>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label={copy.close}>
                ×
              </button>
            </div>
            {navLinks("menuPageLinks", () => setMenuOpen(false))}
            {extras && (
              <div className="menuExtras" onClick={() => setMenuOpen(false)}>
                {extras}
              </div>
            )}
            <div className="languageSwitch menuLanguage" aria-label="Language">
              {(["zh", "en", "ja"] as Locale[]).map(languageControl)}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
