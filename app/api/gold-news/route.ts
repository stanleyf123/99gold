import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getDailyGoldNews } from "../news-service";

export async function GET() {
  try {
    const { items, updatedAt, checkedAt, scheduleStatus } = await getDailyGoldNews("zh", env.DB);
    return NextResponse.json({ items, updatedAt: updatedAt ? `文章發布：${updatedAt}` : "最近7天暫無新文章", publishedAt:updatedAt, checkedAt, scheduleStatus }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("gold-news refresh failed", error);
    return NextResponse.json({ items: [], updatedAt: "新聞暫時無法更新" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
