import { NextResponse } from "next/server";
import { fetchYahooChartCloses } from "../../../lib/yahoo-chart";

type HistoryPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";

const periodConfig: Record<HistoryPeriod, { range: string; interval: string; cacheSeconds: number }> = {
  "1D": { range: "5d", interval: "5m", cacheSeconds: 180 },
  "1W": { range: "5d", interval: "30m", cacheSeconds: 300 },
  "1M": { range: "1mo", interval: "1d", cacheSeconds: 900 },
  "3M": { range: "3mo", interval: "1d", cacheSeconds: 1800 },
  "1Y": { range: "1y", interval: "1wk", cacheSeconds: 3600 },
};

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("period")?.toUpperCase() as HistoryPeriod | undefined;
  const period: HistoryPeriod = requested && requested in periodConfig ? requested : "1M";
  const config = periodConfig[period];

  try {
    const chart = await fetchYahooChartCloses("GC=F", config.range, config.interval);
    const allPoints = chart?.points ?? [];
    const latestTimestamp = allPoints.at(-1)?.timestamp;
    const points = period === "1D" && latestTimestamp
      ? allPoints.filter((point) => point.timestamp >= latestTimestamp - 86_400)
      : allPoints;

    if (points.length < 2) throw new Error("history data missing");

    const values = points.map((point) => point.close);
    const open = values[0];
    const close = values[values.length - 1];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = close - open;
    const changePercent = open ? (change / open) * 100 : 0;
    const finalPoint = points.at(-1);
    if (!finalPoint) throw new Error("history timestamp missing");
    const quotedAt = new Date(finalPoint.timestamp * 1000).toISOString();
    const retrievedAt = new Date().toISOString();

    return NextResponse.json({
      period,
      points,
      stats: { open, close, high, low, change, changePercent },
      quotedAt,
      updatedAt: quotedAt,
      retrievedAt,
      source: `${chart?.exchangeName ?? "COMEX"} GC futures via Yahoo Finance`,
      currency: chart?.currency ?? "USD",
    }, { headers: { "Cache-Control": `public, max-age=${config.cacheSeconds}, s-maxage=${config.cacheSeconds}` } });
  } catch {
    return NextResponse.json(
      { error: "gold history unavailable", period },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
