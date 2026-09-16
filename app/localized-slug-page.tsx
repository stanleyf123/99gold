import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PathLocale } from "../lib/locale-path";
import { setRequestLocale } from "../lib/request-locale";
import HomePage, { generateMetadata as homeMetadata } from "./page";
import GlobalPage, { generateMetadata as globalMetadata } from "./global/page";
import SectionPage, { generateMetadata as sectionMetadata } from "./[section]/page";
import NewsIndex, { generateMetadata as newsMetadata } from "./news/page";
import NewsArticle, { generateMetadata as articleMetadata } from "./news/[id]/page";
import LoginPage, { generateMetadata as loginMetadata } from "./login/page";
import AccountPage, { generateMetadata as accountMetadata } from "./account/page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asQuery(searchParams: SearchParams) {
  return searchParams as Promise<{ lang?: string; category?: string }>;
}

export async function localizedSlugMetadata(
  locale: PathLocale,
  slug: string[] | undefined,
  searchParams: SearchParams,
): Promise<Metadata> {
  setRequestLocale(locale);
  const parts = slug ?? [];
  if (parts.length === 0) return homeMetadata();
  if (parts[0] === "global" && parts.length === 1) return globalMetadata();
  if (parts[0] === "news" && parts.length === 1) return newsMetadata({ searchParams: asQuery(searchParams) });
  if (parts[0] === "news" && parts.length === 2) {
    return articleMetadata({
      params: Promise.resolve({ id: parts[1] }),
      searchParams: asQuery(searchParams),
    });
  }
  if (parts[0] === "login" && parts.length === 1) return loginMetadata();
  if (parts[0] === "account" && parts.length === 1) return accountMetadata();
  if (parts.length === 1) return sectionMetadata({ params: Promise.resolve({ section: parts[0] }) });
  return {};
}

export async function LocalizedSlugPage({
  locale,
  slug,
  searchParams,
}: {
  locale: PathLocale;
  slug: string[] | undefined;
  searchParams: SearchParams;
}) {
  setRequestLocale(locale);
  const parts = slug ?? [];
  if (parts.length === 0) return <HomePage />;
  if (parts[0] === "global" && parts.length === 1) return <GlobalPage />;
  if (parts[0] === "news" && parts.length === 1) return <NewsIndex searchParams={asQuery(searchParams)} />;
  if (parts[0] === "news" && parts.length === 2) {
    return (
      <NewsArticle
        params={Promise.resolve({ id: parts[1] })}
        searchParams={asQuery(searchParams)}
      />
    );
  }
  if (parts[0] === "login" && parts.length === 1) return <LoginPage searchParams={searchParams} />;
  if (parts[0] === "account" && parts.length === 1) return <AccountPage />;
  if (parts.length === 1) return <SectionPage params={Promise.resolve({ section: parts[0] })} />;
  notFound();
}
