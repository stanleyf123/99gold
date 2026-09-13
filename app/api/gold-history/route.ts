import { NextResponse } from "next/server";

type HistoryPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";

type YahooHistoryResponse = {
  chart?: {
    result?: Array<{
      meta?: { currency?: string; exchangeName?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

const periodConfig: Record<HistoryPeriod, { range: string; interval: string; cacheSeconds: number }> = {
  "1D": { range: "1d", interval: "5m", cacheSeconds: 180 },
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
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=${config.interval}&range=${config.range}`,
      { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } },
    );
    if (!response.ok) throw new Error("history unavailable");
    const data = await response.json() as YahooHistoryResponse;
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps
      .map((timestamp, index) => ({ timestamp, close: closes[index] }))
      .filter((point): point is { timestamp: number; close: number } => Number.isFinite(point.close));

    if (points.length < 2) throw new Error("history data missing");

    const values = points.map((point) => point.close);
    const open = values[0];
    const close = values[values.length - 1];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = close - open;
    const changePercent = open ? (change / open) * 100 : 0;

    return NextResponse.json({
      period,
      points,
      stats: { open, close, high, low, change, changePercent },
      updatedAt: new Date().toISOString(),
      source: `${result?.meta?.exchangeName ?? "COMEX"} GC futures via Yahoo Finance`,
      currency: result?.meta?.currency ?? "USD",
    }, { headers: { "Cache-Control": `public, max-age=${config.cacheSeconds}, s-maxage=${config.cacheSeconds}` } });
  } catch {
    return NextResponse.json(
      { error: "gold history unavailable", period },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
