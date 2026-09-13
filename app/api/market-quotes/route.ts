import { NextResponse } from "next/server";
import { GET as getGlobalQuotes } from "../global-quotes/route";

export async function GET() {
  try {
    const response = await getGlobalQuotes();
    if (!response.ok) throw new Error("Source unavailable");
    const data = await response.json() as {
      items?: Array<{ label: string; code: string; price: string; unit: string; change: string; up: boolean | null }>;
      quotedAt?: string;
      retrievedAt?: string;
      fxQuotedAt?: string | null;
      marketStatus?: "open" | "delayed" | "daily-break" | "weekend-closed" | "unavailable";
      quoteSource?: string;
      source?: string;
    };
    if (!data.items?.length || !data.quotedAt || !data.retrievedAt) throw new Error("Gold unavailable");

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
