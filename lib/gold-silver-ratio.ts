import {
  boundHistoryPoints,
  downsampleToUtcWeekCloses,
  getMetalHistory,
  historyLookbackDays,
  isRatioHistoryPeriod,
  windowHistoryPoints,
  type GoldHistory,
  type HistoryPeriod,
  type HistoryPoint,
  type HistoryStats,
  type RatioHistoryPeriod,
} from "./gold-history";

export { isRatioHistoryPeriod, RATIO_HISTORY_PERIODS, type RatioHistoryPeriod } from "./gold-history";

export const RATIO_CHART_MAX_POINTS = 220;

export type RatioHistoryCoverage = "full" | "partial" | "empty";
export type RatioHistorySampling = "daily" | "weekly";

export type GoldSilverRatioHistory = {
  period: HistoryPeriod;
  points: HistoryPoint[];
  stats: HistoryStats;
  coverage: Exclude<RatioHistoryCoverage, "empty">;
  sampled: RatioHistorySampling;
  pairedDays: number;
  quotedAt: string;
  retrievedAt: string;
  source: string;
};

export function goldSilverRatio(goldUsdPerOz: number, silverUsdPerOz: number): number | null {
  if (!Number.isFinite(goldUsdPerOz) || goldUsdPerOz <= 0) return null;
  if (!Number.isFinite(silverUsdPerOz) || silverUsdPerOz <= 0) return null;
  return goldUsdPerOz / silverUsdPerOz;
}

export function formatGoldSilverRatio(ratio: number | null, digits = 2): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return ratio.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function utcDayKey(timestamp: number): number {
  return Math.floor(timestamp / 86_400);
}

export function ratioHistoryPoints(gold: HistoryPoint[], silver: HistoryPoint[]): HistoryPoint[] {
  const silverByDay = new Map<number, number>();
  for (const point of silver) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    silverByDay.set(utcDayKey(point.timestamp), point.close);
  }
  const points: HistoryPoint[] = [];
  for (const point of gold) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    const silverClose = silverByDay.get(utcDayKey(point.timestamp));
    if (silverClose == null) continue;
    const ratio = goldSilverRatio(point.close, silverClose);
    if (ratio === null) continue;
    points.push({ timestamp: point.timestamp, close: ratio });
  }
  return points;
}

function statsFromPoints(points: HistoryPoint[]): HistoryStats {
  const values = points.map((point) => point.close);
  const open = values[0];
  const close = values[values.length - 1];
  const high = Math.max(...values);
  const low = Math.min(...values);
  const change = close - open;
  const changePercent = open ? (change / open) * 100 : 0;
  return { open, close, high, low, change, changePercent };
}

export function shouldWeeklySampleRatio(period: HistoryPeriod): boolean {
  return period === "3Y" || period === "5Y";
}

export function ratioChartPoints(daily: HistoryPoint[], period: HistoryPeriod): HistoryPoint[] {
  const sampled = shouldWeeklySampleRatio(period) ? downsampleToUtcWeekCloses(daily) : daily;
  return boundHistoryPoints(sampled, RATIO_CHART_MAX_POINTS);
}

export function ratioHistoryCoverage(
  period: HistoryPeriod,
  points: HistoryPoint[],
  nowSec = Math.floor(Date.now() / 1000),
): RatioHistoryCoverage {
  if (points.length < 2) return "empty";
  const days = historyLookbackDays[period];
  if (days == null) return "full";
  const span = points[points.length - 1].timestamp - points[0].timestamp;
  return span >= days * 86_400 * 0.55 ? "full" : "partial";
}

export async function getGoldSilverRatioHistory(period: HistoryPeriod = "1M"): Promise<GoldSilverRatioHistory> {
  const fetchPeriod: RatioHistoryPeriod = isRatioHistoryPeriod(period) ? period : "1M";
  const [gold, silver] = await Promise.all([
    getMetalHistory("GC=F", fetchPeriod, { interval: "1d" }),
    getMetalHistory("SI=F", fetchPeriod, { interval: "1d" }),
  ]);
  return buildGoldSilverRatioHistory(fetchPeriod, gold, silver);
}

export function buildGoldSilverRatioHistory(
  period: HistoryPeriod,
  gold: Pick<GoldHistory, "points" | "quotedAt" | "retrievedAt" | "source">,
  silver: Pick<GoldHistory, "points" | "source">,
  nowSec = Math.floor(Date.now() / 1000),
): GoldSilverRatioHistory {
  const paired = ratioHistoryPoints(gold.points, silver.points);
  const daily = period === "1Y" || period === "3Y" || period === "5Y"
    ? windowHistoryPoints(paired, period, nowSec)
    : paired;
  if (daily.length < 2) throw new Error("ratio history missing");
  const coverage = ratioHistoryCoverage(period, daily, nowSec);
  if (coverage === "empty") throw new Error("ratio history missing");
  const points = ratioChartPoints(daily, period);
  const finalPoint = daily.at(-1);
  if (!finalPoint) throw new Error("ratio history missing");
  return {
    period,
    points,
    stats: statsFromPoints(daily),
    coverage,
    sampled: shouldWeeklySampleRatio(period) ? "weekly" : "daily",
    pairedDays: daily.length,
    quotedAt: new Date(finalPoint.timestamp * 1000).toISOString(),
    retrievedAt: gold.retrievedAt,
    source: `${gold.source} · ${silver.source}`,
  };
}

export async function getGoldSilverRatioHistoryOrNull(period: HistoryPeriod = "1M"): Promise<GoldSilverRatioHistory | null> {
  try {
    return await getGoldSilverRatioHistory(period);
  } catch {
    return null;
  }
}
