import { NextResponse } from "next/server";
import { getDailyGoldNews } from "../news-service";

export async function GET() {
  try {
    const { items, updatedAt } = await getDailyGoldNews();
    return NextResponse.json({ items, updatedAt: updatedAt ? `今日新聞更新：${updatedAt}` : "新聞尚未完成更新" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ items: [], updatedAt: "新聞暫時無法更新" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
