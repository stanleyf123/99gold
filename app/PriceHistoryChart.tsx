"use client";

import { useEffect, useMemo, useState } from "react";
import { MarketLineChart, type MarketChartPoint } from "./MarketLineChart";
import { type Locale, t } from "./locale";
import { type HistoryPeriod } from "../lib/gold-history";

export type ChartPeriod = Extract<HistoryPeriod, "1M" | "3M" | "1Y" | "3Y" | "5Y">;

type HistoryPayload = {
  points?: MarketChartPoint[];
  rows?: Array<{
    timestamp: number;
    buy?: number;
    sell?: number;
    change?: number | null;
    recycleFine?: number;
    usdTwd?: number;
    fxDate?: string | null;
    fxSource?: string | null;
  }>;
  range?: { sellHigh: number; sellLow: number; sellAvg: number; buyHigh: number; buyLow: number; buyAvg: number; count: number } | null;
  omitted?: number;
  source?: string;
  stats?: { open: number; close: number; high: number; low: number; changePercent: number };
  retrievedAt?: string;
  coverage?: "full" | "partial";
  sampled?: "daily" | "weekly";
};

type RemoteHistory = {
  period: ChartPeriod;
  status: "ok" | "fail";
  points: MarketChartPoint[];
  coverage: "full" | "partial";
};

const DEFAULT_PERIODS: ChartPeriod[] = ["1M", "3M"];

function periodLabel(locale: Locale, period: ChartPeriod): string {
  switch (period) {
    case "1M":
      return t(locale, "30日", "30D", "30日");
    case "3M":
      return t(locale, "90日", "90D", "90日");
    case "1Y":
      return t(locale, "1年", "1Y", "1年");
    case "3Y":
      return t(locale, "3年", "3Y", "3年");
    case "5Y":
      return t(locale, "5年", "5Y", "5年");
  }
}

export function PriceHistoryChart({
  locale,
  currency,
  title,
  ariaLabel,
  initialPeriod = "1M",
  initialPoints,
  convertClose,
  note,
  endpoint = "/api/gold-history",
  formatValue,
  periods = DEFAULT_PERIODS,
  period: controlledPeriod,
  onPeriodChange,
  onHistoryData,
}: {
  locale: Locale;
  currency?: "USD" | "TWD";
  title: string;
  ariaLabel: string;
  initialPeriod?: ChartPeriod;
  initialPoints: MarketChartPoint[];
  convertClose?: (usdClose: number) => number;
  note?: string;
  endpoint?: string;
  formatValue?: (value: number) => string;
  periods?: ChartPeriod[];
  period?: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
  onHistoryData?: (period: ChartPeriod, data: HistoryPayload) => void;
}) {
  const [internalPeriod, setInternalPeriod] = useState<ChartPeriod>(initialPeriod);
  const period = controlledPeriod ?? internalPeriod;
  const [remote, setRemote] = useState<RemoteHistory | null>(null);

  const usingInitial = period === initialPeriod;

  const selectPeriod = (next: ChartPeriod) => {
    if (controlledPeriod === undefined) setInternalPeriod(next);
    onPeriodChange?.(next);
  };

  useEffect(() => {
    if (period === initialPeriod) return;
    let disposed = false;
    fetch(`${endpoint}?period=${period}`)
      .then((response) => (response.ok ? (response.json() as Promise<HistoryPayload>) : Promise.reject(new Error("history unavailable"))))
      .then((data) => {
        if (disposed) return;
        const next = (data.points ?? [])
          .map((point) => ({
            timestamp: point.timestamp,
            close: convertClose ? convertClose(point.close) : point.close,
          }))
          .filter((point) => Number.isFinite(point.close) && point.close > 0);
        setRemote({
          period,
          status: next.length > 1 ? "ok" : "fail",
          points: next,
          coverage: data.coverage === "partial" ? "partial" : "full",
        });
        onHistoryData?.(period, data);
      })
      .catch(() => {
        if (!disposed) {
          setRemote({ period, status: "fail", points: [], coverage: "full" });
          onHistoryData?.(period, { points: [], rows: [], omitted: 0 });
        }
      });
    return () => { disposed = true; };
  }, [convertClose, endpoint, initialPeriod, onHistoryData, period]);

  const points = useMemo(
    () => usingInitial ? initialPoints : (remote?.period === period && remote.status === "ok" ? remote.points : []),
    [initialPoints, period, remote, usingInitial],
  );
  const loading = !usingInitial && remote?.period !== period;
  const partial = !usingInitial && remote?.period === period && remote.status === "ok" && remote.coverage === "partial";

  const positive = useMemo(() => {
    if (points.length < 2) return true;
    return points[points.length - 1].close >= points[0].close;
  }, [points]);

  return (
    <section className="sectionChart">
      <div className="sectionChartHead">
        <div>
          <p>PRICE HISTORY</p>
          <h3>{title}</h3>
        </div>
        <div className="sectionChartPeriods" role="group" aria-label={t(locale, "走勢期間", "Chart period", "チャート期間")}>
          {periods.map((item) => (
            <button key={item} type="button" className={period === item ? "selected" : ""} aria-pressed={period === item} onClick={() => selectPeriod(item)}>
              {periodLabel(locale, item)}
            </button>
          ))}
        </div>
      </div>
      {points.length > 1 ? (
        <MarketLineChart
          key={`${period}-${points.length}-${points[points.length - 1]?.timestamp ?? 0}`}
          points={points}
          positive={positive}
          locale={locale}
          period={period}
          currency={currency ?? "USD"}
          formatValue={formatValue}
          ariaLabel={`${period} ${ariaLabel}`}
        />
      ) : (
        <div className="marketChartUnavailable">
          {loading
            ? t(locale, "正在取得歷史行情", "Loading historical data", "履歴データを取得中")
            : t(locale, "資料不足", "Insufficient data", "データ不足")}
        </div>
      )}
      {partial ? (
        <p className="sectionChartNote" role="status">
          {t(locale, "資料不足完整區間，僅顯示可配對的歷史。", "Insufficient coverage; only paired history is shown.", "期間全体のデータが不足しているため、突合できた履歴のみ表示します。")}
        </p>
      ) : null}
      {note ? <p className="sectionChartNote">{note}</p> : null}
    </section>
  );
}

export default PriceHistoryChart;
