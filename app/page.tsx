import { getGlobalQuotes } from "../lib/quotes";
import HomeView, { type HomeQuoteSnapshot } from "./HomeView";

export const dynamic = "force-dynamic";

async function loadHomeQuotes(): Promise<HomeQuoteSnapshot | null> {
  try {
    const quotes = await getGlobalQuotes();
    return {
      items: quotes.items,
      metals: quotes.metals.map((metal) => ({ ...metal, series: [] })),
      currencies: quotes.currencies,
      quotedAt: quotes.quotedAt,
      updatedAt: quotes.updatedAt,
      retrievedAt: quotes.retrievedAt,
      fxQuotedAt: quotes.fxQuotedAt,
      marketStatus: quotes.marketStatus,
      quoteSource: quotes.quoteSource,
      source: quotes.source,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialQuotes = await loadHomeQuotes();
  return <HomeView initialQuotes={initialQuotes} />;
}
