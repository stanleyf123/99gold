import HomeView from "./HomeView";
import JsonLd from "./JsonLd";
import { getGlobalQuotesOrNull } from "../lib/quotes";
import { getGoldSilverRatioHistoryOrNull } from "../lib/gold-silver-ratio";
import { itemListJsonLd, pageMetadata } from "../lib/seo";
import { getDailyGoldNews } from "./api/news-service";
import { getRawDb } from "../db";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("home");

export default async function HomePage() {
  const [quotes, ratioHistory, news] = await Promise.all([
    getGlobalQuotesOrNull(),
    getGoldSilverRatioHistoryOrNull("1M"),
    getDailyGoldNews("zh", getRawDb()),
  ]);
  const briefLinks = (news.items ?? []).slice(0, 4).map((item) => ({
    name: item.title,
    path: item.external ? `/news/${item.id}?lang=zh` : `/news/${item.id}`,
  }));
  return (
    <>
      {briefLinks.length ? <JsonLd data={itemListJsonLd(briefLinks)} /> : null}
      <HomeView initialQuotes={quotes} initialRatioPoints={ratioHistory?.points ?? []} initialNews={news} />
    </>
  );
}
