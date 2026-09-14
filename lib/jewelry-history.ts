import {
  getGoldHistory,
  historyPeriodConfig,
  isHistoryPeriod,
  type GoldHistory,
  type HistoryPeriod,
  type HistoryPoint,
  type HistoryStats,
} from "./gold-history";
import {
  fxHonestyLabel,
  fxSourceSummary,
  getHistoricalUsdTwdOrEmpty,
  type HistoricalFxSeries,
} from "./historical-fx";
import {
  jewelryHistoryRows,
  jewelryRangeFromRows,
  type JewelryDayRow,
  type JewelryRange,
} from "./section-quotes";

export type JewelryHistory = {
  period: HistoryPeriod;
  points: HistoryPoint[];
  rows: JewelryDayRow[];
  stats: HistoryStats;
  range: JewelryRange | null;
  quotedAt: string;
  updatedAt: string;
  retrievedAt: string;
  source: string;
  currency: "TWD";
  fxSource: string;
  fxBasis: HistoricalFxSeries["basis"];
  fxLabel: string;
  coverage: "full" | "partial";
  omitted: number;
  goldPoints: number;
};

function statsFromBuys(rows: JewelryDayRow[]): HistoryStats {
  const values = rows.map((row) => row.buy);
  const open = values[0];
  const close = values[values.length - 1];
  const high = Math.max(...values);
  const low = Math.min(...values);
  const change = close - open;
  const changePercent = open ? (change / open) * 100 : 0;
  return { open, close, high, low, change, changePercent };
}

export async function getJewelryHistory(period: HistoryPeriod = "1M"): Promise<JewelryHistory> {
  const gold = await getGoldHistory(period);
  return buildJewelryHistory(period, gold);
}

export async function getJewelryHistoryOrNull(period: HistoryPeriod = "1M"): Promise<JewelryHistory | null> {
  try {
    return await getJewelryHistory(period);
  } catch {
    return null;
  }
}

export async function buildJewelryHistory(period: HistoryPeriod, gold: GoldHistory): Promise<JewelryHistory> {
  const first = gold.points[0]?.timestamp;
  const last = gold.points.at(-1)?.timestamp;
  if (first == null || last == null) throw new Error("jewelry history missing");
  const fx = await getHistoricalUsdTwdOrEmpty(first, last);
  const rows = jewelryHistoryRows(gold.points, fx.rates);
  if (rows.length < 2) throw new Error("jewelry history unpaired");
  const omitted = gold.points.filter((point) => Number.isFinite(point.close) && point.close > 0).length - rows.length;
  const stats = statsFromBuys(rows);
  const quotedAt = new Date(rows.at(-1)!.timestamp * 1000).toISOString();
  return {
    period,
    points: rows.map((row) => ({ timestamp: row.timestamp, close: row.buy })),
    rows,
    stats,
    range: jewelryRangeFromRows(rows),
    quotedAt,
    updatedAt: quotedAt,
    retrievedAt: new Date().toISOString(),
    source: `${gold.source} × ${fxSourceSummary(fx.basis, fx.sources)}`,
    currency: "TWD",
    fxSource: fxSourceSummary(fx.basis, fx.sources),
    fxBasis: fx.basis,
    fxLabel: fxHonestyLabel("zh", fx.basis),
    coverage: omitted > 0 ? "partial" : "full",
    omitted,
    goldPoints: gold.points.length,
  };
}

export function jewelryHistoryCacheSeconds(period: string): number {
  return isHistoryPeriod(period) ? historyPeriodConfig[period].cacheSeconds : 900;
}
