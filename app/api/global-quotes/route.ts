import { NextResponse } from "next/server";

type FxResponse = { rates?: Record<string, number> };
type GoldApiResponse = {
  currency?: string;
  name?: string;
  price?: number;
  symbol?: string;
  updatedAt?: string;
};
type YahooResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketTime?: number;
        currency?: string;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ open?: Array<number | null>; close?: Array<number | null> }> };
    }>;
  };
};

const instruments = [
  ["gold", "GC=F", "XAU", "黃金期貨", "Gold Futures", "黃金現貨參考", "Gold Spot Reference"],
  ["silver", "SI=F", "XAG", "白銀期貨", "Silver Futures", "白銀現貨參考", "Silver Spot Reference"],
  ["platinum", "PL=F", "XPT", "鉑金期貨", "Platinum Futures", "鉑金現貨參考", "Platinum Spot Reference"],
  ["palladium", "PA=F", "XPD", "鈀金期貨", "Palladium Futures", "鈀金現貨參考", "Palladium Spot Reference"],
] as const;

type Instrument = (typeof instruments)[number];
type MetalQuote = {
  id: Instrument[0];
  symbol: string;
  name: string;
  englishName: string;
  price: number;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  venue: string;
  quotedAt: string;
  series: Array<{ timestamp: number; close: number }>;
  basis: "futures" | "spot";
  source: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function getCurrencies() {
  const currencies: Record<string, number> = { USD: 1 };
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return currencies;
    const data = await response.json() as FxResponse;
    for (const code of ["TWD", "HKD", "CNY", "JPY", "EUR"]) {
      const rate = data.rates?.[code];
      if (isFiniteNumber(rate) && rate > 0) currencies[code] = rate;
    }
  } catch {
    // FX is optional for the international quote. Taiwan conversions fail closed downstream.
  }
  return currencies;
}

async function getYahooQuote(instrument: Instrument): Promise<MetalQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument[1])}?interval=5m&range=5d`,
      { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } },
    );
    if (!response.ok) return null;
    const data = await response.json() as YahooResponse;
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!isFiniteNumber(meta?.regularMarketPrice)) return null;

    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    const closes = quote?.close ?? [];
    const completeSeries = timestamps
      .map((timestamp, index) => ({ timestamp, close: closes[index] }))
      .filter((point): point is { timestamp: number; close: number } => isFiniteNumber(point.close));
    const latestPointTimestamp = completeSeries.at(-1)?.timestamp;
    const sessionStart = isFiniteNumber(latestPointTimestamp) ? latestPointTimestamp - 86_400 : 0;
    const series = completeSeries.filter((point) => point.timestamp >= sessionStart);
    const sessionOpen = timestamps
      .map((timestamp, index) => ({ timestamp, open: quote?.open?.[index] }))
      .find((point) => point.timestamp >= sessionStart && isFiniteNumber(point.open))?.open
      ?? series[0]?.close
      ?? null;
    const observedHigh = series.length ? Math.max(...series.map((point) => point.close)) : null;
    const observedLow = series.length ? Math.min(...series.map((point) => point.close)) : null;
    const previousClose = isFiniteNumber(meta.previousClose) ? meta.previousClose : null;
    const quotedTimestamp = isFiniteNumber(meta.regularMarketTime)
      ? meta.regularMarketTime
      : series.at(-1)?.timestamp;
    if (!isFiniteNumber(quotedTimestamp)) return null;

    const price = meta.regularMarketPrice;
    const change = previousClose === null ? null : price - previousClose;
    return {
      id: instrument[0],
      symbol: instrument[1],
      name: instrument[3],
      englishName: instrument[4],
      price,
      previousClose,
      open: sessionOpen,
      high: isFiniteNumber(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : observedHigh,
      low: isFiniteNumber(meta.regularMarketDayLow) ? meta.regularMarketDayLow : observedLow,
      change,
      changePercent: change !== null && previousClose ? (change / previousClose) * 100 : null,
      currency: meta.currency ?? "USD",
      venue: meta.exchangeName ?? "COMEX",
      quotedAt: new Date(quotedTimestamp * 1000).toISOString(),
      series,
      basis: "futures",
      source: "Yahoo Finance chart",
    };
  } catch {
    return null;
  }
}

async function getSpotFallback(instrument: Instrument): Promise<MetalQuote | null> {
  try {
    const response = await fetch(`https://api.gold-api.com/price/${instrument[2]}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json() as GoldApiResponse;
    const quotedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    if (!isFiniteNumber(data.price) || !quotedAt || Number.isNaN(quotedAt.getTime())) return null;
    return {
      id: instrument[0],
      symbol: `${instrument[2]}/USD`,
      name: instrument[5],
      englishName: instrument[6],
      price: data.price,
      previousClose: null,
      open: null,
      high: null,
      low: null,
      change: null,
      changePercent: null,
      currency: data.currency ?? "USD",
      venue: "OTC SPOT",
      quotedAt: quotedAt.toISOString(),
      series: [],
      basis: "spot",
      source: "Gold API public spot reference",
    };
  } catch {
    return null;
  }
}

async function getQuote(instrument: Instrument) {
  return await getYahooQuote(instrument) ?? await getSpotFallback(instrument);
}

export async function GET() {
  try {
    // Resolve gold first so optional symbols cannot cause Yahoo burst limits to hide the main quote.
    const [gold, currencies] = await Promise.all([getQuote(instruments[0]), getCurrencies()]);
    if (!gold) throw new Error("Gold quote missing");

    const optionalMetals = await Promise.all(instruments.slice(1).map(getQuote));
    const metals = [gold, ...optionalMetals.filter((metal): metal is MetalQuote => metal !== null)];
    const sources = [...new Set(metals.map((metal) => metal.source))];

    return NextResponse.json({
      metals,
      currencies,
      updatedAt: gold.quotedAt,
      retrievedAt: new Date().toISOString(),
      source: `${sources.join(" + ")} · open.er-api.com FX`,
    }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=180" } });
  } catch {
    return NextResponse.json(
      { error: "global quotes unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
