import HomeView from "./HomeView";
import { getGlobalQuotesOrNull } from "../lib/quotes";
import { pageMetadata } from "../lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("home");

export default async function HomePage() {
  const quotes = await getGlobalQuotesOrNull();
  return <HomeView initialQuotes={quotes} />;
}
