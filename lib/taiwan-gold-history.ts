import {
  JEWELRY_SELL_PREMIUM_RATE,
  RECYCLE_PURITY,
  jewelrySellFromBuy,
  qianFromGoldUsd,
  recycleEstimateTwd,
} from "./section-quotes";
import { fetchYahooChartCloses, type ChartClose } from "./yahoo-chart";

export type TaiwanGoldDay = {
  date: string;
  timestamp: number;
  goldUsd: number;
  usdTwd: number;
  fxPaired: boolean;
  buyQian: number;
  sellQian: number;
  recycleFine: number;
  recycle916: number;
  recycle750: number;
  changeQian: number | null;
  changePercent: number | null;
};

export type TaiwanGoldRange = {
  high: number;
  low: number;
  average: number;
  basis: "sell";
  count: number;
};

export type TaiwanGoldHistory = {
  days: TaiwanGoldDay[];
  range: TaiwanGoldRange | null;
  fxMode: "daily" | "latest";
  source: string;
  premiumRate: number;
};

export function sessionDate(timestamp: number, timeZone = "America/New_York"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export function mapClosesByDate(points: ChartClose[]): Map<string, ChartClose> {
  const map = new Map<string, ChartClose>();
  for (const point of points) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    map.set(sessionDate(point.timestamp), point);
  }
  return map;
}

function fxForDate(
  date: string,
  fxByDate: Map<string, ChartClose>,
  fxChrono: Array<[string, ChartClose]>,
  latestUsdTwd: number | null,
): { rate: number; paired: boolean } | null {
  const exact = fxByDate.get(date);
  if (exact) return { rate: exact.close, paired: true };
  let prior: number | null = null;
  for (const [day, point] of fxChrono) {
    if (day <= date) prior = point.close;
    else break;
  }
  if (prior !== null) return { rate: prior, paired: false };
  if (latestUsdTwd !== null && Number.isFinite(latestUsdTwd) && latestUsdTwd > 0) {
    return { rate: latestUsdTwd, paired: false };
  }
  return null;
}

export function summarizeSellRange(days: TaiwanGoldDay[]): TaiwanGoldRange | null {
  if (!days.length) return null;
  const sells = days.map((day) => day.sellQian);
  return {
    high: Math.max(...sells),
    low: Math.min(...sells),
    average: Math.round(sells.reduce((sum, value) => sum + value, 0) / sells.length),
    basis: "sell",
    count: sells.length,
  };
}

export function buildTaiwanGoldHistory(
  goldPoints: ChartClose[],
  fxPoints: ChartClose[],
  latestUsdTwd: number | null,
  limit = 30,
): TaiwanGoldHistory | null {
  const gold = goldPoints
    .filter((point) => Number.isFinite(point.close) && point.close > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (!gold.length) return null;

  const fxByDate = mapClosesByDate(fxPoints);
  const fxChrono = [...fxByDate.entries()].sort(([left], [right]) => left.localeCompare(right));
  const chronological: TaiwanGoldDay[] = [];

  for (const point of gold) {
    const date = sessionDate(point.timestamp);
    const fx = fxForDate(date, fxByDate, fxChrono, latestUsdTwd);
    if (!fx) continue;
    const buyQian = qianFromGoldUsd(point.close, fx.rate);
    const sellQian = jewelrySellFromBuy(buyQian);
    chronological.push({
      date,
      timestamp: point.timestamp,
      goldUsd: point.close,
      usdTwd: fx.rate,
      fxPaired: fx.paired,
      buyQian,
      sellQian,
      recycleFine: recycleEstimateTwd(buyQian, RECYCLE_PURITY["999.9"]),
      recycle916: recycleEstimateTwd(buyQian, RECYCLE_PURITY["916"]),
      recycle750: recycleEstimateTwd(buyQian, RECYCLE_PURITY["750"]),
      changeQian: null,
      changePercent: null,
    });
  }

  if (!chronological.length) return null;

  const window = chronological.slice(-limit);
  for (let index = 1; index < window.length; index += 1) {
    const previous = window[index - 1];
    const current = window[index];
    const changeQian = current.sellQian - previous.sellQian;
    current.changeQian = changeQian;
    current.changePercent = previous.sellQian ? (changeQian / previous.sellQian) * 100 : null;
  }

  const paired = window.filter((day) => day.fxPaired).length;
  const fxMode: TaiwanGoldHistory["fxMode"] = paired >= Math.max(1, Math.ceil(window.length / 2)) ? "daily" : "latest";
  const source = fxMode === "daily"
    ? "COMEX GC 日線收盤 × 當日 USD/TWD（Yahoo Finance）換算理論台幣／錢，再依 4% 估計賣出與成色回收"
    : "COMEX GC 日線收盤 × 最新可用 USD/TWD 換算理論台幣／錢（非逐日匯率），再依 4% 估計賣出與成色回收";

  return {
    days: [...window].reverse(),
    range: summarizeSellRange(window),
    fxMode,
    source,
    premiumRate: JEWELRY_SELL_PREMIUM_RATE,
  };
}

export async function fetchTaiwanHistoryInputs(): Promise<{ gold: ChartClose[]; fx: ChartClose[] }> {
  const [gold, fx] = await Promise.all([
    fetchYahooChartCloses("GC=F", "2mo", "1d"),
    fetchYahooChartCloses("TWD=X", "2mo", "1d"),
  ]);
  return { gold: gold?.points ?? [], fx: fx?.points ?? [] };
}

export async function loadTaiwanGoldHistory(latestUsdTwd?: number | null): Promise<TaiwanGoldHistory | null> {
  const { gold, fx } = await fetchTaiwanHistoryInputs();
  return buildTaiwanGoldHistory(gold, fx, latestUsdTwd ?? null);
}
