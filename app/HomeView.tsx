"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MarketLineChart, type MarketChartPoint } from "./MarketLineChart";
import CoverImage from "./CoverImage";
import SiteLinks from "./SiteLinks";
import { asNewsCategory, categories, type NewsCategory } from "./news/categories";
import { useSiteLocale } from "./locale";
import { jewelrySellFromBuy, parseQuotedNumber } from "../lib/section-quotes";
import { bankOfTaiwanUsdSightSell, formatUsdTwdSightSell } from "../lib/fx-display";
import { localizedHref } from "../lib/locale-path";
import GoldFxStrip from "./GoldFxStrip";
import GoldSilverRatioPanel from "./GoldSilverRatio";
import PriceHistoryChart from "./PriceHistoryChart";
import { newsExcerpt } from "../lib/news-excerpt";

type NewsItem = { id?: number | string; title: string; category?: NewsCategory; originalTitle?: string; summary?: string | null; date: string; url: string; image?: string; sourceName?: string; translated?: boolean; translationLabel?: string | null; translationProvider?: string | null; translationPending?: boolean; translationPendingLabel?: string | null; external?: boolean };
type QuoteItem = { id?: string; label: string; code: string; price: string; unit: string; change: string; up: boolean | null };
type HistoryPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";
type MarketStatus = "checking" | "open" | "delayed" | "daily-break" | "weekend-closed" | "unavailable";
type GlobalMetal = {
  id: string;
  symbol: string;
  name: string;
  englishName: string;
  price: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  currency: string;
  venue: string;
  series: MarketChartPoint[];
  basis: "futures" | "spot";
  source: string;
  quotedAt?: string;
};
type HistoryStats = { open: number; close: number; high: number; low: number; change: number; changePercent: number };
type SiteSettings = { brandName: string; fullName: string; englishName: string; tagline: string; announcement: string };

const defaultSiteSettings: SiteSettings = {
  brandName: "玖久黃金報價網",
  fullName: "玖久黃金報價網",
  englishName: "99GOLD.NET",
  tagline: "真金價值，長久相伴。",
  announcement: "",
};

const languageCopy = {
  zh: { hero: "真金價值，長久相伴。", dashboard: "今日黃金資訊", dashboardText: "報價、走勢、實用工具與市場新聞集中在這裡，點選分頁即可切換。", quotes: "專業報價", history: "歷史金價", tools: "黃金工具", news: "市場新聞", updated: "最後更新", open: "來源時間與延遲請見報價", read: "閱讀完整文章", footer: "資料供投資與消費參考，不構成任何交易建議。" },
  en: { hero: "True gold value, lasting companionship.", dashboard: "Today’s Gold Dashboard", dashboardText: "Quotes, price trends, practical tools, and market news in one place.", quotes: "Professional Quotes", history: "Price History", tools: "Gold Tools", news: "Market News", updated: "Updated", open: "See source timestamps", read: "Read article", footer: "Information is for reference only and is not investment or trading advice." },
  ja: { hero: "真金の価値を、長く寄り添う。", dashboard: "本日の金情報", dashboardText: "相場、価格推移、便利なツール、市場ニュースを一か所で確認できます。", quotes: "プロ相場", history: "価格履歴", tools: "金ツール", news: "市場ニュース", updated: "最終更新", open: "データ取得時刻をご確認ください", read: "記事を読む", footer: "本情報は参考用であり、投資・取引の助言ではありません。" },
} as const;

const fallbackNews: NewsItem[] = [];

const newsCategories = Object.keys(categories) as (NewsCategory | "all")[];
const emptyHistoryStats: HistoryStats = {
  open: Number.NaN,
  close: Number.NaN,
  high: Number.NaN,
  low: Number.NaN,
  change: Number.NaN,
  changePercent: Number.NaN,
};
const unavailableGold: GlobalMetal = {
  id: "gold",
  symbol: "GC=F",
  name: "黃金期貨",
  englishName: "Gold Futures",
  price: Number.NaN,
  previousClose: Number.NaN,
  open: Number.NaN,
  high: Number.NaN,
  low: Number.NaN,
  change: Number.NaN,
  changePercent: Number.NaN,
  currency: "USD",
  venue: "—",
  series: [],
  basis: "futures",
  source: "—",
  quotedAt: "",
};

function normalizeMetal(metal: {
  id: string;
  symbol: string;
  name: string;
  englishName: string;
  price: number;
  previousClose?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  change?: number | null;
  changePercent?: number | null;
  currency: string;
  venue: string;
  series?: MarketChartPoint[];
  basis: "futures" | "spot";
  source: string;
  quotedAt?: string;
}): GlobalMetal {
  const numberOrNaN = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
  return {
    ...metal,
    price: numberOrNaN(metal.price),
    previousClose: numberOrNaN(metal.previousClose),
    open: numberOrNaN(metal.open),
    high: numberOrNaN(metal.high),
    low: numberOrNaN(metal.low),
    change: numberOrNaN(metal.change),
    changePercent: numberOrNaN(metal.changePercent),
    series: Array.isArray(metal.series) ? metal.series : [],
    quotedAt: metal.quotedAt ?? "",
  };
}

type BankOfTaiwanSpot = { bankSellsUsd?: number | null; quotedAt?: string | null };
type HomeQuoteSnapshot = {
  items?: QuoteItem[];
  metals?: Array<Parameters<typeof normalizeMetal>[0]>;
  currencies?: Record<string, number>;
  quotedAt?: string;
  updatedAt?: string;
  retrievedAt?: string;
  fxQuotedAt?: string | null;
  fxBasis?: "bank-sight-sell" | "market-reference" | null;
  bankOfTaiwan?: BankOfTaiwanSpot | null;
  marketStatus?: MarketStatus;
  quoteSource?: string;
  source?: string;
};

function applyQuoteSnapshot(
  data: HomeQuoteSnapshot,
  setters: {
    setQuotes: (items: QuoteItem[]) => void;
    setGlobalMetals: (metals: GlobalMetal[]) => void;
    setCurrencies: (currencies: Record<string, number>) => void;
    setQuoteAt: (value: string) => void;
    setQuoteRetrievedAt: (value: string) => void;
    setQuoteAttemptedAt: (value: string) => void;
    setFxQuotedAt: (value: string) => void;
    setFxBasis: (value: "bank-sight-sell" | "market-reference" | null) => void;
    setBankOfTaiwan: (value: BankOfTaiwanSpot | null) => void;
    setMarketStatus: (status: MarketStatus) => void;
    setQuoteSource: (value: string) => void;
  },
) {
  setters.setQuotes(data.items ?? []);
  setters.setGlobalMetals((data.metals ?? []).map(normalizeMetal));
  setters.setCurrencies(data.currencies ?? { USD: 1 });
  setters.setQuoteAt(data.quotedAt ?? data.updatedAt ?? "");
  setters.setQuoteRetrievedAt(data.retrievedAt ?? "");
  setters.setQuoteAttemptedAt(data.retrievedAt ?? new Date().toISOString());
  setters.setFxQuotedAt(data.fxQuotedAt ?? "");
  setters.setFxBasis(data.fxBasis ?? null);
  setters.setBankOfTaiwan(data.bankOfTaiwan ?? null);
  setters.setMarketStatus(data.marketStatus ?? "delayed");
  if (data.quoteSource || data.source) setters.setQuoteSource(data.quoteSource ?? data.source ?? "");
}

export default function HomeView({
  initialQuotes = null,
  initialRatioPoints = [],
  initialSilverPoints = [],
  initialPlatinumPoints = [],
  initialPalladiumPoints = [],
  initialNews = null,
}: {
  initialQuotes?: HomeQuoteSnapshot | null;
  initialRatioPoints?: MarketChartPoint[];
  initialSilverPoints?: MarketChartPoint[];
  initialPlatinumPoints?: MarketChartPoint[];
  initialPalladiumPoints?: MarketChartPoint[];
  initialNews?: { items?: NewsItem[]; updatedAt?: string; checkedAt?: string; scheduleStatus?: "healthy" | "delayed" | "error" | "pending" } | null;
}) {
  const [activeTab, setActiveTab] = useState<"quotes" | "news" | "history" | "tools">("quotes");
  const [period, setPeriod] = useState<HistoryPeriod>("1M");
  const [manualPrice, setManualPrice] = useState("");
  const [goldWeight, setGoldWeight] = useState("1.00");
  const [toolUnit, setToolUnit] = useState<"qian" | "gram" | "tael" | "ounce">("qian");
  const [purity, setPurity] = useState("0.9999");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [news, setNews] = useState<NewsItem[]>(initialNews?.items ?? fallbackNews);
  const [newsCategory, setNewsCategory] = useState<NewsCategory | "all">("all");
  const [newsUpdated, setNewsUpdated] = useState(initialNews?.updatedAt ?? "正在取得最新消息");
  const [newsCheckedAt, setNewsCheckedAt] = useState(initialNews?.checkedAt ?? "");
  const [newsScheduleStatus, setNewsScheduleStatus] = useState<"healthy" | "delayed" | "error" | "pending">(initialNews?.scheduleStatus ?? "pending");
  const [quotes, setQuotes] = useState<QuoteItem[]>(initialQuotes?.items ?? []);
  const [quoteAt, setQuoteAt] = useState(initialQuotes?.quotedAt ?? initialQuotes?.updatedAt ?? "");
  const [quoteRetrievedAt, setQuoteRetrievedAt] = useState(initialQuotes?.retrievedAt ?? "");
  const [quoteAttemptedAt, setQuoteAttemptedAt] = useState(initialQuotes?.retrievedAt ?? "");
  const [fxQuotedAt, setFxQuotedAt] = useState(initialQuotes?.fxQuotedAt ?? "");
  const [fxBasis, setFxBasis] = useState<"bank-sight-sell" | "market-reference" | null>(initialQuotes?.fxBasis ?? null);
  const [bankOfTaiwan, setBankOfTaiwan] = useState(initialQuotes?.bankOfTaiwan ?? null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(initialQuotes?.marketStatus ?? (initialQuotes?.items?.length ? "delayed" : "checking"));
  const [quoteCheckFailed, setQuoteCheckFailed] = useState(false);
  const [quoteSource, setQuoteSource] = useState(initialQuotes?.quoteSource ?? initialQuotes?.source ?? "Yahoo Finance GC 黃金期貨與公開匯率資料");
  const [globalMetals, setGlobalMetals] = useState<GlobalMetal[]>(() => (initialQuotes?.metals ?? []).map(normalizeMetal));
  const [currencies, setCurrencies] = useState<Record<string, number>>(initialQuotes?.currencies ?? { USD: 1 });
  const [historyPoints, setHistoryPoints] = useState<MarketChartPoint[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats>(emptyHistoryStats);
  const [historyQuotedAt, setHistoryQuotedAt] = useState("");
  const [historyRetrievedAt, setHistoryRetrievedAt] = useState("");
  const [historySource, setHistorySource] = useState("COMEX GC 黃金期貨參考");
  const [historyLoading, setHistoryLoading] = useState(true);
  const { locale } = useSiteLocale();
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const copy = languageCopy[locale];
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "quotes" || hash === "history" || hash === "tools" || hash === "news") {
        if (hash === "history") setHistoryLoading(true);
        setActiveTab(hash);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<Partial<SiteSettings>> : null)
      .then((data) => data && setSiteSettings({ ...defaultSiteSettings, ...data }))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const controller = new AbortController();
    const setters = {
      setQuotes, setGlobalMetals, setCurrencies, setQuoteAt, setQuoteRetrievedAt,
      setQuoteAttemptedAt, setFxQuotedAt, setFxBasis, setBankOfTaiwan, setMarketStatus, setQuoteSource,
    };
    const refreshQuotes = async () => {
      if (disposed || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/global-quotes?v=2", { signal: controller.signal });
        if (!response.ok) throw new Error("Quote source unavailable");
        const data = await response.json() as HomeQuoteSnapshot;
        if (disposed) return;
        applyQuoteSnapshot(data, setters);
        setQuoteCheckFailed(false);
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setQuoteAttemptedAt(new Date().toISOString());
          setQuoteCheckFailed(true);
        }
      } finally {
        inFlight = false;
      }
    };
    if (!(initialQuotes?.items && initialQuotes.items.length > 0)) void refreshQuotes();
    const timer = window.setInterval(() => void refreshQuotes(), 180_000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshQuotes(); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initialQuotes]);
  useEffect(() => {
    if (activeTab !== "history") return;
    let disposed = false;
    fetch(`/api/gold-history?period=${period}`)
      .then((response) => response.ok ? response.json() as Promise<{ points?: MarketChartPoint[]; stats?: HistoryStats; quotedAt?: string; updatedAt?: string; retrievedAt?: string; source?: string }> : Promise.reject(new Error("History unavailable")))
      .then((data) => {
        if (disposed) return;
        setHistoryPoints(data.points ?? []);
        setHistoryStats(data.stats ?? emptyHistoryStats);
        if (data.source) setHistorySource(data.source);
        setHistoryQuotedAt(data.quotedAt ?? data.updatedAt ?? "");
        setHistoryRetrievedAt(data.retrievedAt ?? "");
      })
      .catch(() => {
        if (disposed) return;
        setHistoryPoints([]);
        setHistoryStats(emptyHistoryStats);
        setHistoryQuotedAt("");
        setHistoryRetrievedAt("");
      })
      .finally(() => { if (!disposed) setHistoryLoading(false); });
    return () => { disposed = true; };
  }, [activeTab, period]);
  useEffect(() => {
    let disposed = false;
    const refreshNews = () => fetch(`/api/market-brief?lang=${locale}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ items?: NewsItem[]; updatedAt?: string; checkedAt?: string; scheduleStatus?: "healthy" | "delayed" | "error" | "pending" }> : Promise.reject(new Error("News unavailable")))
      .then((data) => {
        if (disposed) return;
        setNews(data.items ?? []);
        if (data.updatedAt) setNewsUpdated(data.updatedAt);
        setNewsCheckedAt(data.checkedAt ?? "");
        setNewsScheduleStatus(data.scheduleStatus ?? "pending");
      })
      .catch(() => {
        if (!disposed) setNewsUpdated("新聞來源暫時無法連線，將自動重試");
      });

    refreshNews();
    const timer = window.setInterval(refreshNews, 300_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [locale]);
  const selectDashboardTab = (tab: typeof activeTab) => {
    if (tab === "history" && activeTab !== "history") setHistoryLoading(true);
    setActiveTab(tab);
  };
  const goldQuote = quotes.find((quote) => quote.id === "gold-reference") ?? quotes[0];
  const qianQuote = quotes.find((quote) => quote.id === "taiwan-qian");
  const buyQian = qianQuote ? parseQuotedNumber(qianQuote.price) : null;
  const sellQian = buyQian !== null ? jewelrySellFromBuy(buyQian) : null;
  const usdSightSell = bankOfTaiwanUsdSightSell({ fxBasis, bankOfTaiwan, currencies });
  const usdSightSellText = formatUsdTwdSightSell(usdSightSell);
  const quotesUnavailable = quotes.length === 0;
  const toolResult = useMemo(() => {
    const weight = Number.parseFloat(goldWeight) || 0;
    const unitToQian = { qian: 1, gram: 1 / 3.75, tael: 10, ounce: 31.1034768 / 3.75 };
    const grossQian = Math.max(0, weight) * unitToQian[toolUnit];
    const pureQian = grossQian * Number.parseFloat(purity);
    const recycleValue = Math.round(pureQian * (Number.parseFloat(manualPrice) || 0));
    const cost = Math.round(grossQian * (Number.parseFloat(purchasePrice) || 0));
    const gain = recycleValue - cost;
    const roi = cost > 0 ? (gain / cost) * 100 : 0;
    return { grossQian, pureQian, grams: grossQian * 3.75, recycleValue, cost, gain, roi };
  }, [goldWeight, toolUnit, purity, purchasePrice, manualPrice]);
  const filteredNews = news.filter((item) => newsCategory === "all" || (item.category ?? "macro") === newsCategory);
  const globalGold = globalMetals.find((metal) => metal.id === "gold") ?? unavailableGold;
  const globalAvailable = Number.isFinite(globalGold.price);
  const globalChangeAvailable = Number.isFinite(globalGold.changePercent) && Number.isFinite(globalGold.change);
  const intradayPoints = globalGold.series.length > 1 ? globalGold.series : [];
  const intradayRange = globalGold.high - globalGold.low;
  const intradayPosition = globalAvailable && Number.isFinite(intradayRange) && intradayRange > 0
    ? Math.max(0, Math.min(100, ((globalGold.price - globalGold.low) / intradayRange) * 100))
    : Number.NaN;
  const numberFormatter = new Intl.NumberFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceFormatter = { format: (value: number) => Number.isFinite(value) ? numberFormatter.format(value) : "—" };
  const percentFormatter = (value: number) => Number.isFinite(value) ? `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%` : "—";
  const formatHistoryDate = (timestamp: number) => new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-US", period === "1D" || period === "1W" ? { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" } : { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Taipei" }).format(new Date(timestamp * 1000));
  const historyRows = historyPoints.slice(-14).reverse().map((point, index, visible) => {
    const chronologicalIndex = historyPoints.length - 1 - index;
    const previous = historyPoints[chronologicalIndex - 1]?.close ?? point.close;
    return { ...point, changePercent: previous ? ((point.close - previous) / previous) * 100 : 0, rowKey: `${point.timestamp}-${visible.length - index}` };
  });
  const historyAvailable = historyPoints.length > 1 && Number.isFinite(historyStats.close);
  const t = (zh: string, en: string, ja = en) => locale === "zh" ? zh : locale === "ja" ? ja : en;
  const formatTaipeiTime = (value: string, withSeconds: boolean) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return t("取得中", "Checking", "確認中");
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : locale === "ja" ? "ja-JP" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" as const } : {}),
      hour12: false,
      timeZone: "Asia/Taipei",
    }).format(date);
  };
  const formatSiteTime = (value: string) => formatTaipeiTime(value, true);
  const formatRadarFxTime = (value: string) => formatTaipeiTime(value, false);
  const marketStatusLabel = quoteCheckFailed
    ? quotes.length
      ? t("本次檢查失敗 · 保留最後有效行情", "Latest check failed · showing last valid quote", "今回の確認失敗・最終有効値を表示")
      : t("行情暫不可用 · 每 3 分鐘重試", "QUOTE UNAVAILABLE · RETRYING EVERY 3 MIN", "相場取得不可・3分ごとに再試行")
    : marketStatus === "checking"
      ? t("正在檢查行情來源", "CHECKING MARKET SOURCE", "相場情報源を確認中")
      : marketStatus === "open"
      ? t("市場交易中", "MARKET OPEN", "市場取引中")
      : marketStatus === "daily-break"
        ? t("每日休市 · 最後有效行情", "DAILY BREAK · LAST VALID QUOTE", "日次休場・最終有効値")
        : marketStatus === "weekend-closed"
          ? t("週末休市 · 最後有效行情", "WEEKEND CLOSED · LAST VALID QUOTE", "週末休場・最終有効値")
          : marketStatus === "delayed"
            ? t("行情可能延遲 · 自動重試", "QUOTE MAY BE DELAYED · RETRYING", "相場遅延の可能性・再試行中")
            : t("行情狀態無法確認 · 自動重試", "MARKET STATUS UNAVAILABLE · RETRYING", "相場状態を確認できません・再試行中");
  const quoteStatusClass = quoteCheckFailed ? "delayed" : marketStatus;
  const quoteTimeLabel = formatSiteTime(quoteAt);
  const quoteCheckTimeLabel = formatSiteTime(quoteAttemptedAt || quoteRetrievedAt);
  const quoteLastSuccessLabel = quoteCheckFailed && quoteRetrievedAt ? formatSiteTime(quoteRetrievedAt) : "";
  const historyQuoteTimeLabel = formatSiteTime(historyQuotedAt);
  const historyCheckTimeLabel = formatSiteTime(historyRetrievedAt);
  const newsScheduleLabel = newsCheckedAt
    ? `${newsScheduleStatus === "healthy" ? t("官方來源已檢查", "OFFICIAL SOURCES CHECKED", "公式情報源確認済み") : newsScheduleStatus === "error" ? t("來源檢查失敗，保留既有內容", "SOURCE CHECK FAILED; CONTENT RETAINED", "情報源確認失敗・既存内容を保持") : t("來源檢查可能延遲", "SOURCE CHECK MAY BE DELAYED", "情報源確認が遅延中")} ${formatSiteTime(newsCheckedAt)}`
    : t("新聞排程等待首次執行", "NEWS SCHEDULE AWAITING FIRST RUN", "ニュース予定の初回実行待ち");

  return (
    <main lang={locale === "zh" ? "zh-Hant" : locale}>
      <div className="topline"><span>{marketStatusLabel}</span><span>{t("行情時間", "Quote time", "相場時刻")} {quoteTimeLabel} · {t("本站檢查", "Site check", "サイト確認")} {quoteCheckTimeLabel}{quoteLastSuccessLabel ? ` · ${t("上次成功", "Last success", "最終成功")} ${quoteLastSuccessLabel}` : ""} (GMT+8)</span></div>

      <section className="brandHero" aria-label={`${siteSettings.fullName}｜${siteSettings.tagline}`}>
        <div className="heroPhoto" aria-hidden="true">
          <Image className="brandHeroPhoto" src="/og.jpg" alt="玖久黃金報價網：即時黃金報價與台灣理論金價" fill priority unoptimized sizes="(max-width: 900px) 100vw, 860px" />
        </div>
        <div className="brandHeroShade" aria-hidden="true" />
        <div className="brandHeroCopy">
          <h1>{siteSettings.fullName}</h1>
          <div className="brandHeroText">
            <p className="eyebrow">{siteSettings.englishName}</p>
            <p>{copy.hero}</p>
          </div>
        </div>
      </section>

      <section className={`marketRadar${quotesUnavailable ? " radarEmpty" : ""}`}>
        <div>
          <p className="eyebrow">MARKET RADAR</p>
          <h2>{t("今日市場快速判讀", "Today’s market snapshot", "本日の市場早わかり")}</h2>
        </div>
        {quotesUnavailable ? (
          <p className="radarEmptyNote">{t("目前沒有可驗證的即時報價，系統每 3 分鐘重試。", "No verified live quotes right now. The site retries every 3 minutes.", "検証可能な即時相場はありません。3分ごとに再試行します。")}</p>
        ) : (
          <>
            <div className="tool"><span>{goldQuote?.label ?? "國際黃金參考"}</span><strong>US$ {goldQuote?.price ?? "—"}</strong><small>{goldQuote?.unit ?? "美元／金衡盎司"}</small></div>
            <div className="tool"><span>{t("理論買進", "Theoretical buy", "理論買")}</span><strong>NT$ {qianQuote?.price ?? "—"}</strong><small>{qianQuote?.unit ?? "台幣／錢"}</small></div>
            <div className="tool"><span>{t("估計賣出", "Estimated sell", "売値推定")}</span><strong>NT$ {sellQian !== null ? sellQian.toLocaleString("en-US") : "—"}</strong><small>{t("理論買進＋4% 參考溢價", "Theoretical buy + 4% reference premium", "理論買＋4%参考プレミアム")}</small></div>
            <div className="tool">
              <span>{t("臺銀美金即期賣出", "BOT USD spot sell", "台湾銀行米ドル直物売り")}</span>
              <strong>NT$ {usdSightSellText}</strong>
              <small>
                {t("新台幣／美元", "TWD / USD", "台湾ドル／米ドル")}
                {usdSightSell !== null && fxQuotedAt ? ` · ${formatRadarFxTime(fxQuotedAt)}` : ""}
              </small>
            </div>
          </>
        )}
        <button type="button" onClick={() => { selectDashboardTab("history"); window.setTimeout(() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" }), 40); }}>{t("查看歷史走勢", "View history", "履歴を見る")} <b>→</b></button>
      </section>

      <GoldFxStrip
        goldUsdPerOz={globalAvailable ? globalGold.price : null}
        taiwanQian={buyQian}
        currencies={currencies}
      />

      {news.length > 0 ? (
        <section className="homeNewsStrip" aria-labelledby="home-news-strip">
          <div>
            <p className="eyebrow">MARKET BRIEFS</p>
            <h2 id="home-news-strip">{t("最新市場快訊", "Latest market briefs", "最新の市場速報")}</h2>
          </div>
          <ul>
            {news.slice(0, 4).map((item) => {
              const href = localizedHref(`/news/${item.id}`, locale);
              return (
                <li key={String(item.id ?? item.url)}>
                  <time dateTime={item.date}>{item.date}</time>
                  <Link href={href} lang={item.translationPending ? "en" : undefined}>{item.title}</Link>
                  {item.translationPending ? <em className="translationPending">{item.translationPendingLabel || t("原文／翻譯待補", "Original / translation pending", "原文／翻訳待ち")}</em> : null}
                </li>
              );
            })}
          </ul>
          <Link href={localizedHref("/news", locale)}>{t("全部市場新聞", "All market news", "市場ニュース一覧")} →</Link>
        </section>
      ) : null}

      <section className="marketHub" id="top"><div className="hubLead"><div><p className="eyebrow">GOLD MARKET DASHBOARD</p><h2>{copy.dashboard}</h2><p>{copy.dashboardText}</p></div>{goldQuote ? <div className="hubPrice"><span>{`${goldQuote.label}・${goldQuote.code}`}</span><strong>{goldQuote.price}</strong><em className={goldQuote.up === null ? "neutral" : goldQuote.up ? "up" : "down"}>{`${goldQuote.up === null ? "•" : goldQuote.up ? "▲" : "▼"} ${goldQuote.change}`}</em></div> : <p className="hubEmptyHint">{t("行情來源暫不可用", "Quote source unavailable", "相場ソースは現在利用できません")}</p>}</div><div className="marketTabs" role="tablist" aria-label="黃金資訊分類"><button role="tab" aria-selected={activeTab === "quotes"} className={activeTab === "quotes" ? "active" : ""} onClick={() => selectDashboardTab("quotes")}>{copy.quotes}</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => selectDashboardTab("history")}>{copy.history}</button><button role="tab" aria-selected={activeTab === "tools"} className={activeTab === "tools" ? "active" : ""} onClick={() => selectDashboardTab("tools")}>{copy.tools}</button><button role="tab" aria-selected={activeTab === "news"} className={activeTab === "news" ? "active" : ""} onClick={() => selectDashboardTab("news")}>{copy.news}</button></div>

        {activeTab === "quotes" && (
          <div className="hubPanel proQuotePanel" role="tabpanel" id="quotes">
            <div className="proPanelHeader">
              <div>
                <p className="eyebrow">99GOLD PROFESSIONAL QUOTES</p>
                <h2>{t("專業黃金報價", "Professional Gold Quotes", "プロ向け金相場")}</h2>
                <p>{t("國際參考、台灣換算、期貨與主要貴金屬集中比較", "Reference gold, Taiwan conversions, futures and key metals in one view", "国際参考価格・台湾換算・先物・主要貴金属を一覧")}</p>
              </div>
              <div className="quoteFreshness">
                <span className={quoteStatusClass}><i /> {marketStatusLabel}</span>
                <strong>{t("行情時間", "QUOTE TIME", "相場時刻")} {quoteTimeLabel}</strong>
                <small>{t("本站檢查", "SITE CHECK", "サイト確認")} {quoteCheckTimeLabel}{quoteLastSuccessLabel ? ` · ${t("上次成功", "LAST SUCCESS", "最終成功")} ${quoteLastSuccessLabel}` : ""} · {t("每 3 分鐘檢查", "CHECKS EVERY 3 MIN", "3分ごとに確認")}</small>
              </div>
            </div>

            {quotesUnavailable ? (
              <p className="quoteEmptyPanel">{t("目前沒有可驗證的即時報價，系統每 3 分鐘重試。", "No verified live quotes are available. The site retries every 3 minutes.", "検証可能な即時相場はありません。システムは3分ごとに再試行します。")}</p>
            ) : (
            <>
            <div className="quoteTerminal">
              <section className="primaryQuoteBlock" aria-label={t("國際黃金主報價", "Primary gold reference", "国際金参考価格")}>
                <div className="quoteInstrument">
                  <div className="metalBadge">Au</div>
                  <div><strong>{goldQuote?.label ?? "COMEX 黃金期貨參考"}</strong><span>{goldQuote?.code ?? "GC=F · 等待有效來源"}</span></div>
                  <span className="referenceTag">REFERENCE</span>
                </div>
                <div className="primaryPrice" aria-live="polite">
                  <span>USD</span>
                  <strong>{goldQuote?.price ?? "—"}</strong>
                  <small>{t("每金衡盎司", "PER TROY OUNCE", "1トロイオンス")}</small>
                </div>
                <div className="primaryQuoteStatus">
                  <span>{goldQuote?.change ?? t("取得中", "Loading", "取得中")}</span>
                  <span>{t("非可成交報價", "NON-EXECUTABLE", "参考値")}</span>
                </div>
                <dl className="quoteDefinitionList">
                  <div><dt>{t("資料來源", "Source", "データ元")}</dt><dd>{quoteSource}</dd></div>
                  <div><dt>{t("檢查頻率", "Check interval", "確認頻度")}</dt><dd>{t("每 3 分鐘；休市時價格不變", "Every 3 min; price holds while closed", "3分ごと・休場中は価格据え置き")}</dd></div>
                  <div><dt>{t("匯率時間", "FX time", "為替時刻")}</dt><dd>{fxQuotedAt ? formatSiteTime(fxQuotedAt) : t("來源未提供", "Not supplied", "提供なし")}</dd></div>
                  <div><dt>{t("重量基準", "Weight basis", "重量基準")}</dt><dd>1 oz = 31.1034768 g</dd></div>
                </dl>
              </section>

              <section className="terminalChartBlock" aria-label={t("黃金盤中參考走勢", "Gold intraday reference chart", "金価格の日中参考チャート")}>
                <div className="terminalChartHead">
                  <div><span>{globalGold.venue} · {globalGold.symbol}</span><h3>{t("黃金盤中參考走勢", "Gold intraday reference", "金価格の日中参考推移")}</h3></div>
                  <div><strong>{priceFormatter.format(globalGold.price)}</strong><span className={globalChangeAvailable ? (globalGold.changePercent >= 0 ? "up" : "down") : undefined}>{globalChangeAvailable ? (globalGold.changePercent >= 0 ? "▲" : "▼") : ""} {percentFormatter(globalGold.changePercent)}</span></div>
                </div>
                {intradayPoints.length > 1 ? <MarketLineChart key={`intraday-${intradayPoints.length}-${intradayPoints[intradayPoints.length - 1]?.timestamp ?? 0}`} points={intradayPoints} positive={globalChangeAvailable && globalGold.changePercent >= 0} locale={locale} period="1D" currency="USD" ariaLabel={t("黃金盤中參考價格走勢", "Gold intraday reference chart", "金価格の日中参考チャート")} /> : <div className="marketChartUnavailable">{t("此來源未提供可驗證的盤中序列", "No verified intraday series from this source", "この情報源には検証可能な日中データがありません")}</div>}
                <div className="chartMicroStats">
                  <span>O <b>{priceFormatter.format(globalGold.open)}</b></span>
                  <span>H <b>{priceFormatter.format(globalGold.high)}</b></span>
                  <span>L <b>{priceFormatter.format(globalGold.low)}</b></span>
                  <span>PREV <b>{priceFormatter.format(globalGold.previousClose)}</b></span>
                </div>
              </section>

              <aside className="quoteSnapshot">
                <div className="snapshotTitle"><span>MARKET SNAPSHOT</span><strong>{t("今日市場狀態", "Today’s market", "本日の市場")}</strong></div>
                <div className="marketDirection"><span className={globalChangeAvailable ? (globalGold.changePercent >= 0 ? "up" : "down") : undefined}>{globalChangeAvailable ? (globalGold.changePercent >= 0 ? "▲" : "▼") : "—"}</span><div><strong>{!globalAvailable ? t("行情暫不可用", "Quote unavailable", "相場データなし") : !globalChangeAvailable ? t("有效參考價", "Valid reference", "有効な参考値") : globalGold.changePercent >= 0 ? t("多方上行", "Advancing", "上昇") : t("空方回落", "Declining", "下落")}</strong><small>{globalChangeAvailable ? `${percentFormatter(globalGold.changePercent)} · ${priceFormatter.format(globalGold.change)}` : t("來源未提供前收比較", "Previous-close comparison unavailable", "前日終値比較なし")}</small></div></div>
                <div className="dayRange">
                  <div><span>{t("日內位置", "DAY POSITION", "日中位置")}</span><strong>{Number.isFinite(intradayPosition) ? `${intradayPosition.toFixed(0)}%` : "—"}</strong></div>
                  <div className="dayRangeTrack"><i style={{ width: `${Number.isFinite(intradayPosition) ? intradayPosition : 0}%` }} /></div>
                  <div><small>{priceFormatter.format(globalGold.low)}</small><small>{priceFormatter.format(globalGold.high)}</small></div>
                </div>
                <dl className="snapshotList">
                  <div><dt>{t("前收", "Previous close", "前日終値")}</dt><dd>{priceFormatter.format(globalGold.previousClose)}</dd></div>
                  <div><dt>{t("今日振幅", "Day range", "日中値幅")}</dt><dd>{percentFormatter((intradayRange / Math.max(globalGold.previousClose, 1)) * 100).replace("+", "")}</dd></div>
                  <div><dt>{t("市場", "Venue", "市場")}</dt><dd>{globalGold.venue || "COMEX"}</dd></div>
                  <div><dt>{t("行情時間", "Quote time", "相場時刻")}</dt><dd>{quoteTimeLabel}</dd></div>
                </dl>
                <Link href="/global">{t("開啟全球報價矩陣", "Open global quote matrix", "世界相場一覧を開く")} <b>→</b></Link>
              </aside>
            </div>

            <div className="conversionHeader"><div><span>TAIWAN GOLD CONVERSION</span><strong>{t("台灣黃金換算", "Taiwan gold conversions", "台湾金換算")}</strong></div><small>{t("依有效國際黃金參考價與 USD/TWD 換算", "Calculated from a valid international gold reference and USD/TWD", "有効な国際金参考値とUSD/TWDで換算")}</small></div>
            <div className="conversionCards">
              {quotes.slice(1).map((quote) => (
                <article key={quote.label}>
                  <div><span>{quote.label}</span><small>{quote.code}</small></div>
                  <strong>{quote.price}</strong>
                  <div className="conversionFoot"><span>{quote.unit}</span><b>{quote.change}</b></div>
                </article>
              ))}
              {quotes.length <= 1 && <p className="dataUnavailable">{t("匯率來源暫時無法連線，台灣換算將自動重試", "The FX source is unavailable; Taiwan conversions will retry automatically", "為替情報源に接続できないため、台湾換算を自動再試行します")}</p>}
            </div>

            <div className="globalQuotesHeader"><div><span>GLOBAL METALS</span><strong>{t("全球貴金屬比較", "Global metals comparison", "世界の貴金属比較")}</strong></div><small>{t("行情時間", "QUOTE TIME", "相場時刻")} {quoteTimeLabel} · {t("每 3 分鐘檢查", "CHECKS EVERY 3 MIN", "3分ごとに確認")}</small></div>
            <p className="tableScrollHint">{t("手機改以卡片顯示；較寬螢幕可左右滑動，商品欄固定。", "On phones this becomes stacked cards. Wider screens can scroll sideways with a sticky instrument column.", "スマホではカード表示。幅がある画面では横スクロールでき、商品列は固定です。")}</p>
            <div className="proQuoteTableScroll">
              <table className="proQuoteTable stackTable">
                <thead><tr><th>{t("商品", "Instrument", "商品")}</th><th>{t("最新價", "Last", "最新値")}</th><th>{t("漲跌", "Change", "騰落")}</th><th>{t("開盤", "Open", "始値")}</th><th>{t("最高", "High", "高値")}</th><th>{t("最低", "Low", "安値")}</th><th>{t("市場", "Venue", "市場")}</th><th>{t("行情時間", "Quote time", "相場時刻")}</th></tr></thead>
                <tbody>{globalMetals.map((metal) => { const hasChange = Number.isFinite(metal.changePercent); return <tr key={metal.id}><td data-label={t("商品", "Instrument", "商品")}><strong>{metal.symbol}</strong><span>{locale === "en" ? metal.englishName : metal.name}</span></td><td data-label={t("最新價", "Last", "最新値")}>{priceFormatter.format(metal.price)}</td><td data-label={t("漲跌", "Change", "騰落")}><b className={hasChange ? metal.changePercent >= 0 ? "up" : "down" : undefined}>{hasChange ? `${metal.changePercent >= 0 ? "▲" : "▼"} ${percentFormatter(metal.changePercent)}` : "—"}</b></td><td data-label={t("開盤", "Open", "始値")}>{priceFormatter.format(metal.open)}</td><td data-label={t("最高", "High", "高値")}>{priceFormatter.format(metal.high)}</td><td data-label={t("最低", "Low", "安値")}>{priceFormatter.format(metal.low)}</td><td data-label={t("市場", "Venue", "市場")}>{metal.venue}</td><td data-label={t("行情時間", "Quote time", "相場時刻")}><time dateTime={metal.quotedAt}>{metal.quotedAt ? formatSiteTime(metal.quotedAt) : "—"}</time></td></tr>; })}{globalMetals.length === 0 && <tr><td colSpan={8} className="tableUnavailable">{t("行情來源暫時無法連線", "Market data source is temporarily unavailable", "市場データソースに接続できません")}</td></tr>}</tbody>
              </table>
            </div>
            <GoldSilverRatioPanel
              locale={locale}
              goldPrice={globalGold.price}
              silverPrice={globalMetals.find((metal) => metal.id === "silver")?.price ?? Number.NaN}
              goldSymbol={globalGold.symbol || "GC=F"}
              silverSymbol={globalMetals.find((metal) => metal.id === "silver")?.symbol ?? "SI=F"}
              initialPoints={initialRatioPoints}
            />
            <PriceHistoryChart
              locale={locale}
              currency="USD"
              title={t("白銀（SI=F）歷史走勢", "Silver (SI=F) history", "銀（SI=F）の履歴")}
              ariaLabel={t("COMEX 白銀期貨歷史走勢", "COMEX silver futures history", "COMEX銀先物の履歴")}
              initialPoints={initialSilverPoints}
              endpoint="/api/silver-history"
              periods={["1M", "3M", "1Y"]}
              note={t("SI 期貨參考，美元／金衡盎司。缺交易日不列，不補估價格。", "SI futures reference in USD / troy ounce. Missing sessions are omitted, never filled in.", "SI先物の参考値（米ドル／トロイオンス）。欠けた取引日は掲載せず、価格は補完しません。")}
            />
            <div className="metalHistoryPair">
              <PriceHistoryChart
                locale={locale}
                currency="USD"
                title={t("鉑金（PL=F）歷史走勢", "Platinum (PL=F) history", "プラチナ（PL=F）の履歴")}
                ariaLabel={t("NYMEX 鉑金期貨歷史走勢", "NYMEX platinum futures history", "NYMEXプラチナ先物の履歴")}
                initialPoints={initialPlatinumPoints}
                endpoint="/api/platinum-history"
                periods={["1M", "3M", "1Y"]}
                note={t("PL 期貨參考（Yahoo 代碼 PL=F），美元／金衡盎司。缺交易日不列，不補估價格。", "PL futures reference (Yahoo ticker PL=F) in USD / troy ounce. Missing sessions are omitted, never filled in.", "PL先物の参考値（Yahooコード PL=F、米ドル／トロイオンス）。欠けた取引日は掲載せず、価格は補完しません。")}
              />
              <PriceHistoryChart
                locale={locale}
                currency="USD"
                title={t("鈀金（PA=F）歷史走勢", "Palladium (PA=F) history", "パラジウム（PA=F）の履歴")}
                ariaLabel={t("NYMEX 鈀金期貨歷史走勢", "NYMEX palladium futures history", "NYMEXパラジウム先物の履歴")}
                initialPoints={initialPalladiumPoints}
                endpoint="/api/palladium-history"
                periods={["1M", "3M", "1Y"]}
                note={t("PA 期貨參考，美元／金衡盎司。缺交易日不列，不補估價格。", "PA futures reference in USD / troy ounce. Missing sessions are omitted, never filled in.", "PA先物の参考値（米ドル／トロイオンス）。欠けた取引日は掲載せず、価格は補完しません。")}
              />
            </div>

            <div className="fxTape" aria-label={t("主要匯率", "Major exchange rates", "主要為替レート")}>
              <span>FX REFERENCE</span>
              {["TWD", "HKD", "CNY", "JPY", "EUR"].map((code) => <div key={code}><small>USD / {code}</small><strong>{currencies[code]?.toLocaleString("en-US", { minimumFractionDigits: code === "JPY" ? 2 : 4, maximumFractionDigits: 4 }) ?? "—"}</strong></div>)}
            </div>
            <p className="quoteMethodology"><b>{t("讀價說明：", "How to read these prices: ", "価格の見方：")}</b>{t("報價優先採 Yahoo Finance GC=F 期貨參考；來源受限時改列 Gold API XAU/USD 公開現貨參考，商品代碼、來源與缺少欄位會如實標示。台灣理論價未含銀樓溢價、工費、稅費與即時買賣價差；無有效來源時不顯示估造價格。", "Quotes prefer the Yahoo Finance GC=F futures reference. If it is limited, the site clearly switches to the public Gold API XAU/USD spot reference and leaves unsupported fields blank. Taiwan conversions exclude dealer premiums, workmanship, taxes and live spreads; no estimated price is shown without a valid source.", "相場はYahoo FinanceのGC=F先物を優先し、制限時はGold APIのXAU/USD公開現物参考値へ明示的に切り替え、未提供項目は空欄にします。台湾換算値に店頭プレミアム、加工費、税金、スプレッドは含まず、有効な情報源がない場合は推定値を表示しません。")}</p>
            </>
            )}
          </div>
        )}

        {activeTab === "news" && (
          <div className="hubPanel newsPanel" role="tabpanel">
            <div className="panelHeading">
              <div><p className="eyebrow">TODAY&apos;S MARKET FOCUS</p><h2>{copy.news}</h2></div>
              <p>{newsUpdated}<small className={`newsScheduleState ${newsScheduleStatus}`}>{newsScheduleLabel} · {t("每 3 小時", "EVERY 3 HOURS", "3時間ごと")}</small></p>
            </div>
            <p className="panelIntro">{t(
              "官方來源每 3 小時自動檢查、翻譯並上架快訊；本站分析文章則分開查核與撰寫。",
              "Official sources are checked every 3 hours. Briefs are auto-translated and published; original analysis is researched and written separately.",
              "公式情報源を3時間ごとに確認し、速報を自動翻訳して公開します。独自分析記事は別途調査・執筆します。",
            )}</p>
            <p><Link href={localizedHref("/news", locale)}>{locale === "zh" ? "開啟新聞專區 →" : locale === "ja" ? "ニュース一覧 →" : "News library →"}</Link></p>
            <div className="newsFilters" aria-label={locale === "zh" ? "新聞分類" : locale === "ja" ? "ニュース分類" : "News categories"}>{newsCategories.map((category) => <button key={category} className={newsCategory === category ? "active" : ""} aria-pressed={newsCategory === category} onClick={() => setNewsCategory(category)}>{categories[category][locale]}</button>)}</div>
            <div className="newsGrid">{filteredNews.slice(0, 10).map((item) => {
              const category = asNewsCategory(item.category);
              const key = String(item.id ?? item.url);
              const cover = item.image;
              const href = localizedHref(`/news/${item.id}`, locale);
              const excerpt = newsExcerpt(item.summary);
              return <article key={key}>
                <div className={cover ? "newsVisual hasImage" : "newsVisual officialSourceVisual"}>{cover ? <CoverImage src={cover} alt={item.title} /> : <div className="newsSourceMark"><b>99</b><small>{t("市場快訊", "MARKET BRIEF", "市場速報")}</small></div>}</div>
                <p><b>{categories[category][locale]}</b><time>{item.date}</time></p>
                <div className="newsSource"><span>{item.sourceName || t("市場快訊", "Market brief", "市場速報")}</span>{item.translated ? <em>{item.translationLabel || t("自動翻譯", "Auto-translated", "自動翻訳")}</em> : item.translationPending ? <em className="translationPending">{item.translationPendingLabel || t("原文／翻譯待補", "Original / translation pending", "原文／翻訳待ち")}</em> : null}</div>
                <h3><Link href={href} lang={item.translationPending ? "en" : undefined}>{item.title}</Link></h3>
                {excerpt ? <p className="newsSynopsis">{excerpt}</p> : <p className="newsExcerptMuted">{item.external ? t("這則快訊沒有可顯示的摘要。", "No excerpt is available for this brief.", "この速報には表示できる要約がありません。") : t("這篇文章沒有可顯示的摘要。", "No excerpt is available for this article.", "この記事には表示できる要約がありません。")}</p>}
                {cover && <small className="newsIllustrationLabel">{locale === "zh" ? "AI生成示意圖" : locale === "ja" ? "AI生成イメージ" : "AI-generated illustration"}</small>}
                <a href={href}>{item.external ? t("閱讀快訊", "Read brief", "速報を読む") : copy.read}　→</a>
              </article>;
            })}</div>
            {filteredNews.length === 0 && <p className="newsEmpty">{locale === "zh" ? "最近7天此分類暫無新文章。" : locale === "ja" ? "過去7日間、この分類に新しい記事はありません。" : "No new articles in this category in the last 7 days."}</p>}
          </div>
        )}

        {activeTab === "history" && (
          <div className="hubPanel historyProPanel" role="tabpanel">
            <div className="proPanelHeader historyProHeader">
              <div>
                <p className="eyebrow">COMEX GOLD PRICE HISTORY</p>
                <h2>{t("黃金歷史價格", "Gold Price History", "金価格履歴")}</h2>
                <p>{t("實際期間切換、區間統計與逐筆歷史資料", "Live period switching, range statistics and historical observations", "期間切替・レンジ統計・履歴データ")}</p>
              </div>
              <div className="historyStatus">
                <span className={historyLoading ? "loading" : historyAvailable ? "ready" : "unavailable"}><i />{historyLoading ? t("檢查中", "CHECKING", "確認中") : historyAvailable ? t("資料就緒", "DATA READY", "データ準備完了") : t("來源暫不可用", "SOURCE UNAVAILABLE", "データ取得不可")}</span>
                <strong>{t("資料截至", "DATA THROUGH", "データ時刻")} {historyQuoteTimeLabel}</strong>
                <small>{t("本站取得", "SITE RETRIEVED", "サイト取得")} {historyCheckTimeLabel} · USD / TROY OZ</small>
              </div>
            </div>

            <div className="historyToolbar">
              <div className="periods proPeriods" role="group" aria-label={t("歷史資料期間", "History period", "履歴期間")}>
                {(["1D", "1W", "1M", "3M", "1Y"] as HistoryPeriod[]).map((item) => <button type="button" className={period === item ? "selected" : ""} aria-pressed={period === item} onClick={() => { if (item === period) return; setHistoryLoading(true); setPeriod(item); }} key={item}>{item}</button>)}
              </div>
              <div className="historySource"><span>{t("資料來源", "SOURCE", "データ元")}</span><strong>{historySource}</strong></div>
            </div>

            <div className="historyOverview">
              <section className="historyMainChart">
                <div className="terminalChartHead">
                  <div><span>GC=F · {period}</span><h3>{t("COMEX 黃金期貨參考走勢", "COMEX gold futures reference trend", "COMEX金先物参考推移")}</h3></div>
                  <div><strong>{priceFormatter.format(historyStats.close)}</strong><span className={historyAvailable ? (historyStats.changePercent >= 0 ? "up" : "down") : undefined}>{historyAvailable ? (historyStats.changePercent >= 0 ? "▲" : "▼") : ""} {percentFormatter(historyStats.changePercent)}</span></div>
                </div>
                {historyAvailable ? <MarketLineChart key={`${period}-${historyPoints.length}-${historyPoints[historyPoints.length - 1]?.timestamp ?? 0}`} points={historyPoints} positive={historyStats.changePercent >= 0} locale={locale} period={period} currency="USD" ariaLabel={`${period} ${t("COMEX 黃金期貨歷史價格走勢", "COMEX gold futures historical price chart", "COMEX金先物価格履歴チャート")}`} /> : <div className="marketChartUnavailable">{historyLoading ? t("正在取得歷史行情", "Loading historical data", "履歴データを取得中") : t("目前沒有可驗證的歷史行情", "No verified historical data is currently available", "現在、検証済み履歴データはありません")}</div>}
              </section>

              <aside className="historyStatsPanel">
                <div className="historyStatHero"><span>{t("區間變動", "PERIOD CHANGE", "期間騰落")}</span><strong className={historyAvailable ? (historyStats.changePercent >= 0 ? "up" : "down") : undefined}>{historyAvailable ? `${historyStats.change >= 0 ? "+" : "−"}${priceFormatter.format(Math.abs(historyStats.change))}` : "—"}</strong><small>{percentFormatter(historyStats.changePercent)}</small></div>
                <div className="historyStatGrid">
                  <div><span>{t("期初", "OPEN", "始値")}</span><strong>{priceFormatter.format(historyStats.open)}</strong></div>
                  <div><span>{t("最新", "LATEST", "最新")}</span><strong>{priceFormatter.format(historyStats.close)}</strong></div>
                  <div><span>{t("區間高", "HIGH", "高値")}</span><strong>{priceFormatter.format(historyStats.high)}</strong></div>
                  <div><span>{t("區間低", "LOW", "安値")}</span><strong>{priceFormatter.format(historyStats.low)}</strong></div>
                </div>
                <div className="historyRangeVisual">
                  <div><span>{t("區間位置", "RANGE POSITION", "レンジ位置")}</span><strong>{historyAvailable && historyStats.high > historyStats.low ? `${(((historyStats.close - historyStats.low) / (historyStats.high - historyStats.low)) * 100).toFixed(0)}%` : "—"}</strong></div>
                  <div className="dayRangeTrack"><i style={{ width: `${historyAvailable && historyStats.high > historyStats.low ? Math.max(0, Math.min(100, ((historyStats.close - historyStats.low) / (historyStats.high - historyStats.low)) * 100)) : 0}%` }} /></div>
                  <div><small>{priceFormatter.format(historyStats.low)}</small><small>{priceFormatter.format(historyStats.high)}</small></div>
                </div>
                <div className="historyMethod"><b>{t("期間定義", "Period definition", "期間定義")}</b><p>{period === "1D" ? t("最近完整交易時段 · 5 分鐘級別", "Latest complete session · 5-minute intervals", "直近の取引セッション・5分足") : period === "1W" ? t("近 5 個交易日 · 30 分鐘級別", "5 trading days · 30-minute intervals", "5営業日・30分足") : period === "1M" ? t("近 1 個月 · 日線", "1 month · daily close", "1か月・日足") : period === "3M" ? t("近 3 個月 · 日線", "3 months · daily close", "3か月・日足") : t("近 1 年 · 週線", "1 year · weekly close", "1年・週足")}</p></div>
              </aside>
            </div>

            <section className="historyDataSection">
              <div className="globalQuotesHeader"><div><span>HISTORICAL OBSERVATIONS</span><strong>{t("最近歷史資料", "Recent observations", "最近の履歴データ")}</strong></div><small>{t("最多顯示 14 筆", "LATEST 14 ROWS", "直近14件")}</small></div>
                <p className="tableScrollHint">{t("手機改以卡片顯示；較寬螢幕可左右滑動，日期欄固定。", "On phones this becomes stacked cards. Wider screens can scroll sideways with a sticky date column.", "スマホではカード表示。幅がある画面では横スクロールでき、日付列は固定です。")}</p>
                <div className="proQuoteTableScroll">
                <table className="proQuoteTable historyDataTable stackTable">
                  <caption className="srOnly">{t("COMEX 黃金期貨歷史價格資料表", "COMEX gold futures price history table", "COMEX金先物価格履歴表")}</caption>
                  <thead><tr><th>{t("日期 / 時間", "Date / Time", "日時")}</th><th>{t("收盤 / 最新", "Close / Last", "終値 / 最新")}</th><th>{t("單筆變動", "Point change", "騰落率")}</th><th>{t("資料週期", "Interval", "間隔")}</th><th>{t("幣別 / 單位", "Currency / Unit", "通貨 / 単位")}</th></tr></thead>
                  <tbody>{historyRows.map((row) => <tr key={row.rowKey}><td data-label={t("日期 / 時間", "Date / Time", "日時")}><time dateTime={new Date(row.timestamp * 1000).toISOString()}>{formatHistoryDate(row.timestamp)}</time></td><td data-label={t("收盤 / 最新", "Close / Last", "終値 / 最新")}>{priceFormatter.format(row.close)}</td><td data-label={t("單筆變動", "Point change", "騰落率")}><b className={row.changePercent >= 0 ? "up" : "down"}>{row.changePercent >= 0 ? "▲" : "▼"} {percentFormatter(row.changePercent)}</b></td><td data-label={t("資料週期", "Interval", "間隔")}>{period === "1D" ? "5m" : period === "1W" ? "30m" : period === "1Y" ? "1wk" : "1d"}</td><td data-label={t("幣別 / 單位", "Currency / Unit", "通貨 / 単位")}>USD / oz</td></tr>)}{historyRows.length === 0 && <tr><td colSpan={5} className="tableUnavailable">{t("尚無可顯示的歷史資料", "No historical rows available", "表示できる履歴データがありません")}</td></tr>}</tbody>
                </table>
              </div>
            </section>
            <p className="quoteMethodology"><b>{t("歷史資料說明：", "History data note: ", "履歴データ注記：")}</b>{t("此處顯示 GC 黃金期貨參考資料，不等同現貨 XAU/USD 或銀樓牌價。市場休市、換月與資料供應商修正可能造成時間斷點；所有資訊僅供參考。", "This is GC gold futures reference data, not spot XAU/USD or retail bullion prices. Market closures, contract rolls and provider corrections can create gaps. Information is indicative only.", "GC金先物の参考データで、現物XAU/USDや店頭価格とは異なります。休場、限月交代、データ修正により欠損が生じる場合があります。参考情報としてご利用ください。")}</p>
          </div>
        )}

        {activeTab === "tools" && <div className="hubPanel proToolsPanel" role="tabpanel" id="tools"><div className="panelHeading"><div><p className="eyebrow">GOLD TOOLKIT</p><h2>{copy.tools}</h2></div><p>{t("支援台灣常用重量與純度", "Taiwan weights and purity units", "台湾で使う重量・純度単位")}</p></div><div className="toolWorkspace"><section className="toolForm"><div className="fieldGroup"><label htmlFor="manualPrice">{t("店家提供的回收報價（NT$／錢）", "Dealer recycle quote (NT$ / qian)", "店頭の買取相場（NT$／銭）")}</label><input id="manualPrice" type="number" min="0" placeholder={t("請輸入實際報價", "Enter the quoted price", "実際の相場を入力")} value={manualPrice} onChange={e=>setManualPrice(e.target.value)}/></div><div className="fieldGroup"><label htmlFor="toolWeight">{t("黃金重量", "Gold weight", "金の重量")}</label><div className="inputPair"><input id="toolWeight" type="number" min="0" step="0.01" inputMode="decimal" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)}/><select aria-label={t("重量單位", "Weight unit", "重量単位")} value={toolUnit} onChange={(event) => setToolUnit(event.target.value as typeof toolUnit)}><option value="qian">{t("錢", "Qian", "銭")}</option><option value="gram">{t("公克", "Gram", "グラム")}</option><option value="tael">{t("台兩", "Tael", "台両")}</option><option value="ounce">{t("金衡盎司", "Troy ounce", "トロイオンス")}</option></select></div></div><div className="fieldGroup"><label htmlFor="purity">{t("黃金純度", "Gold purity", "金の純度")}</label><select id="purity" value={purity} onChange={(event) => setPurity(event.target.value)}><option value="0.9999">{t("9999 純金", "9999 fine gold", "9999 純金")}</option><option value="0.999">{t("999 純金", "999 fine gold", "999 純金")}</option><option value="0.916">916／22K</option><option value="0.75">750／18K</option><option value="0.585">585／14K</option></select></div><div className="fieldGroup"><label htmlFor="purchasePrice">{t("你的買入價（每錢）", "Your purchase price (per qian)", "購入価格（銭あたり）")}</label><div className="moneyInput"><span>NT$</span><input id="purchasePrice" type="number" min="0" step="100" inputMode="numeric" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)}/></div></div><p className="toolHint">{t("純度換算採理論含金量，實際回收仍依店家檢測、耗損與手續費為準。", "Purity conversion uses theoretical gold content. Actual recycling still depends on testing, loss, and fees.", "純度換算は理論含有量です。実際の買取は鑑定、減耗、手数料によります。")}</p></section><section className="toolResults" aria-live="polite"><div className="primaryResult"><span>{t("預估回收價值", "Estimated recycle value", "買取の試算額")}</span><strong>NT$ {manualPrice ? toolResult.recycleValue.toLocaleString("zh-TW") : "—"}</strong><small>{t("依你輸入的回收報價試算，不是本站牌告", "Estimate from your recycle quote, not a posted site price", "入力した買取相場による試算であり、本サイトの掲示価格ではありません")}</small></div><div className="resultMetrics"><div><span>{t("換算重量", "Converted weight", "換算重量")}</span><strong>{toolResult.grams.toFixed(2)} g</strong></div><div><span>{t("純金重量", "Fine gold weight", "純金重量")}</span><strong>{toolResult.pureQian.toFixed(3)} {t("錢", "qian", "銭")}</strong></div><div><span>{t("購入成本", "Purchase cost", "購入コスト")}</span><strong>NT$ {toolResult.cost.toLocaleString("zh-TW")}</strong></div><div><span>{t("目前損益", "Current P/L", "現在の損益")}</span><strong className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.gain >= 0 ? "+" : "−"}NT$ {Math.abs(toolResult.gain).toLocaleString("zh-TW")}</strong><small className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.roi >= 0 ? "+" : ""}{toolResult.roi.toFixed(2)}%</small></div></div></section></div></div>}
      </section>
      <SiteLinks current="home" />
      <footer><a className="brand" href="#top"><i>99</i><span>{siteSettings.brandName}<br/><em>{siteSettings.englishName}</em></span></a><p>{copy.hero}</p><span>© 2026 {siteSettings.fullName}</span></footer>
    </main>
  );
}
