export type HistoryPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";

export type HistoryPoint = { timestamp: number; close: number };

export type HistoryStats = {
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
};

export type GoldHistory = {
  period: HistoryPeriod;
  points: HistoryPoint[];
  stats: HistoryStats;
  quotedAt: string;
  updatedAt: string;
  retrievedAt: string;
  source: string;
  currency: string;
};

type YahooHistoryResponse = {
  chart?: {
    result?: Array<{
      meta?: { currency?: string; exchangeName?: string };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export const historyPeriodConfig: Record<HistoryPeriod, { range: string; interval: string; cacheSeconds: number }> = {
  "1D": { range: "5d", interval: "5m", cacheSeconds: 180 },
  "1W": { range: "5d", interval: "30m", cacheSeconds: 300 },
  "1M": { range: "1mo", interval: "1d", cacheSeconds: 900 },
  "3M": { range: "3mo", interval: "1d", cacheSeconds: 1800 },
  "1Y": { range: "1y", interval: "1wk", cacheSeconds: 3600 },
};

export function isHistoryPeriod(value: string | null | undefined): value is HistoryPeriod {
  return value === "1D" || value === "1W" || value === "1M" || value === "3M" || value === "1Y";
}

export async function getGoldHistory(period: HistoryPeriod = "1M"): Promise<GoldHistory> {
  const config = historyPeriodConfig[period];
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=${config.interval}&range=${config.range}`,
    {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      next: { revalidate: config.cacheSeconds },
    },
  );
  if (!response.ok) throw new Error("history unavailable");
  const data = await response.json() as YahooHistoryResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const allPoints = timestamps
    .map((timestamp, index) => ({ timestamp, close: closes[index] }))
    .filter((point): point is HistoryPoint => Number.isFinite(point.close));
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

  return {
    period,
    points,
    stats: { open, close, high, low, change, changePercent },
    quotedAt,
    updatedAt: quotedAt,
    retrievedAt,
    source: `${result?.meta?.exchangeName ?? "COMEX"} GC futures via Yahoo Finance`,
    currency: result?.meta?.currency ?? "USD",
  };
}

export async function getGoldHistoryOrNull(period: HistoryPeriod = "1M"): Promise<GoldHistory | null> {
  try {
    return await getGoldHistory(period);
  } catch {
    return null;
  }
}
