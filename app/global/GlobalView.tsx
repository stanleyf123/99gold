"use client";

import { useEffect, useMemo, useState } from "react";
import SiteLinks from "../SiteLinks";
import PriceAlerts from "../PriceAlerts";
import { type Locale, t, useSiteLocale } from "../locale";
import { parseQuotedNumber } from "../../lib/section-quotes";
import {
  buildWorldMarketQuotes,
  converterOunces,
  formatWorldPrice,
  type WorldMarketBasis,
  type WorldMarketQuote,
} from "../../lib/world-markets";
import "./global.css";

type MarketStatus = "checking" | "open" | "delayed" | "daily-break" | "weekend-closed" | "unavailable";
type Metal = {
  id: string;
  symbol: string;
  name: string;
  englishName: string;
  price: number;
  changePercent: number | null;
  change?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
};
type QuoteItem = { id: string; price: string };
type Data = {
  metals: Metal[];
  currencies: Record<string, number>;
  items: QuoteItem[];
  quotedAt: string;
  retrievedAt: string;
  marketStatus: MarketStatus;
  source: string;
};

const fallback: Data = {
  metals: [],
  currencies: {},
  items: [],
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

function snapshotFromQuotes(next: Partial<Data> & { updatedAt?: string } | null | undefined): Data | null {
  if (!next?.metals?.length) return null;
  return {
    metals: next.metals ?? [],
    currencies: next.currencies ?? {},
    items: next.items ?? [],
    quotedAt: next.quotedAt ?? next.updatedAt ?? "",
    retrievedAt: next.retrievedAt ?? "",
    marketStatus: next.marketStatus ?? "delayed",
    source: next.source ?? "",
  };
}

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

function fallbackNote(basis: WorldMarketBasis, locale: Locale, marketId: WorldMarketQuote["id"]) {
  if (basis === "usd-fallback" && marketId === "singapore") {
    return t(locale, "SGD 匯率暫缺，改列 USD／盎司", "SGD FX unavailable · showing USD / oz", "SGD為替なし・USD／オンスを表示");
  }
  if (basis === "eur-fallback") {
    return t(locale, "GBP 匯率暫缺，改列 EUR／盎司", "GBP FX unavailable · showing EUR / oz", "GBP為替なし・EUR／オンスを表示");
  }
  if (basis === "usd-fallback" && marketId === "london") {
    return t(locale, "GBP／EUR 匯率暫缺，改列 USD／盎司", "GBP/EUR FX unavailable · showing USD / oz", "GBP／EUR為替なし・USD／オンスを表示");
  }
  return "";
}

function changeClass(changePercent: number | null) {
  if (changePercent === null) return undefined;
  if (changePercent > 0) return "rise";
  if (changePercent < 0) return "fall";
  return undefined;
}

function changeText(changePercent: number | null, locale: Locale) {
  if (changePercent === null) return t(locale, "有效參考價", "Valid reference", "有効な参考値");
  const direction = changePercent > 0 ? "+" : "";
  return `${direction}${changePercent.toFixed(2)}%`;
}

export default function GlobalMarketPage({ initialQuotes = null }: { initialQuotes?: Partial<Data> | null }) {
  const { locale } = useSiteLocale();
  const [data, setData] = useState<Data>(() => snapshotFromQuotes(initialQuotes) ?? fallback);
  const [checkFailed, setCheckFailed] = useState(false);
  const [lastAttemptAt, setLastAttemptAt] = useState(initialQuotes?.retrievedAt ?? "");
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
        const snapshot = snapshotFromQuotes(next);
        if (!snapshot) throw new Error("Quote source unavailable");
        setData(snapshot);
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
    if (!(initialQuotes?.metals && initialQuotes.metals.length > 0)) void refresh();
    const timer = window.setInterval(() => void refresh(), 180_000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initialQuotes]);

  const metal = data.metals.find((item) => item.id === metalId) ?? data.metals[0];
  const gold = data.metals.find((item) => item.id === "gold");
  const effectiveCurrency = currency in data.currencies ? currency : Object.keys(data.currencies)[0] ?? currency;
  const worldQuotes = useMemo(() => {
    const quoted = (id: string) => parseQuotedNumber(data.items.find((item) => item.id === id)?.price ?? "");
    return buildWorldMarketQuotes({
      goldUsdPerOz: gold && Number.isFinite(gold.price) ? gold.price : null,
      goldChangePercent: gold?.changePercent ?? null,
      currencies: data.currencies,
      taiwanQian: quoted("taiwan-qian"),
      taiwanGram: quoted("taiwan-gram"),
    });
  }, [gold, data.currencies, data.items]);
  const result = useMemo(() => {
    return converterOunces(Number(weight) || 0, unit) * (metal?.price ?? Number.NaN) * (data.currencies[effectiveCurrency] ?? Number.NaN);
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
      <>
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
      <div className="metalCompareWrap">
        <div className="boardHead">
          <div><p>COMPARISON</p><h2>{t(locale, "金銀鉑鈀對照", "Gold / silver / platinum / palladium", "金・銀・プラチナ・パラジウム")}</h2></div>
          <span>{t(locale, "同一來源的美元／盎司參考", "USD / oz from the same feed", "同一情報源の米ドル／オンス")}</span>
        </div>
        <div className="proQuoteTableScroll">
          <table className="metalCompare">
            <thead>
              <tr>
                <th>{t(locale, "金屬", "Metal", "金属")}</th>
                <th>{t(locale, "最新價", "Last", "最新値")}</th>
                <th>{t(locale, "漲跌", "Change", "騰落")}</th>
                <th>{t(locale, "單位", "Unit", "単位")}</th>
                <th>{t(locale, "最高", "High", "高値")}</th>
                <th>{t(locale, "最低", "Low", "安値")}</th>
              </tr>
            </thead>
            <tbody>
              {data.metals.map((item) => {
                const hasChange = item.changePercent !== null && Number.isFinite(item.changePercent);
                const direction = hasChange ? Math.sign(item.changePercent!) : 0;
                return (
                  <tr key={item.id}>
                    <td><strong>{item.symbol}</strong><span>{metalLabel(item, locale)}</span></td>
                    <td>US$ {item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                    <td><b className={direction > 0 ? "rise" : direction < 0 ? "fall" : undefined}>{hasChange ? `${direction > 0 ? "+" : ""}${item.changePercent!.toFixed(2)}%` : "—"}</b></td>
                    <td>{t(locale, "美元／盎司", "USD / oz", "米ドル／オンス")}</td>
                    <td>{item.high != null && Number.isFinite(item.high) ? item.high.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</td>
                    <td>{item.low != null && Number.isFinite(item.low) ? item.low.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
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
      <div className="boardHead">
        <div><p>WORLD MARKETS</p><h2>{t(locale, "主要黃金市場", "Major gold markets", "主な金市場")}</h2></div>
        <span>{t(locale, "當地交易單位與市場時間", "Local trading units and market hours", "現地の取引単位と市場時間")}</span>
      </div>
      <p className="worldMarketNote">{t(locale, "依國際參考價與匯率換算，非當地交易所結算價／非店家牌價。港兩採 37.429 公克；台灣錢採 3.75 公克（GC × 臺銀美元即期賣出）。", "Theoretical local references from the international gold price and FX, not a local exchange settlement or shop quote. Hong Kong tael = 37.429 g; Taiwan qian = 3.75 g (GC × Bank of Taiwan USD spot sell).", "国際参考価格と為替による理論換算であり、現地取引所の決済価格／店頭掲示価格ではありません。香港の両は37.429g、台湾の銭は3.75g（GC×台湾銀行米ドル直物売り）。")}</p>
      <div className="marketGrid">{worldQuotes.map((market) => {
        const note = fallbackNote(market.basis, locale, market.id);
        return <article key={market.city}>
          <span>{market.city}</span>
          <h3>{market.name[locale]}</h3>
          <strong className="marketPrice">{formatWorldPrice(market.primary.value, market.primary.decimals)}</strong>
          <p className="marketUnit">{market.primary.unit[locale]}</p>
          {market.secondary ? <p className="marketSecondary">{`${formatWorldPrice(market.secondary.value, market.secondary.decimals)} ${market.secondary.unit[locale]}`}</p> : null}
          <em className={changeClass(market.changePercent)}>{changeText(market.changePercent, locale)}</em>
          {note ? <p className="marketFallback">{note}</p> : null}
          <small>{t(locale, "當地市場時間", "Local market hours", "現地市場時間")}<br />{market.hours}</small>
        </article>;
      })}</div>
    </section>
    <PriceAlerts
      locale={locale}
      compact
      markets={[
        { id: "spot", label: t(locale, "COMEX 黃金參考", "COMEX gold reference", "COMEX金参考"), value: gold && Number.isFinite(gold.price) ? gold.price : Number.NaN, unit: "USD／oz" },
        { id: "qian", label: t(locale, "台灣理論金價", "Taiwan theoretical qian", "台湾理論銭"), value: parseQuotedNumber(data.items.find((item) => item.id === "taiwan-qian")?.price ?? "") ?? Number.NaN, unit: "TWD／錢" },
        { id: "gram", label: t(locale, "黃金每公克", "Gold per gram", "グラムあたりの金"), value: parseQuotedNumber(data.items.find((item) => item.id === "taiwan-gram")?.price ?? "") ?? Number.NaN, unit: "TWD／公克" },
      ]}
    />
    <SiteLinks current="global" />
    <footer><span>玖久黃金報價網 · 99GOLD.NET</span><p>{t(locale, "真金價值，長久相伴。", "True gold value, lasting companionship.", "真金の価値を、長く寄り添う。")}</p></footer>
  </main>;
}
