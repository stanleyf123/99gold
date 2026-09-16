"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { stripLocalePrefix } from "../lib/locale-path";
import { LocaleProvider, type Locale } from "./locale";
import SiteHeader from "./SiteHeader";

export default function SiteChrome({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const pathname = usePathname() || "/";
  if (stripLocalePrefix(pathname).pathname.startsWith("/admin")) {
    return children;
  }
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <SiteHeader />
      {children}
    </LocaleProvider>
  );
}
