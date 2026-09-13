import { NextResponse } from "next/server";

type FxResponse = { rates?: Record<string, number> };
type YahooResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketOpen?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketTime?: number;
        currency?: string;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

const instruments = [
  ["gold", "GC=F", "黃金期貨", "Gold Futures"],
  ["silver", "SI=F", "白銀期貨", "Silver Futures"],
  ["platinum", "PL=F", "鉑金期貨", "Platinum Futures"],
  ["palladium", "PA=F", "鈀金期貨", "Palladium Futures"],
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function GET() {
  try {
    const [fxResult, ...metalResults] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD", { headers: { Accept: "application/json" } }),
      ...instruments.map(([, symbol]) => fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`,
        { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } },
      )),
    ]);

    const fx = fxResult.ok ? await fxResult.json() as FxResponse : undefined;
    const currencies = ["TWD", "HKD", "CNY", "JPY", "EUR"].reduce<Record<string, number>>((all, code) => {
      const rate = fx?.rates?.[code];
      return isFiniteNumber(rate) ? { ...all, [code]: rate } : all;
    }, { USD: 1 });

    const results = await Promise.all(metalResults.map(async (response, index) => {
      if (!response.ok) return null;
      const data = await response.json() as YahooResponse;
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      if (
        !isFiniteNumber(meta?.regularMarketPrice)
        || !isFiniteNumber(meta?.previousClose)
        || !isFiniteNumber(meta?.regularMarketOpen)
        || !isFiniteNumber(meta?.regularMarketDayHigh)
        || !isFiniteNumber(meta?.regularMarketDayLow)
        || !isFiniteNumber(meta?.regularMarketTime)
      ) return null;

      const timestamps = result?.timestamp ?? [];
      const closes = result?.indicators?.quote?.[0]?.close ?? [];
      const series = index === 0
        ? timestamps
          .map((timestamp, pointIndex) => ({ timestamp, close: closes[pointIndex] }))
          .filter((point): point is { timestamp: number; close: number } => isFiniteNumber(point.close))
        : [];
      const price = meta.regularMarketPrice;
      const previousClose = meta.previousClose;

      return {
        id: instruments[index][0],
        symbol: instruments[index][1],
        name: instruments[index][2],
        englishName: instruments[index][3],
        price,
        previousClose,
        open: meta.regularMarketOpen,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        change: price - previousClose,
        changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
        currency: meta.currency ?? "USD",
        venue: meta.exchangeName ?? "COMEX",
        quotedAt: new Date(meta.regularMarketTime * 1000).toISOString(),
        series,
      };
    }));

    const metals = results.filter((metal): metal is NonNullable<typeof metal> => metal !== null);
    const gold = metals.find((metal) => metal.id === "gold");
    if (!gold) throw new Error("Gold quote missing");

    return NextResponse.json({
      metals,
      currencies,
      updatedAt: gold.quotedAt,
      retrievedAt: new Date().toISOString(),
      source: "Yahoo Finance futures reference + open.er-api.com FX",
    }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json(
      { error: "global quotes unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
