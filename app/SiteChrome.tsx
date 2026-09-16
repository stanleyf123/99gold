"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { stripLocalePrefix } from "../lib/locale-path";
import type { PublicMember } from "../lib/auth/types";
import { LocaleProvider, type Locale } from "./locale";
import SiteHeader from "./SiteHeader";

export default function SiteChrome({
  children,
  initialLocale,
  member = null,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  member?: PublicMember | null;
}) {
  const pathname = usePathname() || "/";
  if (stripLocalePrefix(pathname).pathname.startsWith("/admin")) {
    return children;
  }
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <SiteHeader member={member} />
      {children}
    </LocaleProvider>
  );
}
