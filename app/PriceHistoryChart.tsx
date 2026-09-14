"use client";

import { useEffect, useMemo, useState } from "react";
import { MarketLineChart, type MarketChartPoint } from "./MarketLineChart";
import { type Locale, t } from "./locale";
import { type HistoryPeriod } from "../lib/gold-history";

type ChartPeriod = Extract<HistoryPeriod, "1M" | "3M">;

type HistoryPayload = {
  points?: MarketChartPoint[];
  stats?: { open: number; close: number; high: number; low: number; changePercent: number };
  retrievedAt?: string;
  source?: string;
};

type RemoteHistory = {
  period: ChartPeriod;
  status: "ok" | "fail";
  points: MarketChartPoint[];
};

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
}) {
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const [remote, setRemote] = useState<RemoteHistory | null>(null);

  const usingInitial = period === initialPeriod;
  const cannotConvert = !usingInitial && currency === "TWD" && !convertClose;

  useEffect(() => {
    if (period === initialPeriod) return;
    if (currency === "TWD" && !convertClose) return;
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
        setRemote({ period, status: next.length > 1 ? "ok" : "fail", points: next });
      })
      .catch(() => {
        if (!disposed) setRemote({ period, status: "fail", points: [] });
      });
    return () => { disposed = true; };
  }, [convertClose, currency, endpoint, initialPeriod, period]);

  const points = useMemo(
    () => usingInitial ? initialPoints : (remote?.period === period && remote.status === "ok" ? remote.points : []),
    [initialPoints, period, remote, usingInitial],
  );
  const loading = !usingInitial && !cannotConvert && remote?.period !== period;
  const failed = usingInitial
    ? initialPoints.length < 2
    : cannotConvert || (remote?.period === period && (remote.status === "fail" || remote.points.length < 2));

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
          {(["1M", "3M"] as const).map((item) => (
            <button key={item} type="button" className={period === item ? "selected" : ""} aria-pressed={period === item} onClick={() => setPeriod(item)}>
              {item === "1M" ? t(locale, "近 30 日", "30 days", "30日") : t(locale, "近 90 日", "90 days", "90日")}
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
            : failed
              ? t(locale, "目前沒有可驗證的歷史行情", "No verified historical data is currently available", "現在、検証済み履歴データはありません")
              : t(locale, "尚無足夠的歷史點位可繪圖", "Not enough history points to draw a chart", "チャートに必要な履歴点がありません")}
        </div>
      )}
      {note ? <p className="sectionChartNote">{note}</p> : null}
    </section>
  );
}

export default PriceHistoryChart;
