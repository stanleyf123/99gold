import JsonLd from "../JsonLd";
import { getGlobalQuotesOrNull } from "../../lib/quotes";
import { breadcrumbJsonLd, pageMetadata, sectionCrumbs } from "../../lib/seo";
import GlobalView from "./GlobalView";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("global");

export default async function GlobalPage() {
  const quotes = await getGlobalQuotesOrNull();
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, sectionCrumbs.global])} />
      <GlobalView initialQuotes={quotes} />
    </>
  );
}
