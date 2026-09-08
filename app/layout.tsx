import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "金澤｜即時黃金報價與市場情報",
  description: "掌握國際金價、台灣銀樓價格與黃金市場情報。",
  openGraph: {
    title: "金澤｜即時黃金報價",
    description: "掌握國際金價、台灣銀樓價格與黃金市場情報。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "金澤即時黃金報價" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "金澤｜即時黃金報價",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
