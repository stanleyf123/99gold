import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./quotes.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://99gold.net"),
  title: "玖久黃金報價網｜即時黃金報價與市場情報",
  description: "真金價值，長久相伴。掌握專業黃金報價、COMEX 走勢、台灣黃金換算、全球貴金屬與完整歷史金價。",
  openGraph: {
    title: "玖久黃金報價網｜專業黃金報價與歷史金價",
    description: "國際參考、台灣換算、COMEX 走勢、全球貴金屬與歷史金價，一頁掌握。",
    url: "/",
    siteName: "99GOLD.NET",
    locale: "zh_TW",
    type: "website",
    images: [{ url: "/og-quotes-v2.png", width: 1200, height: 630, alt: "玖久黃金報價網專業黃金報價與歷史金價" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "玖久黃金報價網｜專業黃金報價與歷史金價",
    description: "國際參考、台灣換算、COMEX 走勢與完整歷史金價。",
    images: ["/og-quotes-v2.png"],
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
      <body>
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-QF9X3TLYZT" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-QF9X3TLYZT');`}
        </Script>
      </body>
    </html>
  );
}
