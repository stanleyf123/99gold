import HomeView from "./HomeView";
import JsonLd from "./JsonLd";
import { getGlobalQuotesOrNull } from "../lib/quotes";
import { getPalladiumHistoryOrNull, getPlatinumHistoryOrNull, getSilverHistoryOrNull } from "../lib/gold-history";
import { getGoldSilverRatioHistoryOrNull } from "../lib/gold-silver-ratio";
import { localizedHref } from "../lib/locale-path";
import { requestLocale } from "../lib/request-locale";
import { itemListJsonLd, pageMetadata } from "../lib/seo";
import { getDailyGoldNews } from "./api/news-service";
import { getRawDb } from "../db";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata("home", await requestLocale());
}

export default async function HomePage() {
  const locale = await requestLocale();
  const [quotes, ratioHistory, silverHistory, platinumHistory, palladiumHistory, news] = await Promise.all([
    getGlobalQuotesOrNull(),
    getGoldSilverRatioHistoryOrNull("1M"),
    getSilverHistoryOrNull("1M"),
    getPlatinumHistoryOrNull("1M"),
    getPalladiumHistoryOrNull("1M"),
    getDailyGoldNews(locale, getRawDb()),
  ]);
  const briefLinks = (news.items ?? []).slice(0, 4).map((item) => ({
    name: item.title,
    path: item.external ? localizedHref(`/news/${item.id}`, locale) : localizedHref(`/news/${item.id}`, locale),
  }));
  return (
    <>
      {briefLinks.length ? <JsonLd data={itemListJsonLd(briefLinks)} /> : null}
      <HomeView
        initialQuotes={quotes}
        initialRatioPoints={ratioHistory?.points ?? []}
        initialSilverPoints={silverHistory?.points ?? []}
        initialPlatinumPoints={platinumHistory?.points ?? []}
        initialPalladiumPoints={palladiumHistory?.points ?? []}
        initialNews={news}
      />
    </>
  );
}
