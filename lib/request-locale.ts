import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  ORIGINAL_PATH_HEADER,
  isPathLocale,
  localeFromPathname,
  type PathLocale,
} from "./locale-path";

const localeOverride = cache((): { current: PathLocale | null } => ({ current: null }));

export function setRequestLocale(locale: PathLocale) {
  localeOverride().current = locale;
}

export async function requestLocale(): Promise<PathLocale> {
  const override = localeOverride().current;
  if (override) return override;

  const headerStore = await headers();
  const fromHeader = headerStore.get(LOCALE_HEADER);
  if (isPathLocale(fromHeader)) return fromHeader;

  const originalPath = headerStore.get(ORIGINAL_PATH_HEADER) || headerStore.get("next-url") || headerStore.get("x-url") || "";
  const fromPath = localeFromPathname(originalPath.split("?")[0] || originalPath);
  if (fromPath) return fromPath;

  try {
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isPathLocale(fromCookie)) return fromCookie;
  } catch {
    /* cookies() can throw outside a request */
  }

  return "zh";
}

export function localeFromCandidates(...candidates: Array<string | null | undefined>): PathLocale {
  for (const value of candidates) {
    if (isPathLocale(value)) return value;
  }
  return "zh";
}
