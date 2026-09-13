"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./global.css";

type MarketStatus = "checking" | "open" | "delayed" | "daily-break" | "weekend-closed" | "unavailable";
type Metal = {
  id: string;
  symbol: string;
  name: string;
  englishName: string;
  price: number;
  changePercent: number | null;
};
type Data = {
  metals: Metal[];
  currencies: Record<string, number>;
  quotedAt: string;
  retrievedAt: string;
  marketStatus: MarketStatus;
  source: string;
};

const fallback: Data = {
  metals: [],
  currencies: {},
  quotedAt: "",
  retrievedAt: "",
  marketStatus: "checking",
  source: "",
};
const markets = [
  ["台灣", "Taipei", "TWD／錢、公克", "09:00–17:00"],
  ["香港", "Hong Kong", "HKD／兩、克", "09:00–17:00"],
  ["中國", "Shanghai", "CNY／克", "09:00–15:30"],
  ["日本", "Tokyo", "JPY／克", "09:00–15:30"],
  ["新加坡", "Singapore", "SGD／盎司", "09:00–17:00"],
  ["倫敦", "London", "USD／盎司", "08:00–17:00"],
  ["紐約", "New York", "USD／盎司", "08:20–17:00"],
];

function formatTaipeiTime(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "取得中";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(date);
}

export default function GlobalMarketPage() {
  const [data, setData] = useState(fallback);
  const [checkFailed, setCheckFailed] = useState(false);
  const [lastAttemptAt, setLastAttemptAt] = useState("");
  const [metalId, setMetalId] = useState("gold");
  const [currency, setCurrency] = useState("TWD");
  const [weight, setWeight] = useState("1");
  const [unit, setUnit] = useState("ounce");

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (disposed || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/global-quotes?v=2", { signal: controller.signal });
        if (!response.ok) throw new Error("Quote source unavailable");
        const next = await response.json() as Partial<Data> & { updatedAt?: string };
        if (disposed) return;
        setData({
          metals: next.metals ?? [],
          currencies: next.currencies ?? {},
          quotedAt: next.quotedAt ?? next.updatedAt ?? "",
          retrievedAt: next.retrievedAt ?? "",
          marketStatus: next.marketStatus ?? "delayed",
          source: next.source ?? "",
        });
        setLastAttemptAt(next.retrievedAt ?? new Date().toISOString());
        setCheckFailed(false);
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setLastAttemptAt(new Date().toISOString());
          setCheckFailed(true);
        }
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 180_000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const metal = data.metals.find((item) => item.id === metalId) ?? data.metals[0];
  const effectiveCurrency = currency in data.currencies ? currency : Object.keys(data.currencies)[0] ?? currency;
  const result = useMemo(() => {
    const ounces = (Number(weight) || 0) * ({ ounce: 1, gram: 1 / 31.1034768, qian: 3.75 / 31.1034768, tael: 37.5 / 31.1034768 }[unit] ?? 1);
    return ounces * (metal?.price ?? Number.NaN) * (data.currencies[effectiveCurrency] ?? Number.NaN);
  }, [weight, unit, metal, effectiveCurrency, data.currencies]);
  const statusLabel = checkFailed
    ? data.metals.length
      ? "本次檢查失敗 · 顯示最後有效行情"
      : "行情暫不可用 · 每 3 分鐘重試"
    : data.marketStatus === "checking"
      ? "正在檢查行情來源"
      : data.marketStatus === "open"
      ? "市場交易中"
      : data.marketStatus === "daily-break"
        ? "每日休市 · 最後有效行情"
        : data.marketStatus === "weekend-closed"
          ? "週末休市 · 最後有效行情"
          : data.marketStatus === "delayed"
            ? "行情可能延遲 · 自動重試"
            : "行情狀態無法確認 · 自動重試";
  const lastSuccessLabel = checkFailed && data.retrievedAt ? formatTaipeiTime(data.retrievedAt) : "";

  return <main className="globalPage">
    <header className="globalNav">
      <Link href="/"><b>99</b><span>玖久黃金報價網<small>99GOLD.NET</small></span></Link>
      <nav><Link href="/">首頁</Link><Link className="active" href="/global">全球報價</Link><Link href="/insights">市場情報</Link></nav>
    </header>
    <section className="globalHero">
      <p>GLOBAL PRECIOUS METALS</p>
      <h1>全球貴金屬報價中心</h1>
      <span>{data.source || "正在連接可驗證的國際行情來源"}；屬參考資訊，並非店家可成交牌告</span>
    </section>
    <section className="metalBoard">
      <div className="boardHead">
        <div><p>LIVE PRICES</p><h2>國際市場參考行情</h2></div>
        <div className={`globalFreshness ${checkFailed ? "delayed" : data.marketStatus}`}>
          <strong><i />{statusLabel}</strong>
          <time dateTime={data.quotedAt || undefined}>行情時間 {formatTaipeiTime(data.quotedAt)}</time>
          <small>本站檢查 {formatTaipeiTime(lastAttemptAt || data.retrievedAt)}{lastSuccessLabel ? ` · 上次成功 ${lastSuccessLabel}` : ""} · 每 3 分鐘</small>
        </div>
      </div>
      <div className="metalGrid">{data.metals.map((item) => {
        const hasChange = item.changePercent !== null && Number.isFinite(item.changePercent);
        const direction = hasChange ? Math.sign(item.changePercent!) : 0;
        return <button key={item.id} className={metalId === item.id ? "selected" : ""} onClick={() => setMetalId(item.id)}>
          <span>{item.englishName}</span><h3>{item.name}</h3>
          <strong>US$ {item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
          <em className={direction > 0 ? "rise" : direction < 0 ? "fall" : undefined}>{hasChange ? `${direction > 0 ? "+" : ""}${item.changePercent!.toFixed(2)}%` : "有效參考價"}</em>
          <small>每金衡盎司</small>
        </button>;
      })}</div>
    </section>
    <section className="converter">
      <div><p>CURRENCY CONVERTER</p><h2>貴金屬幣別換算</h2><span>依有效國際參考報價與匯率估算</span></div>
      <form>
        <label>金屬<select value={metalId} onChange={(event) => setMetalId(event.target.value)}>{data.metals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>重量<div className="pair"><input type="number" min="0" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)}/><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="ounce">盎司</option><option value="gram">公克</option><option value="qian">錢</option><option value="tael">台兩</option></select></div></label>
        <label>幣別<select value={effectiveCurrency} onChange={(event) => setCurrency(event.target.value)}>{Object.keys(data.currencies).map((code) => <option key={code}>{code}</option>)}</select></label>
      </form>
      <div className="convertResult"><span>換算結果</span><strong>{effectiveCurrency} {Number.isFinite(result) ? result.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</strong><small>{weight || 0} {unit}・{metal?.name ?? "資料不可用"}</small></div>
    </section>
    <section className="worldMarkets">
      <div className="boardHead"><div><p>WORLD MARKETS</p><h2>主要黃金市場</h2></div><span>當地交易單位與市場時間</span></div>
      <div>{markets.map(([name, city, unitLabel, hours]) => <article key={name}><span>{city}</span><h3>{name}</h3><p>{unitLabel}</p><strong>{hours}</strong><small>當地市場時間</small></article>)}</div>
    </section>
    <footer><span>玖久黃金報價網 · 99GOLD.NET</span><p>真金價值，長久相伴。</p></footer>
  </main>;
}
