import type { Metadata } from "next";
import Script from "next/script";
import JsonLd from "./JsonLd";
import SiteChrome from "./SiteChrome";
import PwaRegister from "./PwaRegister";
import { DEFAULT_OG_ALT, DEFAULT_OG_IMAGE, SITE_NAME_EN, SITE_URL, organizationJsonLd, pageMetadata, websiteJsonLd } from "../lib/seo";
import "./globals.css";
import "./quotes.css";
import "./site-chrome.css";

const home = pageMetadata("home");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: home.title,
  description: home.description,
  alternates: { canonical: SITE_URL },
  openGraph: {
    ...home.openGraph,
    siteName: SITE_NAME_EN,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_ALT }],
  },
  twitter: home.twitter,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-icon",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "99GOLD",
    statusBarStyle: "default",
  },
  other: {
    "theme-color": "#0d1519",
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
        <PwaRegister />
        <SiteChrome>{children}</SiteChrome>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
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
