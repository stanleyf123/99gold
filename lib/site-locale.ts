import { localizedHref, searchParamsOf, stripLocalePrefix, type PathLocale } from "./locale-path";

export type SiteLocale = PathLocale;

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
): Record<SiteLocale, string> {
  const { pathname: bare } = stripLocalePrefix(pathname);
  const params = searchParamsOf(search);
  params.delete("lang");
  const category = params.get("category");

  const editorial = bare.match(/^(\/news\/.+)-(zh|en|ja)$/);
  if (editorial) {
    const base = editorial[1];
    return {
      zh: localizedHref(`${base}-zh`, "zh"),
      en: localizedHref(`${base}-en`, "en"),
      ja: localizedHref(`${base}-ja`, "ja"),
    };
  }

  if (bare === "/news") {
    const query = { category: category || "all" };
    return {
      zh: localizedHref("/news", "zh", query),
      en: localizedHref("/news", "en", query),
      ja: localizedHref("/news", "ja", query),
    };
  }

  const query = params.toString() ? params : undefined;
  return {
    zh: localizedHref(bare, "zh", query),
    en: localizedHref(bare, "en", query),
    ja: localizedHref(bare, "ja", query),
  };
}
