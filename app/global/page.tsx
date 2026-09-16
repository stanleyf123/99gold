import JsonLd from "../JsonLd";
import { getGlobalQuotesOrNull } from "../../lib/quotes";
import { getGoldSilverRatioHistoryOrNull } from "../../lib/gold-silver-ratio";
import { requestLocale } from "../../lib/request-locale";
import { breadcrumbJsonLd, pageMetadata, sectionCrumbs } from "../../lib/seo";
import GlobalView from "./GlobalView";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata("global", await requestLocale());
}

export default async function GlobalPage() {
  const [quotes, ratioHistory] = await Promise.all([
    getGlobalQuotesOrNull(),
    getGoldSilverRatioHistoryOrNull("1M"),
  ]);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, sectionCrumbs.global])} />
      <GlobalView initialQuotes={quotes} initialRatioPoints={ratioHistory?.points ?? []} />
    </>
  );
}
