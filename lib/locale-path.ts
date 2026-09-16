export type PathLocale = "zh" | "en" | "ja";

export const LOCALE_HEADER = "x-site-locale";
export const PATH_PREFIX_LOCALES = ["en", "ja"] as const;

export function documentLang(locale: PathLocale) {
  return locale === "zh" ? "zh-Hant" : locale;
}

export function isPathLocale(value: string | null | undefined): value is PathLocale {
  return value === "zh" || value === "en" || value === "ja";
}

function normalizePathname(pathname: string) {
  if (!pathname) return "/";
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

export function stripLocalePrefix(pathname: string): {
  locale: PathLocale;
  pathname: string;
  hadPrefix: boolean;
} {
  const raw = normalizePathname(pathname);
  if (raw === "/zh" || raw.startsWith("/zh/")) {
    const rest = raw === "/zh" ? "/" : raw.slice(3) || "/";
    return { locale: "zh", pathname: normalizePathname(rest), hadPrefix: true };
  }
  const match = raw.match(/^\/(en|ja)(?=\/|$)/);
  if (match && isPathLocale(match[1]) && match[1] !== "zh") {
    const rest = raw.slice(match[0].length) || "/";
    return { locale: match[1], pathname: normalizePathname(rest), hadPrefix: true };
  }
  return { locale: "zh", pathname: raw, hadPrefix: false };
}

export function withLocalePrefix(pathname: string, locale: PathLocale): string {
  const bare = stripLocalePrefix(pathname).pathname;
  if (locale === "zh") return bare;
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}

export function localeFromPathname(pathname: string): PathLocale | null {
  const { locale, hadPrefix, pathname: bare } = stripLocalePrefix(pathname);
  if (hadPrefix) return locale;
  const article = bare.match(/\/news\/[^/]+-(zh|en|ja)$/);
  return article && isPathLocale(article[1]) ? article[1] : null;
}

export function searchParamsOf(search: string | URLSearchParams | Record<string, string | null | undefined> | undefined) {
  if (!search) return new URLSearchParams();
  if (search instanceof URLSearchParams) return new URLSearchParams(search);
  if (typeof search === "string") {
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value != null && value !== "") params.set(key, value);
  }
  return params;
}

export function serializeSearch(params: URLSearchParams) {
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function skipLocaleRouting(pathname: string) {
  const bare = stripLocalePrefix(pathname).pathname;
  if (
    bare.startsWith("/api")
    || bare.startsWith("/admin")
    || bare.startsWith("/_next")
    || bare.startsWith("/og")
    || bare.startsWith("/icon")
    || bare.startsWith("/apple-icon")
    || bare === "/sw.js"
    || bare.startsWith("/manifest")
    || bare.startsWith("/chatgpt")
    || bare.startsWith("/signout")
  ) return true;
  return /\.[a-z0-9]+$/i.test(bare);
}

export function localePathRedirect(pathname: string, search: string): { pathname: string; search: string } | null {
  if (skipLocaleRouting(pathname)) return null;
  const params = searchParamsOf(search);
  const lang = params.get("lang");
  const stripped = stripLocalePrefix(pathname);
  let locale = stripped.locale;
  if (lang !== null) {
    params.delete("lang");
    if (isPathLocale(lang)) locale = lang;
  }
  const nextPath = withLocalePrefix(stripped.pathname, locale);
  const nextSearch = serializeSearch(params);
  const currentSearch = !search || search.startsWith("?") ? search : `?${search}`;
  if (nextPath === pathname && nextSearch === currentSearch) return null;
  return { pathname: nextPath, search: nextSearch };
}

export function localizedHref(
  pathname: string,
  locale: PathLocale,
  query?: string | URLSearchParams | Record<string, string | null | undefined>,
) {
  const path = withLocalePrefix(pathname, locale);
  const params = searchParamsOf(query);
  params.delete("lang");
  return `${path}${serializeSearch(params)}`;
}

export function hreflangHrefs(
  pathname: string,
  query?: string | URLSearchParams | Record<string, string | null | undefined>,
): Record<"zh-Hant" | "en" | "ja" | "x-default", string> {
  return {
    "zh-Hant": localizedHref(pathname, "zh", query),
    en: localizedHref(pathname, "en", query),
    ja: localizedHref(pathname, "ja", query),
    "x-default": localizedHref(pathname, "zh", query),
  };
}
