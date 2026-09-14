"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/admin")) {
    return children;
  }
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
