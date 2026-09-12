import { NextResponse } from "next/server";
import { getDailyGoldNews } from "../news-service";

export async function GET() {
  try {
    const { items, updatedAt } = await getDailyGoldNews();
    return NextResponse.json({ items, updatedAt: updatedAt ? `文章發布：${updatedAt}` : "最近7天暫無新文章" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("gold-news refresh failed", error);
    return NextResponse.json({ items: [], updatedAt: "新聞暫時無法更新" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
