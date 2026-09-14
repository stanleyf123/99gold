import HomeView from "./HomeView";
import { getGlobalQuotesOrNull } from "../lib/quotes";
import { getGoldSilverRatioHistoryOrNull } from "../lib/gold-silver-ratio";
import { pageMetadata } from "../lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("home");

export default async function HomePage() {
  const [quotes, ratioHistory] = await Promise.all([
    getGlobalQuotesOrNull(),
    getGoldSilverRatioHistoryOrNull("1M"),
  ]);
  return <HomeView initialQuotes={quotes} initialRatioPoints={ratioHistory?.points ?? []} />;
}
