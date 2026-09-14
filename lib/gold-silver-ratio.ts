import {
  getMetalHistory,
  type GoldHistory,
  type HistoryPeriod,
  type HistoryPoint,
  type HistoryStats,
} from "./gold-history";

export type GoldSilverRatioHistory = {
  period: HistoryPeriod;
  points: HistoryPoint[];
  stats: HistoryStats;
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

export async function getGoldSilverRatioHistory(period: HistoryPeriod = "1M"): Promise<GoldSilverRatioHistory> {
  const [gold, silver] = await Promise.all([
    getMetalHistory("GC=F", period),
    getMetalHistory("SI=F", period),
  ]);
  return buildGoldSilverRatioHistory(period, gold, silver);
}

export function buildGoldSilverRatioHistory(
  period: HistoryPeriod,
  gold: Pick<GoldHistory, "points" | "quotedAt" | "retrievedAt" | "source">,
  silver: Pick<GoldHistory, "points" | "source">,
): GoldSilverRatioHistory {
  const points = ratioHistoryPoints(gold.points, silver.points);
  if (points.length < 2) throw new Error("ratio history missing");
  const finalPoint = points.at(-1);
  if (!finalPoint) throw new Error("ratio history missing");
  return {
    period,
    points,
    stats: statsFromPoints(points),
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
