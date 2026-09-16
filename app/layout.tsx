import type { Metadata, Viewport } from "next";
import Script from "next/script";
import JsonLd from "./JsonLd";
import SiteChrome from "./SiteChrome";
import PwaRegister from "./PwaRegister";
import { documentLang } from "../lib/locale-path";
import { requestLocale } from "../lib/request-locale";
import { DEFAULT_OG_ALT, DEFAULT_OG_IMAGE, SITE_NAME_EN, SITE_URL, organizationJsonLd, pageMetadata, websiteJsonLd } from "../lib/seo";
import "./globals.css";
import "./quotes.css";
import "./site-chrome.css";

export const viewport: Viewport = {
  themeColor: "#0d1519",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const home = pageMetadata("home", locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: home.title,
    description: home.description,
    alternates: home.alternates,
    openGraph: {
      ...home.openGraph,
      siteName: SITE_NAME_EN,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_ALT, type: "image/png" }],
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
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await requestLocale();
  return (
    <html lang={documentLang(locale)} suppressHydrationWarning>
      <body>
        <PwaRegister />
        <SiteChrome initialLocale={locale}>{children}</SiteChrome>
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
