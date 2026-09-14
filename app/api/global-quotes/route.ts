import { NextResponse } from "next/server";
import { getGlobalQuotes } from "../../../lib/quotes";

export async function GET() {
  try {
    const data = await getGlobalQuotes();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json(
      { error: "global quotes unavailable", retrievedAt: new Date().toISOString(), marketStatus: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
