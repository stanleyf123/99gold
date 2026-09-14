import { NextResponse } from "next/server";
import { getGlobalQuotes } from "../../../lib/quotes";

export async function GET() {
  try {
    const data = await getGlobalQuotes();
    if (!data.items.length || !data.quotedAt || !data.retrievedAt) throw new Error("Gold unavailable");

    return NextResponse.json({
      items: data.items,
      quotedAt: data.quotedAt,
      updatedAt: data.quotedAt,
      retrievedAt: data.retrievedAt,
      fxQuotedAt: data.fxQuotedAt ?? null,
      marketStatus: data.marketStatus ?? "delayed",
      quoteSource: data.quoteSource ?? data.source ?? "Yahoo Finance",
      source: data.source ?? "Yahoo Finance",
    }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json(
      { items: [], quotedAt: null, retrievedAt: new Date().toISOString(), updatedAt: null, marketStatus: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
