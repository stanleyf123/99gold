"use client";

/* Remote news thumbnails come from validated publisher URLs and intentionally bypass image proxying. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MarketLineChart, type MarketChartPoint } from "./MarketLineChart";
import { categories, type NewsCategory } from "./news/categories";

const initialQuotes: QuoteItem[] = [];

const alertMarkets = [
  { id: "spot", label: "COMEX 黃金期貨參考", value: Number.NaN, unit: "USD／盎司" },
  { id: "qian", label: "台灣理論金價", value: Number.NaN, unit: "TWD／錢" },
  { id: "gram", label: "黃金每公克", value: Number.NaN, unit: "TWD／公克" },
] as const;

type SavedAlert = { id: number; market: string; target: number };

type NewsItem = { id?: number | string; title: string; category?:NewsCategory; originalTitle?: string; summary?: string; date: string; url: string; image?: string; sourceName?: string; translated?: boolean };
type QuoteItem = { label: string; code: string; price: string; unit: string; change: string; up: boolean };
type Locale = "zh" | "en" | "ja";
type HistoryPeriod = "1D" | "1W" | "1M" | "3M" | "1Y";
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
  zh: { navToday: "今日金價", navInternational: "國際金價", navJewelry: "銀樓價格", navRecycle: "黃金回收", navNews: "市場情報", hero: "真金價值，長久相伴。", dashboard: "今日黃金資訊", dashboardText: "報價、走勢、實用工具與市場新聞集中在這裡，點選分頁即可切換。", quotes: "專業報價", history: "歷史金價", tools: "黃金工具", news: "市場新聞", updated: "最後更新", open: "來源時間與延遲請見報價", read: "閱讀完整文章", footer: "資料供投資與消費參考，不構成任何交易建議。" },
  en: { navToday: "Gold Prices", navInternational: "International", navJewelry: "Retail Prices", navRecycle: "Gold Recycling", navNews: "Market Insights", hero: "Global gold prices · retail market · gold tools", dashboard: "Today’s Gold Dashboard", dashboardText: "Quotes, price trends, practical tools, and market news in one place.", quotes: "Professional Quotes", history: "Price History", tools: "Gold Tools", news: "Market News", updated: "Updated", open: "See source timestamps", read: "Read article", footer: "Information is for reference only and is not investment or trading advice." },
  ja: { navToday: "本日の金価格", navInternational: "国際金価格", navJewelry: "店頭価格", navRecycle: "金の買取", navNews: "市場情報", hero: "国際金価格・店頭相場・金ツール", dashboard: "本日の金情報", dashboardText: "相場、価格推移、便利なツール、市場ニュースを一か所で確認できます。", quotes: "プロ相場", history: "価格履歴", tools: "金ツール", news: "市場ニュース", updated: "最終更新", open: "データ取得時刻をご確認ください", read: "記事を読む", footer: "本情報は参考用であり、投資・取引の助言ではありません。" },
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
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"quotes" | "news" | "history" | "tools">("quotes");
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState<HistoryPeriod>("1M");
  const [manualPrice, setManualPrice] = useState("");
  const [goldWeight, setGoldWeight] = useState("1.00");
  const [toolUnit, setToolUnit] = useState<"qian" | "gram" | "tael" | "ounce">("qian");
  const [purity, setPurity] = useState("0.9999");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [alertMarket, setAlertMarket] = useState<(typeof alertMarkets)[number]["id"]>("qian");
  const [alertTarget, setAlertTarget] = useState("18000");
  const [savedAlerts, setSavedAlerts] = useState<SavedAlert[]>([]);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [newsCategory, setNewsCategory] = useState<NewsCategory | "all">("all");
  const [newsUpdated, setNewsUpdated] = useState("正在取得最新消息");
  const [quotes, setQuotes] = useState<QuoteItem[]>(initialQuotes);
  const [quoteUpdated, setQuoteUpdated] = useState("取得中");
  const [quoteSource, setQuoteSource] = useState("Yahoo Finance GC 黃金期貨與公開匯率資料");
  const [globalMetals, setGlobalMetals] = useState<GlobalMetal[]>([]);
  const [currencies, setCurrencies] = useState<Record<string, number>>({ USD: 1 });
  const [globalUpdated, setGlobalUpdated] = useState("取得中");
  const [historyPoints, setHistoryPoints] = useState<MarketChartPoint[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats>(emptyHistoryStats);
  const [historyUpdated, setHistoryUpdated] = useState("取得中");
  const [historySource, setHistorySource] = useState("COMEX GC 黃金期貨參考");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>("zh");
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const copy = languageCopy[locale];
  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: Partial<SiteSettings> | null) => data && setSiteSettings({ ...defaultSiteSettings, ...data }))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const saved = window.localStorage.getItem("golden-tide-locale") as Locale | null;
    if (saved && saved in languageCopy) {
      document.documentElement.lang = saved === "zh" ? "zh-Hant" : saved;
      window.setTimeout(() => setLocale(saved), 0);
      return;
    }
    fetch("/api/visitor-locale", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data: { locale?: Locale } | null) => {
      if (!data?.locale || !(data.locale in languageCopy)) return;
      setLocale(data.locale);
      document.documentElement.lang = data.locale === "zh" ? "zh-Hant" : data.locale;
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const refreshQuotes = () => fetch(`/api/market-quotes?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: QuoteItem[]; updatedAt?: string; source?: string }) => {
        setQuotes(data.items ?? []);
        if (data.updatedAt) setQuoteUpdated(data.updatedAt);
        if (data.source) setQuoteSource(data.source);
      })
      .catch(() => { setQuotes([]); setQuoteUpdated("報價來源暫時無法連線，將自動重試"); });
    refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 180_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let disposed = false;
    const refreshGlobalQuotes = () => fetch(`/api/global-quotes?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { metals?: GlobalMetal[]; currencies?: Record<string, number>; updatedAt?: string }) => {
        if (disposed) return;
        setGlobalMetals(data.metals ?? []);
        setCurrencies(data.currencies ?? { USD: 1 });
        if (data.updatedAt) setGlobalUpdated(new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date(data.updatedAt)));
      })
      .catch(() => {
        if (disposed) return;
        setGlobalMetals([]);
        setCurrencies({ USD: 1 });
        setGlobalUpdated("行情來源暫時無法連線");
      });
    refreshGlobalQuotes();
    const timer = window.setInterval(refreshGlobalQuotes, 180_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    let disposed = false;
    fetch(`/api/gold-history?period=${period}&t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { points?: MarketChartPoint[]; stats?: HistoryStats; updatedAt?: string; source?: string }) => {
        if (disposed) return;
        setHistoryPoints(data.points ?? []);
        setHistoryStats(data.stats ?? emptyHistoryStats);
        if (data.source) setHistorySource(data.source);
        if (data.updatedAt) setHistoryUpdated(new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date(data.updatedAt)));
      })
      .catch(() => {
        if (disposed) return;
        setHistoryPoints([]);
        setHistoryStats(emptyHistoryStats);
        setHistoryUpdated("歷史行情來源暫時無法連線");
      })
      .finally(() => { if (!disposed) setHistoryLoading(false); });
    return () => { disposed = true; };
  }, [period]);
  useEffect(() => {
    let disposed = false;
    const refreshNews = () => fetch(`/api/market-brief?lang=${locale}&t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: NewsItem[]; updatedAt?: string }) => {
        if (disposed) return;
        setNews(data.items ?? []);
        if (data.updatedAt) setNewsUpdated(data.updatedAt);
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
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("golden-tide-alerts");
      if (stored) window.setTimeout(() => setSavedAlerts(JSON.parse(stored)), 0);
    } catch { /* device storage may be unavailable */ }
  }, []);
  const savePriceAlert = () => {
    const target = Number.parseFloat(alertTarget);
    if (!Number.isFinite(target) || target <= 0) return;
    const next = [...savedAlerts, { id: Date.now(), market: alertMarket, target }].slice(-3);
    setSavedAlerts(next);
    try { window.localStorage.setItem("golden-tide-alerts", JSON.stringify(next)); } catch { /* ignore */ }
  };
  const removePriceAlert = (id: number) => {
    const next = savedAlerts.filter((item) => item.id !== id);
    setSavedAlerts(next);
    try { window.localStorage.setItem("golden-tide-alerts", JSON.stringify(next)); } catch { /* ignore */ }
  };
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [menuOpen]);
  const openDashboardSection = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.setTimeout(() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" }), 40);
  };
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
  const liveAlertMarkets = useMemo(() => alertMarkets.map((market, index) => {
    const quoteIndex = index === 0 ? 0 : index;
    const parsed = Number((quotes[quoteIndex]?.price ?? "").replace(/,/g, ""));
    return { ...market, label: quotes[quoteIndex]?.label ?? market.label, value: Number.isFinite(parsed) && parsed > 0 ? parsed : market.value, unit: quotes[quoteIndex]?.unit ?? market.unit };
  }), [quotes]);
  const selectedAlertMarket = liveAlertMarkets.find((market) => market.id === alertMarket) ?? liveAlertMarkets[0];
  const filteredNews = news.filter((item) => newsCategory === "all" || (item.category ?? "macro") === newsCategory);
  const globalGold = globalMetals.find((metal) => metal.id === "gold") ?? unavailableGold;
  const globalAvailable = Number.isFinite(globalGold.price);
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

  return (
    <main>
      <div className="topline"><span>{copy.open}</span><span>{copy.updated} {quoteUpdated} (GMT+8)</span></div>
      <nav className="nav">
        <Link className="brand" href="/"><i>99</i><span>{siteSettings.brandName}<br/><em>{siteSettings.englishName}</em></span></Link>
        <div className="navlinks"><Link className="active" href="/#quotes">{copy.navToday}</Link><Link href="/global">全球報價</Link><Link href="/international">{copy.navInternational}</Link><Link href="/jewelry">{copy.navJewelry}</Link><Link href="/recycling">{copy.navRecycle}</Link><Link href={`/news?lang=${locale}`}>{copy.navNews}</Link></div>
        <div className="languageSwitch" aria-label="Language"><button className={locale === "zh" ? "active" : ""} onClick={() => { setLocale("zh"); window.localStorage.setItem("golden-tide-locale", "zh"); document.documentElement.lang = "zh-Hant"; }}>中</button><button className={locale === "en" ? "active" : ""} onClick={() => { setLocale("en"); window.localStorage.setItem("golden-tide-locale", "en"); document.documentElement.lang = "en"; }}>EN</button><button className={locale === "ja" ? "active" : ""} onClick={() => { setLocale("ja"); window.localStorage.setItem("golden-tide-locale", "ja"); document.documentElement.lang = "ja"; }}>日</button></div>
        <button className="menu" aria-label="開啟功能選單" aria-expanded={menuOpen} aria-controls="mobileMenu" onClick={() => setMenuOpen(true)}>☰</button>
      </nav>

      {menuOpen && <div className="menuOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><aside className="mobileMenu" id="mobileMenu" aria-label="網站功能"><div className="menuHead"><div><span>{siteSettings.brandName}</span><small>{siteSettings.englishName}</small></div><button onClick={() => setMenuOpen(false)} aria-label="關閉功能選單">×</button></div><div className="menuQuote"><span>{quotes[0]?.label ?? "報價暫不可用"}</span><strong>{quotes[0]?.price ?? "—"}</strong><small>{quotes[0]?.code ?? "等待有效來源"}　<b>{quotes[0]?.change ?? ""}</b></small></div><nav className="menuFunctions"><button onClick={() => openDashboardSection("quotes")}><span>專業報價<small>PRO QUOTES</small></span><b>→</b></button><button onClick={() => openDashboardSection("history")}><span>歷史金價<small>PRICE HISTORY</small></span><b>→</b></button><button onClick={() => openDashboardSection("tools")}><span>黃金工具<small>GOLD TOOLKIT</small></span><b>→</b></button><button onClick={() => openDashboardSection("news")}><span>市場新聞<small>MARKET NEWS</small></span><b>→</b></button><button onClick={() => { setMenuOpen(false); window.setTimeout(() => document.getElementById("price-alerts")?.scrollIntoView({ behavior: "smooth" }), 40); }}><span>到價標記<small>MY WATCHLIST</small></span><b>→</b></button></nav><p>報價與試算僅供參考</p></aside></div>}

      <section className="brandHero brandCover" aria-label={`${siteSettings.fullName}｜${siteSettings.tagline}`}><Image src="/og.jpg" alt={`${siteSettings.fullName}，${siteSettings.tagline}`} fill priority unoptimized sizes="100vw" /></section>

      <section className="marketHub" id="top"><div className="hubLead"><div><p className="eyebrow">GOLD MARKET DASHBOARD</p><h1>{copy.dashboard}</h1><p>{copy.dashboardText}</p></div><div className="hubPrice"><span>{quotes[0] ? `${quotes[0].label}・${quotes[0].code}` : t("等待有效行情", "Waiting for valid quote", "有効な相場を待っています")}</span><strong>{quotes[0]?.price ?? "—"}</strong><em className={quotes[0] ? (quotes[0].up ? "up" : "down") : undefined}>{quotes[0] ? `${quotes[0].up ? "▲" : "▼"} ${quotes[0].change}` : t("來源暫不可用", "SOURCE UNAVAILABLE", "データ取得不可")}</em></div></div><div className="marketTabs" role="tablist" aria-label="黃金資訊分類"><button role="tab" aria-selected={activeTab === "quotes"} className={activeTab === "quotes" ? "active" : ""} onClick={() => setActiveTab("quotes")}>{copy.quotes}</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>{copy.history}</button><button role="tab" aria-selected={activeTab === "tools"} className={activeTab === "tools" ? "active" : ""} onClick={() => setActiveTab("tools")}>{copy.tools}</button><button role="tab" aria-selected={activeTab === "news"} className={activeTab === "news" ? "active" : ""} onClick={() => setActiveTab("news")}>{copy.news}</button></div>

        {activeTab === "quotes" && (
          <div className="hubPanel proQuotePanel" role="tabpanel" id="quotes">
            <div className="proPanelHeader">
              <div>
                <p className="eyebrow">99GOLD PROFESSIONAL QUOTES</p>
                <h2>{t("專業黃金報價", "Professional Gold Quotes", "プロ向け金相場")}</h2>
                <p>{t("國際參考、台灣換算、期貨與主要貴金屬集中比較", "Reference gold, Taiwan conversions, futures and key metals in one view", "国際参考価格・台湾換算・先物・主要貴金属を一覧")}</p>
              </div>
              <div className="quoteFreshness">
                <span><i /> {t("參考行情", "REFERENCE DATA", "参考データ")}</span>
                <strong>{copy.updated} {quoteUpdated}</strong>
                <small>GMT+8 · AUTO REFRESH 3 MIN</small>
              </div>
            </div>

            <div className="quoteTerminal">
              <section className="primaryQuoteBlock" aria-label={t("國際黃金主報價", "Primary gold reference", "国際金参考価格")}>
                <div className="quoteInstrument">
                  <div className="metalBadge">Au</div>
                  <div><strong>{quotes[0]?.label ?? "COMEX 黃金期貨參考"}</strong><span>{quotes[0]?.code ?? "GC=F · 等待有效來源"}</span></div>
                  <span className="referenceTag">REFERENCE</span>
                </div>
                <div className="primaryPrice" aria-live="polite">
                  <span>USD</span>
                  <strong>{quotes[0]?.price ?? "—"}</strong>
                  <small>{t("每金衡盎司", "PER TROY OUNCE", "1トロイオンス")}</small>
                </div>
                <div className="primaryQuoteStatus">
                  <span>{quotes[0]?.change ?? t("取得中", "Loading", "取得中")}</span>
                  <span>{t("非可成交報價", "NON-EXECUTABLE", "参考値")}</span>
                </div>
                <dl className="quoteDefinitionList">
                  <div><dt>{t("資料來源", "Source", "データ元")}</dt><dd>{quoteSource}</dd></div>
                  <div><dt>{t("更新頻率", "Refresh", "更新頻度")}</dt><dd>3 min</dd></div>
                  <div><dt>{t("重量基準", "Weight basis", "重量基準")}</dt><dd>1 oz = 31.1034768 g</dd></div>
                </dl>
              </section>

              <section className="terminalChartBlock" aria-label={t("COMEX 黃金期貨日內走勢", "COMEX gold futures intraday chart", "COMEX金先物の日中チャート")}>
                <div className="terminalChartHead">
                  <div><span>COMEX · GC=F</span><h3>{t("黃金期貨日內走勢", "Gold futures intraday", "金先物の日中推移")}</h3></div>
                  <div><strong>{priceFormatter.format(globalGold.price)}</strong><span className={globalAvailable ? (globalGold.changePercent >= 0 ? "up" : "down") : undefined}>{globalAvailable ? (globalGold.changePercent >= 0 ? "▲" : "▼") : ""} {percentFormatter(globalGold.changePercent)}</span></div>
                </div>
                {intradayPoints.length > 1 ? <MarketLineChart key={`intraday-${intradayPoints.length}-${intradayPoints[intradayPoints.length - 1]?.timestamp ?? 0}`} points={intradayPoints} positive={globalGold.changePercent >= 0} locale={locale} period="1D" currency="USD" ariaLabel={t("COMEX 黃金期貨日內參考價格走勢", "COMEX gold futures intraday reference chart", "COMEX金先物の日中参考価格チャート")} /> : <div className="marketChartUnavailable">{t("等待有效日內行情", "Waiting for valid intraday data", "有効な日中データを待っています")}</div>}
                <div className="chartMicroStats">
                  <span>O <b>{priceFormatter.format(globalGold.open)}</b></span>
                  <span>H <b>{priceFormatter.format(globalGold.high)}</b></span>
                  <span>L <b>{priceFormatter.format(globalGold.low)}</b></span>
                  <span>PREV <b>{priceFormatter.format(globalGold.previousClose)}</b></span>
                </div>
              </section>

              <aside className="quoteSnapshot">
                <div className="snapshotTitle"><span>MARKET SNAPSHOT</span><strong>{t("今日市場狀態", "Today’s market", "本日の市場")}</strong></div>
                <div className="marketDirection"><span className={globalAvailable ? (globalGold.changePercent >= 0 ? "up" : "down") : undefined}>{globalAvailable ? (globalGold.changePercent >= 0 ? "▲" : "▼") : "—"}</span><div><strong>{!globalAvailable ? t("行情暫不可用", "Quote unavailable", "相場データなし") : globalGold.changePercent >= 0 ? t("多方上行", "Advancing", "上昇") : t("空方回落", "Declining", "下落")}</strong><small>{percentFormatter(globalGold.changePercent)} · {priceFormatter.format(globalGold.change)}</small></div></div>
                <div className="dayRange">
                  <div><span>{t("日內位置", "DAY POSITION", "日中位置")}</span><strong>{Number.isFinite(intradayPosition) ? `${intradayPosition.toFixed(0)}%` : "—"}</strong></div>
                  <div className="dayRangeTrack"><i style={{ width: `${Number.isFinite(intradayPosition) ? intradayPosition : 0}%` }} /></div>
                  <div><small>{priceFormatter.format(globalGold.low)}</small><small>{priceFormatter.format(globalGold.high)}</small></div>
                </div>
                <dl className="snapshotList">
                  <div><dt>{t("前收", "Previous close", "前日終値")}</dt><dd>{priceFormatter.format(globalGold.previousClose)}</dd></div>
                  <div><dt>{t("今日振幅", "Day range", "日中値幅")}</dt><dd>{percentFormatter((intradayRange / Math.max(globalGold.previousClose, 1)) * 100).replace("+", "")}</dd></div>
                  <div><dt>{t("市場", "Venue", "市場")}</dt><dd>{globalGold.venue || "COMEX"}</dd></div>
                  <div><dt>{t("更新", "Updated", "更新")}</dt><dd>{globalUpdated}</dd></div>
                </dl>
                <Link href="/global">{t("開啟全球報價矩陣", "Open global quote matrix", "世界相場一覧を開く")} <b>→</b></Link>
              </aside>
            </div>

            <div className="conversionHeader"><div><span>TAIWAN GOLD CONVERSION</span><strong>{t("台灣黃金換算", "Taiwan gold conversions", "台湾金換算")}</strong></div><small>{t("依 GC 黃金期貨參考與 USD/TWD 換算", "Calculated from GC futures reference and USD/TWD", "GC金先物参考値とUSD/TWDで換算")}</small></div>
            <div className="conversionCards">
              {quotes.slice(1).map((quote) => (
                <article key={quote.label}>
                  <div><span>{quote.label}</span><small>{quote.code}</small></div>
                  <strong>{quote.price}</strong>
                  <div className="conversionFoot"><span>{quote.unit}</span><b>{quote.change}</b></div>
                </article>
              ))}
              {quotes.length === 0 && <p className="dataUnavailable">{t("等待有效行情後提供換算", "Conversions appear when valid data is available", "有効な相場取得後に換算値を表示します")}</p>}
            </div>

            <div className="globalQuotesHeader"><div><span>GLOBAL METALS</span><strong>{t("全球貴金屬比較", "Global metals comparison", "世界の貴金属比較")}</strong></div><small>{copy.updated} {globalUpdated} · 3 MIN CACHE</small></div>
            <div className="proQuoteTableScroll">
              <table className="proQuoteTable">
                <thead><tr><th>{t("商品", "Instrument", "商品")}</th><th>{t("最新價", "Last", "最新値")}</th><th>{t("漲跌", "Change", "騰落")}</th><th>{t("開盤", "Open", "始値")}</th><th>{t("最高", "High", "高値")}</th><th>{t("最低", "Low", "安値")}</th><th>{t("市場", "Venue", "市場")}</th></tr></thead>
                <tbody>{globalMetals.map((metal) => <tr key={metal.id}><td><strong>{metal.symbol}</strong><span>{locale === "en" ? metal.englishName : metal.name}</span></td><td>{priceFormatter.format(metal.price)}</td><td><b className={metal.changePercent >= 0 ? "up" : "down"}>{metal.changePercent >= 0 ? "▲" : "▼"} {percentFormatter(metal.changePercent)}</b></td><td>{priceFormatter.format(metal.open)}</td><td>{priceFormatter.format(metal.high)}</td><td>{priceFormatter.format(metal.low)}</td><td>{metal.venue}</td></tr>)}{globalMetals.length === 0 && <tr><td colSpan={7} className="tableUnavailable">{t("行情來源暫時無法連線", "Market data source is temporarily unavailable", "市場データソースに接続できません")}</td></tr>}</tbody>
              </table>
            </div>

            <div className="fxTape" aria-label={t("主要匯率", "Major exchange rates", "主要為替レート")}>
              <span>FX REFERENCE</span>
              {["TWD", "HKD", "CNY", "JPY", "EUR"].map((code) => <div key={code}><small>USD / {code}</small><strong>{currencies[code]?.toLocaleString("en-US", { minimumFractionDigits: code === "JPY" ? 2 : 4, maximumFractionDigits: 4 }) ?? "—"}</strong></div>)}
            </div>
            <p className="quoteMethodology"><b>{t("讀價說明：", "How to read these prices: ", "価格の見方：")}</b>{t("GC=F 為 COMEX 黃金期貨參考，不是現貨 XAU/USD 或銀樓可成交牌價。台灣理論價未含銀樓溢價、工費、稅費與即時買賣價差；來源無有效資料時本站不顯示估造價格。", "GC=F is a COMEX gold futures reference, not spot XAU/USD or an executable retail quote. Taiwan conversions exclude dealer premiums, workmanship, taxes and live spreads; no estimated price is shown when sources are unavailable.", "GC=FはCOMEX金先物の参考値で、現物XAU/USDや店頭取引価格ではありません。台湾換算値に店頭プレミアム、加工費、税金、スプレッドは含まず、データ取得不可時は推定値を表示しません。")}</p>
          </div>
        )}

        {activeTab === "news" && <div className="hubPanel newsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">TODAY&apos;S MARKET FOCUS</p><h2>{copy.news}</h2></div><p>{newsUpdated}</p></div><p className="panelIntro">{locale === "zh" ? "查核近期資料後重新撰文，新聞事實與本站分析分開呈現；配圖為AI生成示意。" : locale === "ja" ? "最近の資料を確認して独自に執筆。事実と分析を区別し、AI生成のイメージ画像を添えています。" : "Original articles based on checked recent sources, separating facts from analysis. Images are AI-generated illustrations."}</p><p><a href={`/news?lang=${locale}`}>{locale === "zh" ? "開啟新聞專區 →" : locale === "ja" ? "ニュース一覧 →" : "News library →"}</a></p><div className="newsFilters" aria-label={locale==="zh"?"新聞分類":locale==="ja"?"ニュース分類":"News categories"}>{newsCategories.map((category) => <button key={category} className={newsCategory === category ? "active" : ""} aria-pressed={newsCategory === category} onClick={() => setNewsCategory(category)}>{categories[category][locale]}</button>)}</div><div className="newsGrid">{filteredNews.slice(0, 10).map((item) => { const category = item.category??"macro"; const key = String(item.id ?? item.url); const cover = item.image; return <article key={key}><div className="newsVisual hasImage"><img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }}/></div><p><b>{categories[category][locale]}</b><time>{item.date}</time></p><div className="newsSource"><span>{item.sourceName || "國際新聞"}</span>{item.translated && <em>自動翻譯</em>}</div><h3>{item.title}</h3>{item.summary && <p className="newsSynopsis">{item.summary}</p>}<small className="newsIllustrationLabel">{locale === "zh" ? "AI生成示意圖" : locale === "ja" ? "AI生成イメージ" : "AI-generated illustration"}</small><a href={`/news/${item.id}`}>{copy.read}　→</a></article>; })}</div>{filteredNews.length === 0 && <p className="newsEmpty">{locale === "zh" ? "最近7天此分類暫無新文章。" : locale === "ja" ? "過去7日間、この分類に新しい記事はありません。" : "No new articles in this category in the last 7 days."}</p>}</div>}

        {activeTab === "history" && (
          <div className="hubPanel historyProPanel" role="tabpanel">
            <div className="proPanelHeader historyProHeader">
              <div>
                <p className="eyebrow">COMEX GOLD PRICE HISTORY</p>
                <h2>{t("黃金歷史價格", "Gold Price History", "金価格履歴")}</h2>
                <p>{t("實際期間切換、區間統計與逐筆歷史資料", "Live period switching, range statistics and historical observations", "期間切替・レンジ統計・履歴データ")}</p>
              </div>
              <div className="historyStatus">
                <span className={historyLoading ? "loading" : historyAvailable ? "ready" : "unavailable"}><i />{historyLoading ? t("更新中", "UPDATING", "更新中") : historyAvailable ? t("資料就緒", "DATA READY", "データ準備完了") : t("來源暫不可用", "SOURCE UNAVAILABLE", "データ取得不可")}</span>
                <strong>{historyUpdated}</strong>
                <small>ASIA/TAIPEI · USD / TROY OZ</small>
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
                <div className="historyMethod"><b>{t("期間定義", "Period definition", "期間定義")}</b><p>{period === "1D" ? t("當日 5 分鐘級別", "Today · 5-minute intervals", "当日・5分足") : period === "1W" ? t("近 5 個交易日 · 30 分鐘級別", "5 trading days · 30-minute intervals", "5営業日・30分足") : period === "1M" ? t("近 1 個月 · 日線", "1 month · daily close", "1か月・日足") : period === "3M" ? t("近 3 個月 · 日線", "3 months · daily close", "3か月・日足") : t("近 1 年 · 週線", "1 year · weekly close", "1年・週足")}</p></div>
              </aside>
            </div>

            <section className="historyDataSection">
              <div className="globalQuotesHeader"><div><span>HISTORICAL OBSERVATIONS</span><strong>{t("最近歷史資料", "Recent observations", "最近の履歴データ")}</strong></div><small>{t("最多顯示 14 筆", "LATEST 14 ROWS", "直近14件")}</small></div>
              <div className="proQuoteTableScroll">
                <table className="proQuoteTable historyDataTable">
                  <caption className="srOnly">{t("COMEX 黃金期貨歷史價格資料表", "COMEX gold futures price history table", "COMEX金先物価格履歴表")}</caption>
                  <thead><tr><th>{t("日期 / 時間", "Date / Time", "日時")}</th><th>{t("收盤 / 最新", "Close / Last", "終値 / 最新")}</th><th>{t("單筆變動", "Point change", "騰落率")}</th><th>{t("資料週期", "Interval", "間隔")}</th><th>{t("幣別 / 單位", "Currency / Unit", "通貨 / 単位")}</th></tr></thead>
                  <tbody>{historyRows.map((row) => <tr key={row.rowKey}><td><time dateTime={new Date(row.timestamp * 1000).toISOString()}>{formatHistoryDate(row.timestamp)}</time></td><td>{priceFormatter.format(row.close)}</td><td><b className={row.changePercent >= 0 ? "up" : "down"}>{row.changePercent >= 0 ? "▲" : "▼"} {percentFormatter(row.changePercent)}</b></td><td>{period === "1D" ? "5m" : period === "1W" ? "30m" : period === "1Y" ? "1wk" : "1d"}</td><td>USD / oz</td></tr>)}{historyRows.length === 0 && <tr><td colSpan={5} className="tableUnavailable">{t("尚無可顯示的歷史資料", "No historical rows available", "表示できる履歴データがありません")}</td></tr>}</tbody>
                </table>
              </div>
            </section>
            <p className="quoteMethodology"><b>{t("歷史資料說明：", "History data note: ", "履歴データ注記：")}</b>{t("此處顯示 GC 黃金期貨參考資料，不等同現貨 XAU/USD 或銀樓牌價。市場休市、換月與資料供應商修正可能造成時間斷點；所有資訊僅供參考。", "This is GC gold futures reference data, not spot XAU/USD or retail bullion prices. Market closures, contract rolls and provider corrections can create gaps. Information is indicative only.", "GC金先物の参考データで、現物XAU/USDや店頭価格とは異なります。休場、限月交代、データ修正により欠損が生じる場合があります。参考情報としてご利用ください。")}</p>
          </div>
        )}

        {activeTab === "tools" && <div className="hubPanel proToolsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">GOLD TOOLKIT</p><h2>黃金工具中心</h2></div><p>支援台灣常用重量與純度</p></div><div className="toolWorkspace"><section className="toolForm"><div className="fieldGroup"><label htmlFor="manualPrice">店家提供的回收報價（NT$／錢）</label><input id="manualPrice" type="number" min="0" placeholder="請輸入實際報價" value={manualPrice} onChange={e=>setManualPrice(e.target.value)}/></div><div className="fieldGroup"><label htmlFor="toolWeight">黃金重量</label><div className="inputPair"><input id="toolWeight" type="number" min="0" step="0.01" inputMode="decimal" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)}/><select aria-label="重量單位" value={toolUnit} onChange={(event) => setToolUnit(event.target.value as typeof toolUnit)}><option value="qian">錢</option><option value="gram">公克</option><option value="tael">台兩</option><option value="ounce">金衡盎司</option></select></div></div><div className="fieldGroup"><label htmlFor="purity">黃金純度</label><select id="purity" value={purity} onChange={(event) => setPurity(event.target.value)}><option value="0.9999">9999 純金</option><option value="0.999">999 純金</option><option value="0.916">916／22K</option><option value="0.75">750／18K</option><option value="0.585">585／14K</option></select></div><div className="fieldGroup"><label htmlFor="purchasePrice">你的買入價（每錢）</label><div className="moneyInput"><span>NT$</span><input id="purchasePrice" type="number" min="0" step="100" inputMode="numeric" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)}/></div></div><p className="toolHint">純度換算採理論含金量，實際回收仍依店家檢測、耗損與手續費為準。</p></section><section className="toolResults" aria-live="polite"><div className="primaryResult"><span>預估回收價值</span><strong>NT$ {manualPrice ? toolResult.recycleValue.toLocaleString("zh-TW") : "—"}</strong><small>依你輸入的回收報價試算，不是本站牌告</small></div><div className="resultMetrics"><div><span>換算重量</span><strong>{toolResult.grams.toFixed(2)} g</strong></div><div><span>純金重量</span><strong>{toolResult.pureQian.toFixed(3)} 錢</strong></div><div><span>購入成本</span><strong>NT$ {toolResult.cost.toLocaleString("zh-TW")}</strong></div><div><span>目前損益</span><strong className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.gain >= 0 ? "+" : "−"}NT$ {Math.abs(toolResult.gain).toLocaleString("zh-TW")}</strong><small className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.roi >= 0 ? "+" : ""}{toolResult.roi.toFixed(2)}%</small></div></div></section></div></div>}
      </section>

      <section className="tools marketRadar"><div><p className="eyebrow">MARKET RADAR</p><h2>今日市場<br/>快速判讀</h2></div><div className="tool"><span>{quotes[0]?.label ?? "國際黃金參考"}</span><strong>US$ {quotes[0]?.price ?? "—"}</strong><small>{quotes[0]?.unit ?? "美元／金衡盎司"}</small></div><div className="tool"><span>{quotes[1]?.label ?? "台灣理論金價"}</span><strong>NT$ {quotes[1]?.price ?? "—"}</strong><small>{quotes[1]?.unit ?? "台幣／錢"}</small></div><div className="tool"><span>USD / TWD</span><strong>{quotes[3]?.price ?? currencies.TWD?.toFixed(4) ?? "—"}</strong><small>{copy.updated} {quoteUpdated}</small></div><button onClick={() => { setActiveTab("history"); window.scrollTo({ top: 92, behavior: "smooth" }); }}>查看歷史走勢 <b>→</b></button></section>
      <div id="price-alerts" className="scrollAnchor"/>

      <section className="alertCenter"><div className="alertIntro"><p className="eyebrow">PERSONAL WATCHLIST</p><h2>我的到價標記</h2><p>設定你關注的價格，網站會保存在這台裝置，回來時可快速查看距離目標還有多少。</p></div><div className="alertComposer"><label><span>關注項目</span><select value={alertMarket} onChange={(event) => setAlertMarket(event.target.value as typeof alertMarket)}>{liveAlertMarkets.map((market) => <option value={market.id} key={market.id}>{market.label}</option>)}</select></label><label><span>目標價格</span><div><input type="number" inputMode="decimal" min="0" value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)}/><small>{selectedAlertMarket.unit}</small></div></label><button onClick={savePriceAlert}>加入關注</button></div><div className="savedAlerts">{savedAlerts.length === 0 ? <div className="alertEmpty"><span>尚未設定</span><p>輸入目標價後即可建立你的個人關注清單。</p></div> : savedAlerts.map((item) => { const market = liveAlertMarkets.find((entry) => entry.id === item.market) ?? liveAlertMarkets[0]; const gap = item.target - market.value; return <article key={item.id}><div><span>{market.label}</span><small>目前 {Number.isFinite(market.value) ? market.value.toLocaleString("en-US") : "—"} {market.unit}</small></div><strong>{item.target.toLocaleString("en-US")}</strong><em className={gap >= 0 ? "watchUp" : "watchReached"}>{!Number.isFinite(gap) ? "尚無有效行情，無法判定" : gap > 0 ? `距離目標 ${gap.toLocaleString("en-US")}` : "已達目標"}</em><button aria-label={`移除${market.label}到價標記`} onClick={() => removePriceAlert(item.id)}>×</button></article>; })}</div><p className="alertDisclaimer">此功能為裝置內的價格標記，不會發送系統推播；行情更新後可回到本站查看。</p></section>

      <footer><a className="brand" href="#top"><i>99</i><span>{siteSettings.brandName}<br/><em>{siteSettings.englishName}</em></span></a><p>真金價值，長久相伴。</p><span>© 2026 {siteSettings.fullName}</span></footer>
    </main>
  );
}
