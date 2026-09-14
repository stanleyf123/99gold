export type SiteLocale = "zh" | "en" | "ja";

const TRADITIONAL_CHINESE_MARKETS = new Set(["TW", "HK", "MO"]);
/** Cloudflare uses XX for unknown; T1 for Tor. Empty means the header was never set (nginx). */
const UNKNOWN_COUNTRY = new Set(["", "XX", "T1"]);

export function isSiteLocale(value: string | null | undefined): value is SiteLocale {
  return value === "zh" || value === "en" || value === "ja";
}

/**
 * Guess UI locale from a GeoIP country code.
 * This site’s default chrome is zh-Hant. Unknown / missing country must not
 * flip first-time visitors to English (the VPS sits behind nginx, not Cloudflare).
 */
export function localeFromGeoCountry(country: string | null | undefined): SiteLocale {
  const code = (country ?? "").trim().toUpperCase();
  if (UNKNOWN_COUNTRY.has(code)) return "zh";
  if (code === "JP") return "ja";
  if (TRADITIONAL_CHINESE_MARKETS.has(code)) return "zh";
  return "en";
}

export function localeHrefsFromLocation(
  pathname: string,
  search: string,
): Partial<Record<SiteLocale, string>> | undefined {
  if (pathname === "/news") {
    const category = new URLSearchParams(search).get("category") || "all";
    return {
      zh: `/news?lang=zh&category=${category}`,
      en: `/news?lang=en&category=${category}`,
      ja: `/news?lang=ja&category=${category}`,
    };
  }
  const editorial = pathname.match(/^(\/news\/.+)-(zh|en|ja)$/);
  if (editorial) {
    const base = editorial[1];
    return {
      zh: `${base}-zh`,
      en: `${base}-en`,
      ja: `${base}-ja`,
    };
  }
  const brief = pathname.match(/^\/news\/([^/]+)$/);
  if (brief) {
    const id = brief[1];
    return {
      zh: `/news/${id}?lang=zh`,
      en: `/news/${id}?lang=en`,
      ja: `/news/${id}?lang=ja`,
    };
  }
  return undefined;
}
