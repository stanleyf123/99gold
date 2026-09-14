import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理後台｜玖久黃金報價網",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
