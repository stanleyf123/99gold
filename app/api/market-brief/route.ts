import { NextResponse } from "next/server";
import { getDailyGoldNews } from "../news-service";

export async function GET(request: Request) {
  try {
    const locale = new URL(request.url).searchParams.get("lang") ?? "zh";
    const { items, updatedAt } = await getDailyGoldNews(locale);
    const label=locale==="en"?"Article published":locale==="ja"?"記事公開":"文章發布";
    return NextResponse.json({ items, updatedAt: updatedAt ? `${label}: ${updatedAt}` : "—" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("market-news refresh failed", error);
    return NextResponse.json({ items: [], updatedAt: "新聞暫時無法更新" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
