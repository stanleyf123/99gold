export const HISTORY_PERIODS = ["1D", "1W", "1M", "3M", "1Y", "3Y", "5Y"] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];

export const RATIO_HISTORY_PERIODS = ["1M", "3M", "1Y", "3Y", "5Y"] as const;
export type RatioHistoryPeriod = (typeof RATIO_HISTORY_PERIODS)[number];

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
  "3Y": { range: "5y", interval: "1d", cacheSeconds: 7200 },
  "5Y": { range: "5y", interval: "1d", cacheSeconds: 7200 },
};

/** Calendar-day lookback used to clip 1Y/3Y/5Y (and test 30D/90D) windows. */
export const historyLookbackDays: Record<HistoryPeriod, number | null> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  "3Y": 365 * 3,
  "5Y": 365 * 5,
};

export function isHistoryPeriod(value: string | null | undefined): value is HistoryPeriod {
  return HISTORY_PERIODS.includes(value as HistoryPeriod);
}

export function isRatioHistoryPeriod(value: string | null | undefined): value is RatioHistoryPeriod {
  return RATIO_HISTORY_PERIODS.includes(value as RatioHistoryPeriod);
}

export function windowHistoryPoints(
  points: HistoryPoint[],
  period: HistoryPeriod,
  nowSec = Math.floor(Date.now() / 1000),
): HistoryPoint[] {
  const days = historyLookbackDays[period];
  if (days == null) return points;
  const cutoff = nowSec - days * 86_400;
  return points.filter((point) => point.timestamp >= cutoff);
}

/** Keep the last actual close in each UTC week; never interpolate. */
export function downsampleToUtcWeekCloses(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length <= 2) return points;
  const byWeek = new Map<number, HistoryPoint>();
  for (const point of points) {
    byWeek.set(Math.floor(point.timestamp / (7 * 86_400)), point);
  }
  const sampled = [...byWeek.values()];
  const first = points[0];
  const last = points[points.length - 1];
  if (sampled[0]?.timestamp !== first.timestamp) sampled.unshift(first);
  if (sampled.at(-1)?.timestamp !== last.timestamp) sampled.push(last);
  return sampled;
}

/** Evenly pick actual points so a long series stays within `maxPoints`. */
export function boundHistoryPoints(points: HistoryPoint[], maxPoints: number): HistoryPoint[] {
  if (maxPoints < 2 || points.length <= maxPoints) return points;
  const lastIndex = points.length - 1;
  const result: HistoryPoint[] = [];
  let prev = -1;
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = index === maxPoints - 1 ? lastIndex : Math.round((index / (maxPoints - 1)) * lastIndex);
    if (sourceIndex === prev) continue;
    result.push(points[sourceIndex]);
    prev = sourceIndex;
  }
  return result;
}

export type MetalHistorySymbol = "GC=F" | "SI=F";

export async function getMetalHistory(
  symbol: MetalHistorySymbol,
  period: HistoryPeriod = "1M",
  options?: { interval?: string; range?: string },
): Promise<GoldHistory> {
  const config = historyPeriodConfig[period];
  const interval = options?.interval ?? config.interval;
  const range = options?.range ?? config.range;
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
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
    : period === "3Y"
      ? windowHistoryPoints(allPoints, "3Y")
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
  const exchange = result?.meta?.exchangeName ?? "COMEX";
  const source = symbol === "GC=F"
    ? `${exchange} GC futures via Yahoo Finance`
    : `${exchange} ${symbol} via Yahoo Finance`;

  return {
    period,
    points,
    stats: { open, close, high, low, change, changePercent },
    quotedAt,
    updatedAt: quotedAt,
    retrievedAt,
    source,
    currency: result?.meta?.currency ?? "USD",
  };
}

export async function getGoldHistory(period: HistoryPeriod = "1M"): Promise<GoldHistory> {
  return getMetalHistory("GC=F", period);
}

export async function getGoldHistoryOrNull(period: HistoryPeriod = "1M"): Promise<GoldHistory | null> {
  try {
    return await getGoldHistory(period);
  } catch {
    return null;
  }
}
