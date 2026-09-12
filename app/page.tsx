"use client";

import { useEffect, useMemo, useState } from "react";

const initialQuotes = [
  { label: "國際現貨金", code: "XAU / USD", price: "4,408.80", unit: "美元／盎司", change: "+54.10", up: true },
  { label: "銀樓黃金買進", code: "999.9 純金", price: "16,560", unit: "台幣／錢", change: "+30", up: true },
  { label: "銀樓黃金賣出", code: "999.9 純金", price: "17,260", unit: "台幣／錢", change: "+30", up: true },
  { label: "美元匯率", code: "USD / TWD", price: "31.6858", unit: "新台幣", change: "−0.021", up: false },
];

const additionalQuotes = [
  { symbol: "XAG", label: "國際白銀", price: "66.73", unit: "USD／盎司", change: "+1.67%" },
  { symbol: "XPT", label: "國際鉑金", price: "1,856.00", unit: "USD／盎司", change: "+2.43%" },
  { symbol: "XPD", label: "國際鈀金", price: "1,347.00", unit: "USD／盎司", change: "+1.05%" },
  { symbol: "AU/G", label: "黃金每公克", price: "4,492", unit: "TWD／公克", change: "國際換算" },
];

const alertMarkets = [
  { id: "spot", label: "國際現貨金", value: 4408.8, unit: "USD／盎司" },
  { id: "retail", label: "銀樓黃金賣出", value: 17260, unit: "TWD／錢" },
  { id: "recycle", label: "銀樓黃金買進", value: 16560, unit: "TWD／錢" },
] as const;

type SavedAlert = { id: number; market: string; target: number };

type NewsCategory = "黃金市場" | "美元與匯率" | "利率與央行" | "國際財經";
type NewsItem = { id?: number | string; title: string; originalTitle?: string; summary?: string; date: string; url: string; image?: string; sourceName?: string; translated?: boolean };
type QuoteItem = { label: string; code: string; price: string; unit: string; change: string; up: boolean };
type Locale = "zh" | "en" | "ja";
type SiteSettings = { brandName: string; fullName: string; englishName: string; tagline: string; announcement: string };

const defaultSiteSettings: SiteSettings = {
  brandName: "玖久黃金報價網",
  fullName: "玖久黃金報價網",
  englishName: "99GOLD.NET",
  tagline: "真金價值，長久相伴。",
  announcement: "",
};

const languageCopy = {
  zh: { navToday: "今日金價", navInternational: "國際金價", navJewelry: "銀樓價格", navRecycle: "黃金回收", navNews: "市場情報", hero: "真金價值，長久相伴。", dashboard: "今日黃金資訊", dashboardText: "報價、走勢、實用工具與市場新聞集中在這裡，點選分頁即可切換。", quotes: "即時報價", history: "歷史金價", tools: "黃金工具", news: "市場新聞", updated: "最後更新", open: "市場開盤中", read: "閱讀站內摘要", footer: "資料供投資與消費參考，不構成任何交易建議。" },
  en: { navToday: "Gold Prices", navInternational: "International", navJewelry: "Retail Prices", navRecycle: "Gold Recycling", navNews: "Market Insights", hero: "Global gold prices · retail market · gold tools", dashboard: "Today’s Gold Dashboard", dashboardText: "Quotes, price trends, practical tools, and market news in one place.", quotes: "Live Quotes", history: "Price History", tools: "Gold Tools", news: "Market News", updated: "Updated", open: "Market open", read: "Read article", footer: "Information is for reference only and is not investment or trading advice." },
  ja: { navToday: "本日の金価格", navInternational: "国際金価格", navJewelry: "店頭価格", navRecycle: "金の買取", navNews: "市場情報", hero: "国際金価格・店頭相場・金ツール", dashboard: "本日の金情報", dashboardText: "相場、価格推移、便利なツール、市場ニュースを一か所で確認できます。", quotes: "リアルタイム相場", history: "価格履歴", tools: "金ツール", news: "市場ニュース", updated: "最終更新", open: "市場オープン", read: "記事を読む", footer: "本情報は参考用であり、投資・取引の助言ではありません。" },
} as const;

const fallbackNews: NewsItem[] = [
  { id: "gold-market", title: "今日黃金市場重點", date: "即時", url: "https://news.google.com/search?q=%E9%BB%83%E9%87%91&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=82" },
  { id: "dollar-market", title: "美元指數與黃金價格關係", date: "即時", url: "https://news.google.com/search?q=%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", image: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=1200&q=82" },
  { id: "fed-rates", title: "聯準會利率決策觀察", date: "即時", url: "https://news.google.com/search?q=%E8%81%AF%E6%BA%96%E6%9C%83%20%E5%88%A9%E7%8E%87&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=82" },
];

const monthlyGoldHistory = [
  ["09/08", "4,424.50", "+0.42%"], ["09/07", "4,406.07", "+0.31%"],
  ["09/04", "4,392.45", "+0.18%"], ["09/03", "4,384.56", "+0.46%"],
  ["09/02", "4,364.48", "−0.12%"], ["09/01", "4,369.72", "+0.27%"],
  ["08/31", "4,357.95", "+0.39%"], ["08/28", "4,340.99", "+0.15%"],
  ["08/27", "4,334.49", "−0.22%"], ["08/26", "4,344.05", "+0.34%"],
  ["08/25", "4,329.33", "+0.51%"], ["08/24", "4,307.36", "−0.09%"],
  ["08/21", "4,311.24", "+0.28%"], ["08/20", "4,299.20", "+0.17%"],
  ["08/19", "4,291.90", "−0.31%"], ["08/18", "4,305.25", "+0.44%"],
  ["08/17", "4,286.39", "+0.20%"], ["08/14", "4,277.84", "−0.14%"],
  ["08/13", "4,283.84", "+0.36%"], ["08/12", "4,268.47", "+0.25%"],
  ["08/11", "4,257.83", "+0.33%"], ["08/10", "4,243.82", "+0.19%"],
];

const newsCategories: Array<NewsCategory | "全部"> = ["全部", "黃金市場", "美元與匯率", "利率與央行", "國際財經"];
const categoryCover: Record<NewsCategory, string> = {
  "黃金市場": "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=82",
  "美元與匯率": "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=1200&q=82",
  "利率與央行": "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=82",
  "國際財經": "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1200&q=82",
};
function classifyNews(title: string): NewsCategory {
  const text = title.toLowerCase();
  if (/聯準會|fed|利率|央行|降息|升息|貨幣政策/.test(text)) return "利率與央行";
  if (/美元|匯率|外匯|美債|dollar|currency/.test(text)) return "美元與匯率";
  if (/黃金|金價|金市|xau|gold/.test(text)) return "黃金市場";
  return "國際財經";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"quotes" | "news" | "history" | "tools">("quotes");
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState("1M");
  const [goldWeight, setGoldWeight] = useState("1.00");
  const [toolUnit, setToolUnit] = useState<"qian" | "gram" | "tael" | "ounce">("qian");
  const [purity, setPurity] = useState("0.9999");
  const [purchasePrice, setPurchasePrice] = useState("15000");
  const [alertMarket, setAlertMarket] = useState<(typeof alertMarkets)[number]["id"]>("retail");
  const [alertTarget, setAlertTarget] = useState("18000");
  const [savedAlerts, setSavedAlerts] = useState<SavedAlert[]>([]);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [newsCategory, setNewsCategory] = useState<NewsCategory | "全部">("全部");
  const [newsUpdated, setNewsUpdated] = useState("正在取得最新消息");
  const [quotes, setQuotes] = useState<QuoteItem[]>(initialQuotes);
  const [quoteUpdated, setQuoteUpdated] = useState("取得中");
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
      setLocale(saved);
      document.documentElement.lang = saved === "zh" ? "zh-Hant" : saved;
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
      .then((data: { items?: QuoteItem[]; updatedAt?: string }) => {
        if (data.items?.length) setQuotes(data.items);
        if (data.updatedAt) setQuoteUpdated(data.updatedAt);
      })
      .catch(() => setQuoteUpdated("報價來源暫時無法連線，將自動重試"));
    refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 600_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let disposed = false;
    const refreshNews = () => fetch(`/api/market-brief?lang=${locale}&t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: NewsItem[]; updatedAt?: string }) => {
        if (disposed) return;
        if (data.items?.length) setNews(data.items);
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
      if (stored) setSavedAlerts(JSON.parse(stored));
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
  const path = useMemo(() => {
    const shapes: Record<string, string> = {
      "1D": "M0 140 C28 126 48 140 70 112 S118 110 142 90 S190 99 218 55 S273 86 320 33",
      "1W": "M0 141 C22 135 43 104 68 116 S113 84 143 95 S188 62 219 73 S270 33 320 29",
      "1M": "M0 148 C22 134 45 135 67 103 S111 128 142 86 S185 105 213 63 S271 88 320 18",
      "1Y": "M0 151 C28 148 45 112 70 124 S112 71 141 101 S181 112 211 54 S265 98 320 13",
    };
    return shapes[period];
  }, [period]);
  const toolResult = useMemo(() => {
    const weight = Number.parseFloat(goldWeight) || 0;
    const unitToQian = { qian: 1, gram: 1 / 3.75, tael: 10, ounce: 31.1034768 / 3.75 };
    const grossQian = Math.max(0, weight) * unitToQian[toolUnit];
    const pureQian = grossQian * Number.parseFloat(purity);
    const recycleValue = Math.round(pureQian * 16560);
    const cost = Math.round(grossQian * (Number.parseFloat(purchasePrice) || 0));
    const gain = recycleValue - cost;
    const roi = cost > 0 ? (gain / cost) * 100 : 0;
    return { grossQian, pureQian, grams: grossQian * 3.75, recycleValue, cost, gain, roi };
  }, [goldWeight, toolUnit, purity, purchasePrice]);
  const selectedAlertMarket = alertMarkets.find((market) => market.id === alertMarket) ?? alertMarkets[0];
  const filteredNews = news.filter((item) => newsCategory === "全部" || classifyNews(item.title) === newsCategory);

  return (
    <main>
      <div className="topline"><span>{copy.open}</span><span>{copy.updated} {quoteUpdated} (GMT+8)</span></div>
      <nav className="nav">
        <a className="brand" href="/"><i>99</i><span>{siteSettings.brandName}<br/><em>{siteSettings.englishName}</em></span></a>
        <div className="navlinks"><a className="active" href="/#quotes">{copy.navToday}</a><a href="/global">全球報價</a><a href="/international">{copy.navInternational}</a><a href="/jewelry">{copy.navJewelry}</a><a href="/recycling">{copy.navRecycle}</a><a href="/insights">{copy.navNews}</a></div>
        <div className="languageSwitch" aria-label="Language"><button className={locale === "zh" ? "active" : ""} onClick={() => { setLocale("zh"); window.localStorage.setItem("golden-tide-locale", "zh"); document.documentElement.lang = "zh-Hant"; }}>中</button><button className={locale === "en" ? "active" : ""} onClick={() => { setLocale("en"); window.localStorage.setItem("golden-tide-locale", "en"); document.documentElement.lang = "en"; }}>EN</button><button className={locale === "ja" ? "active" : ""} onClick={() => { setLocale("ja"); window.localStorage.setItem("golden-tide-locale", "ja"); document.documentElement.lang = "ja"; }}>日</button></div>
        <button className="menu" aria-label="開啟功能選單" aria-expanded={menuOpen} aria-controls="mobileMenu" onClick={() => setMenuOpen(true)}>☰</button>
      </nav>

      {menuOpen && <div className="menuOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><aside className="mobileMenu" id="mobileMenu" aria-label="網站功能"><div className="menuHead"><div><span>{siteSettings.brandName}</span><small>{siteSettings.englishName}</small></div><button onClick={() => setMenuOpen(false)} aria-label="關閉功能選單">×</button></div><div className="menuQuote"><span>國際現貨金</span><strong>4,408.80</strong><small>XAU / USD　<b>+1.24%</b></small></div><nav className="menuFunctions"><button onClick={() => openDashboardSection("quotes")}><span>即時報價<small>LIVE QUOTES</small></span><b>→</b></button><button onClick={() => openDashboardSection("history")}><span>歷史金價<small>PRICE HISTORY</small></span><b>→</b></button><button onClick={() => openDashboardSection("tools")}><span>黃金工具<small>GOLD TOOLKIT</small></span><b>→</b></button><button onClick={() => openDashboardSection("news")}><span>市場新聞<small>MARKET NEWS</small></span><b>→</b></button><button onClick={() => { setMenuOpen(false); window.setTimeout(() => document.getElementById("price-alerts")?.scrollIntoView({ behavior: "smooth" }), 40); }}><span>到價標記<small>MY WATCHLIST</small></span><b>→</b></button></nav><p>報價與試算僅供參考</p></aside></div>}

      <section className="brandHero brandCover" aria-label={`${siteSettings.fullName}｜${siteSettings.tagline}`}><img src="/og.jpg" alt={`${siteSettings.fullName}，${siteSettings.tagline}`}/></section>

      <section className="marketHub" id="top"><div className="hubLead"><div><p className="eyebrow">GOLD MARKET DASHBOARD</p><h1>{copy.dashboard}</h1><p>{copy.dashboardText}</p></div><div className="hubPrice"><span>{quotes[0]?.label}・{quotes[0]?.code}</span><strong>{quotes[0]?.price ?? "—"}</strong><em className={quotes[0]?.up ? "up" : "down"}>{quotes[0]?.up ? "▲" : "▼"} {quotes[0]?.change}</em></div></div><div className="marketTabs" role="tablist" aria-label="黃金資訊分類"><button role="tab" aria-selected={activeTab === "quotes"} className={activeTab === "quotes" ? "active" : ""} onClick={() => setActiveTab("quotes")}>{copy.quotes}</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>{copy.history}</button><button role="tab" aria-selected={activeTab === "tools"} className={activeTab === "tools" ? "active" : ""} onClick={() => setActiveTab("tools")}>{copy.tools}</button><button role="tab" aria-selected={activeTab === "news"} className={activeTab === "news" ? "active" : ""} onClick={() => setActiveTab("news")}>{copy.news}</button></div>

        {activeTab === "quotes" && <div className="hubPanel" role="tabpanel" id="quotes"><div className="panelHeading"><div><p className="eyebrow">LIVE MARKET</p><h2>{copy.quotes}</h2></div><p>{copy.updated} {quoteUpdated}（GMT+8）</p></div><div className="quoteGrid">{quotes.map((q) => <article className="quoteCard" key={q.label}><div><p>{q.label}</p><span>{q.code}</span></div><strong>{q.price}</strong><div className="quoteFoot"><span>{q.unit}</span><b className={q.up ? "up" : "down"}>{q.up ? "▲" : "▼"} {q.change}</b></div></article>)}</div><div className="marketSummary"><div><span>今日高點</span><strong>4,413.70</strong></div><div><span>今日低點</span><strong>4,340.80</strong></div><div><span>今日振幅</span><strong>1.68%</strong></div><div><span>市場狀態</span><strong>多方回升</strong></div></div><div className="moreQuotesHead"><div><span>PRECIOUS METALS</span><strong>更多國際報價</strong></div><small>美元計價・參考行情</small></div><div className="moreQuotes">{additionalQuotes.map((item) => <article key={item.symbol}><span>{item.symbol}</span><div><p>{item.label}</p><small>{item.unit}</small></div><strong>{item.price}</strong><em>{item.change}</em></article>)}</div><p className="panelNote">黃金參考價每 10 分鐘更新；台灣理論金價由國際金價與匯率換算，實際銀樓價格以各通路公告為準。</p></div>}

        {activeTab === "news" && <div className="hubPanel newsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">TODAY&apos;S MARKET FOCUS</p><h2>{copy.news}</h2></div><p>{newsUpdated}</p></div><p className="panelIntro">自動擷取國際可信來源的黃金與總經新聞，並翻譯成目前選擇的網站語言；所有新聞先進入本站閱讀，原始來源放在文章頁底部。</p><div className="newsFilters" role="tablist" aria-label="新聞分類">{newsCategories.map((category) => <button key={category} className={newsCategory === category ? "active" : ""} onClick={() => setNewsCategory(category)}>{category}</button>)}</div><div className="newsGrid">{filteredNews.slice(0, 10).map((item) => { const category = classifyNews(item.title); const key = String(item.id ?? item.url); const cover = item.image || categoryCover[category]; return <article key={key}><div className="newsVisual hasImage"><img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { if (event.currentTarget.src !== categoryCover[category]) event.currentTarget.src = categoryCover[category]; else event.currentTarget.style.display = "none"; }}/></div><p><b>{category}</b><time>{item.date}</time></p><div className="newsSource"><span>{item.sourceName || "國際新聞"}</span>{item.translated && <em>自動翻譯</em>}</div><h3>{item.title}</h3><a href={`/news/${item.id ?? "gold-market"}`}>{copy.read}　→</a></article>; })}</div>{filteredNews.length === 0 && <p className="newsEmpty">這個分類目前沒有新消息，請切換「全部」查看其他市場焦點。</p>}</div>}

        {activeTab === "history" && <div className="hubPanel historyPanel" role="tabpanel"><div className="historyChart"><div className="chartTop"><div><p className="eyebrow">XAU / USD</p><h2>近一個月價格走勢</h2></div><div><strong>4,424.50</strong><span className="up">▲ 0.42%</span></div></div><div className="chart"><div className="gridLines"/><svg viewBox="0 0 320 170" preserveAspectRatio="none" aria-label="黃金價格走勢圖"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9a62e" stopOpacity=".38"/><stop offset="1" stopColor="#d9a62e" stopOpacity="0"/></linearGradient></defs><path d={`${path} L320 170 L0 170 Z`} fill="url(#fill)"/><path d={path} fill="none" stroke="#d9a62e" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx="320" cy="18" r="4" fill="#c9951c" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chartPriceTag">4,424.50</div><div className="yAxis" aria-hidden="true"><span>4,450</span><span>4,380</span><span>4,310</span><span>4,240</span></div><div className="xAxis" aria-hidden="true"><span>8/10</span><span>8/17</span><span>8/24</span><span>8/31</span><span>9/08</span></div></div><div className="periods">{["1D", "1W", "1M", "1Y"].map((p) => <button className={period === p ? "selected" : ""} onClick={() => setPeriod(p)} key={p}>{p}</button>)}</div></div><div className="historyBlock"><div className="historyHead"><div><p className="eyebrow">30-DAY HISTORY</p><h3>每日參考收盤價</h3></div><span>美元／盎司</span></div><div className="historyList"><div className="historyRow historyLabels"><span>日期</span><span>收盤價</span><span>日變動</span></div>{monthlyGoldHistory.map(([date, price, change]) => <div className="historyRow" key={date}><time>2026/{date}</time><strong>{price}</strong><em className={change.startsWith("−") ? "down" : "up"}>{change}</em></div>)}</div></div><p className="historyNote">近 30 日參考走勢，與即時報價可能略有差異；資料不作交易依據。</p></div>}

        {activeTab === "tools" && <div className="hubPanel proToolsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">GOLD TOOLKIT</p><h2>黃金工具中心</h2></div><p>支援台灣常用重量與純度</p></div><div className="toolWorkspace"><section className="toolForm"><div className="fieldGroup"><label htmlFor="toolWeight">黃金重量</label><div className="inputPair"><input id="toolWeight" type="number" min="0" step="0.01" inputMode="decimal" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)}/><select aria-label="重量單位" value={toolUnit} onChange={(event) => setToolUnit(event.target.value as typeof toolUnit)}><option value="qian">錢</option><option value="gram">公克</option><option value="tael">台兩</option><option value="ounce">金衡盎司</option></select></div></div><div className="fieldGroup"><label htmlFor="purity">黃金純度</label><select id="purity" value={purity} onChange={(event) => setPurity(event.target.value)}><option value="0.9999">9999 純金</option><option value="0.999">999 純金</option><option value="0.916">916／22K</option><option value="0.75">750／18K</option><option value="0.585">585／14K</option></select></div><div className="fieldGroup"><label htmlFor="purchasePrice">你的買入價（每錢）</label><div className="moneyInput"><span>NT$</span><input id="purchasePrice" type="number" min="0" step="100" inputMode="numeric" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)}/></div></div><p className="toolHint">純度換算採理論含金量，實際回收仍依店家檢測、耗損與手續費為準。</p></section><section className="toolResults" aria-live="polite"><div className="primaryResult"><span>預估回收價值</span><strong>NT$ {toolResult.recycleValue.toLocaleString("zh-TW")}</strong><small>以 999.9 買進價 NT$16,560／錢估算</small></div><div className="resultMetrics"><div><span>換算重量</span><strong>{toolResult.grams.toFixed(2)} g</strong></div><div><span>純金重量</span><strong>{toolResult.pureQian.toFixed(3)} 錢</strong></div><div><span>購入成本</span><strong>NT$ {toolResult.cost.toLocaleString("zh-TW")}</strong></div><div><span>目前損益</span><strong className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.gain >= 0 ? "+" : "−"}NT$ {Math.abs(toolResult.gain).toLocaleString("zh-TW")}</strong><small className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.roi >= 0 ? "+" : ""}{toolResult.roi.toFixed(2)}%</small></div></div></section></div><div className="professionalStrip"><div><span>銀樓買賣價差</span><strong>NT$ 700／錢</strong><small>賣出 17,260 − 買進 16,560</small></div><div><span>回本所需漲幅</span><strong>4.23%</strong><small>未計工費與其他成本</small></div><div><span>國際換算參考</span><strong>NT$ 16,896／錢</strong><small>依 XAU/USD 與匯率推算</small></div></div></div>}
      </section>

      <section className="tools marketRadar"><div><p className="eyebrow">MARKET RADAR</p><h2>今日市場<br/>快速判讀</h2></div><div className="tool"><span>國際理論價</span><strong>NT$ 16,896</strong><small>每錢・依現貨與匯率換算</small></div><div className="tool"><span>銀樓溢價</span><strong>+2.15%</strong><small>牌告賣出價相較理論價</small></div><div className="tool"><span>買賣價差</span><strong>NT$ 700</strong><small>每錢・未含工費</small></div><button onClick={() => { setActiveTab("tools"); window.scrollTo({ top: 92, behavior: "smooth" }); }}>開啟專業工具 <b>→</b></button></section>
      <div id="price-alerts" className="scrollAnchor"/>

      <section className="alertCenter"><div className="alertIntro"><p className="eyebrow">PERSONAL WATCHLIST</p><h2>我的到價標記</h2><p>設定你關注的價格，網站會保存在這台裝置，回來時可快速查看距離目標還有多少。</p></div><div className="alertComposer"><label><span>關注項目</span><select value={alertMarket} onChange={(event) => setAlertMarket(event.target.value as typeof alertMarket)}>{alertMarkets.map((market) => <option value={market.id} key={market.id}>{market.label}</option>)}</select></label><label><span>目標價格</span><div><input type="number" inputMode="decimal" min="0" value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)}/><small>{selectedAlertMarket.unit}</small></div></label><button onClick={savePriceAlert}>加入關注</button></div><div className="savedAlerts">{savedAlerts.length === 0 ? <div className="alertEmpty"><span>尚未設定</span><p>輸入目標價後即可建立你的個人關注清單。</p></div> : savedAlerts.map((item) => { const market = alertMarkets.find((entry) => entry.id === item.market) ?? alertMarkets[0]; const gap = item.target - market.value; return <article key={item.id}><div><span>{market.label}</span><small>目前 {market.value.toLocaleString("en-US")} {market.unit}</small></div><strong>{item.target.toLocaleString("en-US")}</strong><em className={gap >= 0 ? "watchUp" : "watchReached"}>{gap > 0 ? `距離目標 ${gap.toLocaleString("en-US")}` : "已達目標"}</em><button aria-label={`移除${market.label}到價標記`} onClick={() => removePriceAlert(item.id)}>×</button></article>; })}</div><p className="alertDisclaimer">此功能為裝置內的價格標記，不會發送系統推播；行情更新後可回到本站查看。</p></section>

      <footer><a className="brand" href="#top"><i>99</i><span>{siteSettings.brandName}<br/><em>{siteSettings.englishName}</em></span></a><p>真金價值，長久相伴。</p><span>© 2026 {siteSettings.fullName}</span></footer>
    </main>
  );
}
