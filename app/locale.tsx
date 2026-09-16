"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { documentLang as libDocumentLang, localeFromPathname } from "../lib/locale-path";

export type Locale = "zh" | "en" | "ja";

export const LOCALE_STORAGE_KEY = "golden-tide-locale";
export const LOCALE_EVENT = "golden-tide-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en" || value === "ja";
}

export function documentLang(locale: Locale) {
  return libDocumentLang(locale);
}

export function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* device storage may be unavailable */
  }
  document.documentElement.lang = documentLang(locale);
  window.dispatchEvent(new CustomEvent<Locale>(LOCALE_EVENT, { detail: locale }));
}

export function localeFromLocation(pathname: string, search: string): Locale | null {
  const fromPath = localeFromPathname(pathname);
  if (fromPath) return fromPath;
  const lang = new URLSearchParams(search).get("lang");
  return isLocale(lang) ? lang : null;
}

function readStoredLocale(): Locale | null {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({
  children,
  initialLocale = "zh",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const pathname = usePathname() || "/";
  const locale = localeFromPathname(pathname) ?? "zh";
  void initialLocale;

  useEffect(() => {
    persistLocale(locale);
    document.documentElement.lang = documentLang(locale);
    if (localeFromPathname(pathname)) return;
    let cancelled = false;
    fetch("/api/visitor-locale", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ locale?: Locale }>) : null))
      .then((data) => {
        if (cancelled) return;
        const chosen = readStoredLocale();
        if (chosen) {
          persistLocale(chosen);
          return;
        }
        if (isLocale(data?.locale)) persistLocale(data.locale);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [locale, pathname]);

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useSiteLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useSiteLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function t(locale: Locale, zh: string, en: string, ja = en) {
  return locale === "zh" ? zh : locale === "ja" ? ja : en;
}
