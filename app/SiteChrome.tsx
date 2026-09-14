"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LocaleProvider } from "./locale";
import SiteHeader from "./SiteHeader";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/admin")) {
    return children;
  }
  return (
    <LocaleProvider>
      <SiteHeader />
      {children}
    </LocaleProvider>
  );
}
