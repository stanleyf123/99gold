"use client";

import { useEffect, useMemo, useState } from "react";
import { type Locale, t, useSiteLocale } from "../locale";
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

const japaneseMetalNames: Record<string, string> = {
  gold: "金先物",
  silver: "銀先物",
  platinum: "プラチナ先物",
  palladium: "パラジウム先物",
};

const markets = [
  { zh: "台灣", en: "Taiwan", ja: "台湾", city: "Taipei", unit: { zh: "TWD／錢、公克", en: "TWD / qian, gram", ja: "TWD／銭・グラム" }, hours: "09:00–17:00" },
  { zh: "香港", en: "Hong Kong", ja: "香港", city: "Hong Kong", unit: { zh: "HKD／兩、克", en: "HKD / tael, gram", ja: "HKD／両・グラム" }, hours: "09:00–17:00" },
  { zh: "中國", en: "China", ja: "中国", city: "Shanghai", unit: { zh: "CNY／克", en: "CNY / gram", ja: "CNY／グラム" }, hours: "09:00–15:30" },
  { zh: "日本", en: "Japan", ja: "日本", city: "Tokyo", unit: { zh: "JPY／克", en: "JPY / gram", ja: "JPY／グラム" }, hours: "09:00–15:30" },
  { zh: "新加坡", en: "Singapore", ja: "シンガポール", city: "Singapore", unit: { zh: "SGD／盎司", en: "SGD / ounce", ja: "SGD／オンス" }, hours: "09:00–17:00" },
  { zh: "倫敦", en: "London", ja: "ロンドン", city: "London", unit: { zh: "USD／盎司", en: "USD / ounce", ja: "USD／オンス" }, hours: "08:00–17:00" },
  { zh: "紐約", en: "New York", ja: "ニューヨーク", city: "New York", unit: { zh: "USD／盎司", en: "USD / ounce", ja: "USD／オンス" }, hours: "08:20–17:00" },
] as const;

function metalLabel(item: Metal, locale: Locale) {
  if (locale === "en") return item.englishName;
  if (locale === "ja") return japaneseMetalNames[item.id] ?? item.englishName;
  return item.name;
}

function formatTaipeiTime(value: string, locale: Locale) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return t(locale, "取得中", "Checking", "確認中");
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-GB", {
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
  const { locale } = useSiteLocale();
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
      ? t(locale, "本次檢查失敗 · 顯示最後有效行情", "Latest check failed · showing last valid quote", "今回の確認失敗・最終有効値を表示")
      : t(locale, "行情暫不可用 · 每 3 分鐘重試", "QUOTE UNAVAILABLE · RETRYING EVERY 3 MIN", "相場取得不可・3分ごとに再試行")
    : data.marketStatus === "checking"
      ? t(locale, "正在檢查行情來源", "CHECKING MARKET SOURCE", "相場情報源を確認中")
      : data.marketStatus === "open"
      ? t(locale, "市場交易中", "MARKET OPEN", "市場取引中")
      : data.marketStatus === "daily-break"
        ? t(locale, "每日休市 · 最後有效行情", "DAILY BREAK · LAST VALID QUOTE", "日次休場・最終有効値")
        : data.marketStatus === "weekend-closed"
          ? t(locale, "週末休市 · 最後有效行情", "WEEKEND CLOSED · LAST VALID QUOTE", "週末休場・最終有効値")
          : data.marketStatus === "delayed"
            ? t(locale, "行情可能延遲 · 自動重試", "QUOTE MAY BE DELAYED · RETRYING", "相場遅延の可能性・再試行中")
            : t(locale, "行情狀態無法確認 · 自動重試", "MARKET STATUS UNAVAILABLE · RETRYING", "相場状態を確認できません・再試行中");
  const lastSuccessLabel = checkFailed && data.retrievedAt ? formatTaipeiTime(data.retrievedAt, locale) : "";
  const quoteTime = formatTaipeiTime(data.quotedAt, locale);
  const checkTime = formatTaipeiTime(lastAttemptAt || data.retrievedAt, locale);

  return <main className="globalPage" lang={locale === "zh" ? "zh-Hant" : locale}>
    <section className="globalHero">
      <p>GLOBAL PRECIOUS METALS</p>
      <h1>{t(locale, "全球貴金屬報價中心", "Global Precious Metals Desk", "世界貴金属相場センター")}</h1>
      <span>{data.source || t(locale, "正在連接可驗證的國際行情來源", "Connecting to a verifiable international quote source", "検証可能な国際相場ソースに接続中")}{t(locale, "；屬參考資訊，並非店家可成交牌告", "; reference only, not an executable dealer quote", "。参考情報であり、店頭の約定価格ではありません")}</span>
    </section>
    <section className="metalBoard">
      <div className="boardHead">
        <div><p>LIVE PRICES</p><h2>{t(locale, "國際市場參考行情", "International market references", "国際市場の参考相場")}</h2></div>
        <div className={`globalFreshness ${checkFailed ? "delayed" : data.marketStatus}`}>
          <strong><i />{statusLabel}</strong>
          <time dateTime={data.quotedAt || undefined}>{t(locale, "行情時間", "Quote time", "相場時刻")} {quoteTime}</time>
          <small>{t(locale, "本站檢查", "Site check", "サイト確認")} {checkTime}{lastSuccessLabel ? ` · ${t(locale, "上次成功", "Last success", "最終成功")} ${lastSuccessLabel}` : ""} · {t(locale, "每 3 分鐘", "every 3 min", "3分ごと")}</small>
        </div>
      </div>
      {data.metals.length === 0 ? (
        <p className="quoteEmptyPanel">{t(locale, "目前沒有可驗證的即時報價，系統每 3 分鐘重試。", "No verified live quotes right now. The site retries every 3 minutes.", "検証可能な即時相場はありません。3分ごとに再試行します。")}</p>
      ) : (
      <div className="metalGrid">{data.metals.map((item) => {
        const hasChange = item.changePercent !== null && Number.isFinite(item.changePercent);
        const direction = hasChange ? Math.sign(item.changePercent!) : 0;
        return <button key={item.id} className={metalId === item.id ? "selected" : ""} onClick={() => setMetalId(item.id)}>
          <span>{item.englishName}</span><h3>{metalLabel(item, locale)}</h3>
          <strong>US$ {item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
          <em className={direction > 0 ? "rise" : direction < 0 ? "fall" : undefined}>{hasChange ? `${direction > 0 ? "+" : ""}${item.changePercent!.toFixed(2)}%` : t(locale, "有效參考價", "Valid reference", "有効な参考値")}</em>
          <small>{t(locale, "每金衡盎司", "Per troy ounce", "1トロイオンス")}</small>
        </button>;
      })}</div>
      )}
    </section>
    <section className="converter">
      <div><p>CURRENCY CONVERTER</p><h2>{t(locale, "貴金屬幣別換算", "Metal currency converter", "貴金属の通貨換算")}</h2><span>{t(locale, "依有效國際參考報價與匯率估算", "Estimated from a valid international reference and FX", "有効な国際参考相場と為替で試算")}</span></div>
      <form>
        <label>{t(locale, "金屬", "Metal", "金属")}<select value={metalId} onChange={(event) => setMetalId(event.target.value)}>{data.metals.map((item) => <option key={item.id} value={item.id}>{metalLabel(item, locale)}</option>)}</select></label>
        <label>{t(locale, "重量", "Weight", "重量")}<div className="pair"><input type="number" min="0" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)}/><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="ounce">{t(locale, "盎司", "Ounce", "オンス")}</option><option value="gram">{t(locale, "公克", "Gram", "グラム")}</option><option value="qian">{t(locale, "錢", "Qian", "銭")}</option><option value="tael">{t(locale, "台兩", "Tael", "台両")}</option></select></div></label>
        <label>{t(locale, "幣別", "Currency", "通貨")}<select value={effectiveCurrency} onChange={(event) => setCurrency(event.target.value)}>{Object.keys(data.currencies).map((code) => <option key={code}>{code}</option>)}</select></label>
      </form>
      <div className="convertResult"><span>{t(locale, "換算結果", "Converted value", "換算結果")}</span><strong>{effectiveCurrency} {Number.isFinite(result) ? result.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</strong><small>{weight || 0} {unit}・{metal ? metalLabel(metal, locale) : t(locale, "資料不可用", "Data unavailable", "データなし")}</small></div>
    </section>
    <section className="worldMarkets">
      <div className="boardHead"><div><p>WORLD MARKETS</p><h2>{t(locale, "主要黃金市場", "Major gold markets", "主な金市場")}</h2></div><span>{t(locale, "當地交易單位與市場時間", "Local trading units and market hours", "現地の取引単位と市場時間")}</span></div>
      <div>{markets.map((market) => <article key={market.city}><span>{market.city}</span><h3>{market[locale]}</h3><p>{market.unit[locale]}</p><strong>{market.hours}</strong><small>{t(locale, "當地市場時間", "Local market hours", "現地市場時間")}</small></article>)}</div>
    </section>
    <footer><span>玖久黃金報價網 · 99GOLD.NET</span><p>{t(locale, "真金價值，長久相伴。", "True gold value, lasting companionship.", "真金の価値を、長く寄り添う。")}</p></footer>
  </main>;
}
