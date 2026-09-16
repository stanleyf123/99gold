"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { localizedHref, stripLocalePrefix } from "../lib/locale-path";
import { localeHrefsFromLocation as hrefsFromPath } from "../lib/site-locale";
import type { PublicMember } from "../lib/auth/types";
import { type Locale, persistLocale, localeFromLocation, useSiteLocale } from "./locale";

export type { Locale };
export { persistLocale };

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
    login: "登入",
    account: "會員中心",
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
    login: "Sign in",
    account: "Account",
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
    login: "ログイン",
    account: "会員センター",
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

type SiteHeaderProps = {
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  localeHrefs?: Partial<Record<Locale, string>>;
  brandName?: string;
  englishName?: string;
  extras?: ReactNode;
  member?: PublicMember | null;
};

function SiteHeaderInner({
  locale: controlledLocale,
  onLocaleChange,
  localeHrefs: controlledHrefs,
  brandName = "玖久黃金報價網",
  englishName = "99GOLD.NET",
  extras,
  member = null,
  search,
}: SiteHeaderProps & { search: string }) {
  const pathname = usePathname() || "/";
  const barePath = stripLocalePrefix(pathname).pathname;
  const { locale: contextLocale, setLocale: setContextLocale } = useSiteLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const derivedHrefs = useMemo(() => hrefsFromPath(pathname, search), [pathname, search]);
  const localeHrefs = controlledHrefs ?? derivedHrefs;
  const locale = controlledLocale ?? contextLocale;
  const copy = navCopy[locale];

  useEffect(() => {
    if (controlledLocale) return;
    const fromUrl = localeFromLocation(pathname, search);
    if (fromUrl && fromUrl !== contextLocale) setContextLocale(fromUrl);
  }, [controlledLocale, contextLocale, pathname, search, setContextLocale]);

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

  const newsHref = barePath === "/news" ? (localeHrefs[locale] ?? localizedHref("/news", locale)) : localizedHref("/news", locale);
  const links = navItems.map((item) => ({
    ...item,
    href: item.key === "news" ? newsHref : localizedHref(item.href, locale),
    active: item.match(barePath),
  }));
  const loginHref = localizedHref("/login", locale);
  const accountHref = localizedHref("/account", locale);
  const onAccount = barePath === "/account" || barePath === "/login";
  const initial = member?.displayName.trim().charAt(0) || "9";

  const accountControl = (onNavigate?: () => void) => (
    <Link
      href={member ? accountHref : loginHref}
      className={`accountSlot${onAccount ? " active" : ""}`}
      aria-current={onAccount ? "page" : undefined}
      onClick={onNavigate}
    >
      {member?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : member ? (
        <span className="accountInitial" aria-hidden>{initial}</span>
      ) : null}
      <em>{member ? copy.account : copy.login}</em>
    </Link>
  );

  const languageControl = (code: Locale) => {
    const label = code === "zh" ? "中" : code === "en" ? "EN" : "日";
    const href = localeHrefs[code] ?? localizedHref(barePath, code);
    const className = locale === code ? "active" : "";
    return (
      <Link
        key={code}
        href={href}
        className={className}
        aria-current={locale === code ? "true" : undefined}
        lang={code === "zh" ? "zh-Hant" : code}
        onClick={() => {
          persistLocale(code);
          onLocaleChange?.(code);
          setMenuOpen(false);
        }}
      >
        {label}
      </Link>
    );
  };

  const navLinks = (className: string, onNavigate?: () => void) => (
    <div className={className}>
      {links.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.active ? "active" : ""}
          aria-current={item.active ? "page" : undefined}
          onClick={onNavigate}
        >
          {copy[item.key]}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="siteHeader">
      <Link className="brand" href={localizedHref("/", locale)}>
        <i>99</i>
        <span>
          {brandName}
          <br />
          <em>{englishName}</em>
        </span>
      </Link>
      {navLinks("navlinks")}
      {accountControl()}
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
            {accountControl(() => setMenuOpen(false))}
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

function SiteHeaderWithSearch(props: SiteHeaderProps) {
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return <SiteHeaderInner {...props} search={search} />;
}

export default function SiteHeader(props: SiteHeaderProps) {
  return (
    <Suspense fallback={<SiteHeaderInner {...props} search="" />}>
      <SiteHeaderWithSearch {...props} />
    </Suspense>
  );
}
