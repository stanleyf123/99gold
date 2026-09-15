import { NextResponse } from "next/server";
import {
  getMetalHistory,
  historyPeriodConfig,
  isHistoryPeriod,
  isMetalChartPeriod,
  resolveMetalHistorySymbol,
  type HistoryPeriod,
} from "../../../lib/gold-history";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const symbol = resolveMetalHistorySymbol(params.get("symbol"));
  const requested = params.get("period")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: "unknown metal symbol", hint: "Use GC=F, SI=F, PL=F (PT=F alias), or PA=F" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const period: HistoryPeriod = symbol === "GC=F"
    ? (isHistoryPeriod(requested) ? requested : "1M")
    : (isMetalChartPeriod(requested) ? requested : "1M");
  const config = historyPeriodConfig[period];

  try {
    const data = await getMetalHistory(symbol, period);
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, max-age=${config.cacheSeconds}, s-maxage=${config.cacheSeconds}` },
    });
  } catch {
    return NextResponse.json(
      { error: "metal history unavailable", period, symbol },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
