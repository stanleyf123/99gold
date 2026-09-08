import { NextResponse } from "next/server";
import { getGoldNews, updatedAt } from "../news-service";

export async function GET() {
  const { items, isFallback } = await getGoldNews();
  return NextResponse.json({ items, updatedAt: updatedAt(isFallback) }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
