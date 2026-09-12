"use client";

import { useEffect, useMemo, useState } from "react";

const initialQuotes: QuoteItem[] = [];

const additionalQuotes: {symbol:string;label:string;price:string;unit:string;change:string}[] = [];

const alertMarkets = [
  { id: "spot", label: "國際現貨金", value: Number.NaN, unit: "USD／盎司" },
  { id: "retail", label: "銀樓黃金賣出", value: Number.NaN, unit: "TWD／錢" },
  { id: "recycle", label: "銀樓黃金買進", value: Number.NaN, unit: "TWD／錢" },
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
  zh: { navToday: "今日金價", navInternational: "國際金價", navJewelry: "銀樓價格", navRecycle: "黃金回收", navNews: "市場情報", hero: "真金價值，長久相伴。", dashboard: "今日黃金資訊", dashboardText: "報價、走勢、實用工具與市場新聞集中在這裡，點選分頁即可切換。", quotes: "即時報價", history: "歷史金價", tools: "黃金工具", news: "市場新聞", updated: "最後更新", open: "來源時間與延遲請見報價", read: "閱讀站內摘要", footer: "資料供投資與消費參考，不構成任何交易建議。" },
  en: { navToday: "Gold Prices", navInternational: "International", navJewelry: "Retail Prices", navRecycle: "Gold Recycling", navNews: "Market Insights", hero: "Global gold prices · retail market · gold tools", dashboard: "Today’s Gold Dashboard", dashboardText: "Quotes, price trends, practical tools, and market news in one place.", quotes: "Live Quotes", history: "Price History", tools: "Gold Tools", news: "Market News", updated: "Updated", open: "See source timestamps", read: "Read article", footer: "Information is for reference only and is not investment or trading advice." },
  ja: { navToday: "本日の金価格", navInternational: "国際金価格", navJewelry: "店頭価格", navRecycle: "金の買取", navNews: "市場情報", hero: "国際金価格・店頭相場・金ツール", dashboard: "本日の金情報", dashboardText: "相場、価格推移、便利なツール、市場ニュースを一か所で確認できます。", quotes: "リアルタイム相場", history: "価格履歴", tools: "金ツール", news: "市場ニュース", updated: "最終更新", open: "データ取得時刻をご確認ください", read: "記事を読む", footer: "本情報は参考用であり、投資・取引の助言ではありません。" },
} as const;

const fallbackNews: NewsItem[] = [];

const monthlyGoldHistory: string[][] = [];

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
  const [manualPrice, setManualPrice] = useState("");
  const [goldWeight, setGoldWeight] = useState("1.00");
  const [toolUnit, setToolUnit] = useState<"qian" | "gram" | "tael" | "ounce">("qian");
  const [purity, setPurity] = useState("0.9999");
  const [purchasePrice, setPurchasePrice] = useState("");
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
        setQuotes(data.items ?? []);
        if (data.updatedAt) setQuoteUpdated(data.updatedAt);
      })
      .catch(() => {setQuotes([]); setQuoteUpdated("報價來源暫時無法連線，將自動重試");});
    refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 600_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let disposed = false;
    setNews([]);
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
    const recycleValue = Math.round(pureQian * (Number.parseFloat(manualPrice) || 0));
    const cost = Math.round(grossQian * (Number.parseFloat(purchasePrice) || 0));
    const gain = recycleValue - cost;
    const roi = cost > 0 ? (gain / cost) * 100 : 0;
    return { grossQian, pureQian, grams: grossQian * 3.75, recycleValue, cost, gain, roi };
  }, [goldWeight, toolUnit, purity, purchasePrice, manualPrice]);
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

      {menuOpen && <div className="menuOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><aside className="mobileMenu" id="mobileMenu" aria-label="網站功能"><div className="menuHead"><div><span>{siteSettings.brandName}</span><small>{siteSettings.englishName}</small></div><button onClick={() => setMenuOpen(false)} aria-label="關閉功能選單">×</button></div><div className="menuQuote"><span>{quotes[0]?.label ?? "報價暫不可用"}</span><strong>{quotes[0]?.price ?? "—"}</strong><small>{quotes[0]?.code}</small></div><nav className="menuFunctions"><button onClick={() => openDashboardSection("quotes")}><span>即時報價<small>LIVE QUOTES</small></span><b>→</b></button><button onClick={() => openDashboardSection("history")}><span>歷史金價<small>PRICE HISTORY</small></span><b>→</b></button><button onClick={() => openDashboardSection("tools")}><span>黃金工具<small>GOLD TOOLKIT</small></span><b>→</b></button><button onClick={() => openDashboardSection("news")}><span>市場新聞<small>MARKET NEWS</small></span><b>→</b></button><button onClick={() => { setMenuOpen(false); window.setTimeout(() => document.getElementById("price-alerts")?.scrollIntoView({ behavior: "smooth" }), 40); }}><span>到價標記<small>MY WATCHLIST</small></span><b>→</b></button></nav><p>報價與試算僅供參考</p></aside></div>}

      <section className="brandHero brandCover" aria-label={`${siteSettings.fullName}｜${siteSettings.tagline}`}><img src="/og.jpg" alt={`${siteSettings.fullName}，${siteSettings.tagline}`}/></section>

      <section className="marketHub" id="top"><div className="hubLead"><div><p className="eyebrow">GOLD MARKET DASHBOARD</p><h1>{copy.dashboard}</h1><p>{copy.dashboardText}</p></div><div className="hubPrice"><span>{quotes[0]?.label}・{quotes[0]?.code}</span><strong>{quotes[0]?.price ?? "—"}</strong><em className={quotes[0]?.up ? "up" : "down"}>{quotes[0]?.up ? "▲" : "▼"} {quotes[0]?.change}</em></div></div><div className="marketTabs" role="tablist" aria-label="黃金資訊分類"><button role="tab" aria-selected={activeTab === "quotes"} className={activeTab === "quotes" ? "active" : ""} onClick={() => setActiveTab("quotes")}>{copy.quotes}</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>{copy.history}</button><button role="tab" aria-selected={activeTab === "tools"} className={activeTab === "tools" ? "active" : ""} onClick={() => setActiveTab("tools")}>{copy.tools}</button><button role="tab" aria-selected={activeTab === "news"} className={activeTab === "news" ? "active" : ""} onClick={() => setActiveTab("news")}>{copy.news}</button></div>

        {activeTab === "quotes" && <div className="hubPanel" role="tabpanel" id="quotes"><div className="panelHeading"><div><p className="eyebrow">LIVE MARKET</p><h2>{copy.quotes}</h2></div><p>{copy.updated} {quoteUpdated}（GMT+8）</p></div><div className="quoteGrid">{quotes.map((q) => <article className="quoteCard" key={q.label}><div><p>{q.label}</p><span>{q.code}</span></div><strong>{q.price}</strong><div className="quoteFoot"><span>{q.unit}</span><b className={q.up ? "up" : "down"}>{q.up ? "▲" : "▼"} {q.change}</b></div></article>)}</div><p className="panelNote">行情僅在來源返回有效資料時顯示；沒有銀樓牌告來源，因此不顯示銀樓買賣價。</p><div className="moreQuotesHead"><div><span>PRECIOUS METALS</span><strong>更多國際報價</strong></div><small>美元計價・參考行情</small></div><div className="moreQuotes">{additionalQuotes.map((item) => <article key={item.symbol}><span>{item.symbol}</span><div><p>{item.label}</p><small>{item.unit}</small></div><strong>{item.price}</strong><em>{item.change}</em></article>)}</div><p className="panelNote">黃金參考價每 10 分鐘更新；台灣理論金價由國際金價與匯率換算，實際銀樓價格以各通路公告為準。</p></div>}

        {activeTab === "news" && <div className="hubPanel newsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">TODAY&apos;S MARKET FOCUS</p><h2>{copy.news}</h2></div><p>{newsUpdated}</p></div><p className="panelIntro">本站收錄聯準會官方貨幣政策公告。翻譯完成才會標示自動翻譯；免費翻譯受限時顯示英文原文。點選文章可在站內閱讀正文，來源與擷取時間列於文末。</p><div className="newsFilters" role="tablist" aria-label="新聞分類">{newsCategories.map((category) => <button key={category} className={newsCategory === category ? "active" : ""} onClick={() => setNewsCategory(category)}>{category}</button>)}</div><div className="newsGrid">{filteredNews.slice(0, 10).map((item) => { const category = classifyNews(item.title); const key = String(item.id ?? item.url); const cover = item.image || categoryCover[category]; return <article key={key}><div className="newsVisual hasImage"><img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { if (event.currentTarget.src !== categoryCover[category]) event.currentTarget.src = categoryCover[category]; else event.currentTarget.style.display = "none"; }}/></div><p><b>{category}</b><time>{item.date}</time></p><div className="newsSource"><span>{item.sourceName || "國際新聞"}</span>{item.translated && <em>自動翻譯</em>}</div><h3>{item.title}</h3><a href={`/news/${item.id}`}>{copy.read}　→</a></article>; })}</div>{filteredNews.length === 0 && <p className="newsEmpty">這個分類目前沒有新消息，請切換「全部」查看其他市場焦點。</p>}</div>}

        {activeTab === "history" && <div className="hubPanel historyPanel" role="tabpanel"><p className="panelNote">尚未接通可驗證的歷史資料，已停止顯示示意走勢。No verified historical data available.</p><div className="historyBlock"><div className="historyHead"><div><p className="eyebrow">30-DAY HISTORY</p><h3>每日參考收盤價</h3></div><span>美元／盎司</span></div><div className="historyList"><div className="historyRow historyLabels"><span>日期</span><span>收盤價</span><span>日變動</span></div>{monthlyGoldHistory.map(([date, price, change]) => <div className="historyRow" key={date}><time>2026/{date}</time><strong>{price}</strong><em className={change.startsWith("−") ? "down" : "up"}>{change}</em></div>)}</div></div><p className="historyNote">近 30 日參考走勢，與即時報價可能略有差異；資料不作交易依據。</p></div>}

        {activeTab === "tools" && <div className="hubPanel proToolsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">GOLD TOOLKIT</p><h2>黃金工具中心</h2></div><p>支援台灣常用重量與純度</p></div><div className="toolWorkspace"><section className="toolForm"><div className="fieldGroup"><label htmlFor="manualPrice">店家提供的回收報價（NT$／錢）</label><input id="manualPrice" type="number" min="0" placeholder="請輸入實際報價" value={manualPrice} onChange={e=>setManualPrice(e.target.value)}/></div><div className="fieldGroup"><label htmlFor="toolWeight">黃金重量</label><div className="inputPair"><input id="toolWeight" type="number" min="0" step="0.01" inputMode="decimal" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)}/><select aria-label="重量單位" value={toolUnit} onChange={(event) => setToolUnit(event.target.value as typeof toolUnit)}><option value="qian">錢</option><option value="gram">公克</option><option value="tael">台兩</option><option value="ounce">金衡盎司</option></select></div></div><div className="fieldGroup"><label htmlFor="purity">黃金純度</label><select id="purity" value={purity} onChange={(event) => setPurity(event.target.value)}><option value="0.9999">9999 純金</option><option value="0.999">999 純金</option><option value="0.916">916／22K</option><option value="0.75">750／18K</option><option value="0.585">585／14K</option></select></div><div className="fieldGroup"><label htmlFor="purchasePrice">你的買入價（每錢）</label><div className="moneyInput"><span>NT$</span><input id="purchasePrice" type="number" min="0" step="100" inputMode="numeric" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)}/></div></div><p className="toolHint">純度換算採理論含金量，實際回收仍依店家檢測、耗損與手續費為準。</p></section><section className="toolResults" aria-live="polite"><div className="primaryResult"><span>預估回收價值</span><strong>NT$ {manualPrice ? toolResult.recycleValue.toLocaleString("zh-TW") : "—"}</strong><small>依你輸入的回收報價試算，不是本站牌告</small></div><div className="resultMetrics"><div><span>換算重量</span><strong>{toolResult.grams.toFixed(2)} g</strong></div><div><span>純金重量</span><strong>{toolResult.pureQian.toFixed(3)} 錢</strong></div><div><span>購入成本</span><strong>NT$ {toolResult.cost.toLocaleString("zh-TW")}</strong></div><div><span>目前損益</span><strong className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.gain >= 0 ? "+" : "−"}NT$ {Math.abs(toolResult.gain).toLocaleString("zh-TW")}</strong><small className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.roi >= 0 ? "+" : ""}{toolResult.roi.toFixed(2)}%</small></div></div></section></div></div>}
      </section>


      <div id="price-alerts" className="scrollAnchor"/>

      <section className="alertCenter"><div className="alertIntro"><p className="eyebrow">PERSONAL WATCHLIST</p><h2>我的到價標記</h2><p>設定你關注的價格，網站會保存在這台裝置，回來時可快速查看距離目標還有多少。</p></div><div className="alertComposer"><label><span>關注項目</span><select value={alertMarket} onChange={(event) => setAlertMarket(event.target.value as typeof alertMarket)}>{alertMarkets.map((market) => <option value={market.id} key={market.id}>{market.label}</option>)}</select></label><label><span>目標價格</span><div><input type="number" inputMode="decimal" min="0" value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)}/><small>{selectedAlertMarket.unit}</small></div></label><button onClick={savePriceAlert}>加入關注</button></div><div className="savedAlerts">{savedAlerts.length === 0 ? <div className="alertEmpty"><span>尚未設定</span><p>輸入目標價後即可建立你的個人關注清單。</p></div> : savedAlerts.map((item) => { const market = alertMarkets.find((entry) => entry.id === item.market) ?? alertMarkets[0]; const gap = item.target - market.value; return <article key={item.id}><div><span>{market.label}</span><small>目前 {Number.isFinite(market.value) ? market.value.toLocaleString("en-US") : "—"} {market.unit}</small></div><strong>{item.target.toLocaleString("en-US")}</strong><em className={gap >= 0 ? "watchUp" : "watchReached"}>{!Number.isFinite(gap) ? "尚無有效行情，無法判定" : gap > 0 ? `距離目標 ${gap.toLocaleString("en-US")}` : "已達目標"}</em><button aria-label={`移除${market.label}到價標記`} onClick={() => removePriceAlert(item.id)}>×</button></article>; })}</div><p className="alertDisclaimer">此功能為裝置內的價格標記，不會發送系統推播；行情更新後可回到本站查看。</p></section>

      <footer><a className="brand" href="#top"><i>99</i><span>{siteSettings.brandName}<br/><em>{siteSettings.englishName}</em></span></a><p>真金價值，長久相伴。</p><span>© 2026 {siteSettings.fullName}</span></footer>
    </main>
  );
}
