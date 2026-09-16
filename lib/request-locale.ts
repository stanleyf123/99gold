import { headers } from "next/headers";
import { LOCALE_HEADER, isPathLocale, type PathLocale } from "./locale-path";

export async function requestLocale(): Promise<PathLocale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isPathLocale(value) ? value : "zh";
}

export function localeFromCandidates(...candidates: Array<string | null | undefined>): PathLocale {
  for (const value of candidates) {
    if (isPathLocale(value)) return value;
  }
  return "zh";
}
