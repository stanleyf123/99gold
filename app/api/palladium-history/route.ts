import { NextResponse } from "next/server";
import {
  getPalladiumHistory,
  historyPeriodConfig,
  isMetalChartPeriod,
  type HistoryPeriod,
} from "../../../lib/gold-history";

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("period")?.toUpperCase();
  const period: HistoryPeriod = isMetalChartPeriod(requested) ? requested : "1M";
  const config = historyPeriodConfig[period];

  try {
    const data = await getPalladiumHistory(period);
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, max-age=${config.cacheSeconds}, s-maxage=${config.cacheSeconds}` },
    });
  } catch {
    return NextResponse.json(
      { error: "palladium history unavailable", period, symbol: "PA=F" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
