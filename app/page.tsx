"use client";

import { useEffect, useMemo, useState } from "react";

const quotes = [
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

type NewsItem = { title: string; date: string; url: string; image?: string };

const fallbackNews: NewsItem[] = [
  { title: "查看最新黃金市場消息", date: "即時", url: "https://news.google.com/search?q=%E9%BB%83%E9%87%91&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=82" },
  { title: "查看美元指數最新消息", date: "即時", url: "https://news.google.com/search?q=%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", image: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=1200&q=82" },
  { title: "查看聯準會利率決策消息", date: "即時", url: "https://news.google.com/search?q=%E8%81%AF%E6%BA%96%E6%9C%83%20%E5%88%A9%E7%8E%87&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=82" },
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

const focusLabels = ["黃金市場", "美元走勢", "聯準會政策"];

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
  const [newsUpdated, setNewsUpdated] = useState("正在取得最新消息");
  useEffect(() => {
    let disposed = false;
    const refreshNews = () => fetch(`/api/market-brief?t=${Date.now()}`, { cache: "no-store" })
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
  }, []);
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

  return (
    <main>
      <div className="topline"><span>市場開盤中</span><span>最後更新 2026.09.09　15:56 (GMT+8)</span></div>
      <nav className="nav">
        <a className="brand" href="/"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a>
        <div className="navlinks"><a className="active" href="/#quotes">今日金價</a><a href="/international">國際金價</a><a href="/jewelry">銀樓價格</a><a href="/recycling">黃金回收</a><a href="/insights">市場情報</a></div>
        <button className="menu" aria-label="開啟功能選單" aria-expanded={menuOpen} aria-controls="mobileMenu" onClick={() => setMenuOpen(true)}>☰</button>
      </nav>

      {menuOpen && <div className="menuOverlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><aside className="mobileMenu" id="mobileMenu" aria-label="網站功能"><div className="menuHead"><div><span>金澤</span><small>GOLDEN TIDE</small></div><button onClick={() => setMenuOpen(false)} aria-label="關閉功能選單">×</button></div><div className="menuQuote"><span>國際現貨金</span><strong>4,408.80</strong><small>XAU / USD　<b>+1.24%</b></small></div><nav className="menuFunctions"><button onClick={() => openDashboardSection("quotes")}><span>即時報價<small>LIVE QUOTES</small></span><b>→</b></button><button onClick={() => openDashboardSection("history")}><span>歷史金價<small>PRICE HISTORY</small></span><b>→</b></button><button onClick={() => openDashboardSection("tools")}><span>黃金工具<small>GOLD TOOLKIT</small></span><b>→</b></button><button onClick={() => openDashboardSection("news")}><span>市場新聞<small>MARKET NEWS</small></span><b>→</b></button><button onClick={() => { setMenuOpen(false); window.setTimeout(() => document.getElementById("price-alerts")?.scrollIntoView({ behavior: "smooth" }), 40); }}><span>到價標記<small>MY WATCHLIST</small></span><b>→</b></button></nav><p>報價與試算僅供參考</p></aside></div>}

      <section className="brandHero" aria-labelledby="brandTitle"><img src="/assets/golden-tide-hero.png" alt="金塊與金幣陳列於深色石材上"/><div className="brandHeroShade"/><div className="brandHeroCopy"><p className="eyebrow">TAIWAN GOLD MARKET INTELLIGENCE</p><h1 id="brandTitle">金澤 <span>GOLDEN TIDE</span></h1><p>國際金價・銀樓行情・黃金工具</p><div className="heroBadges"><span>國際現貨</span><span>銀樓牌價</span><span>回收試算</span><span>市場情報</span></div></div><div className="heroLive"><span>市場開盤中</span><strong>4,408.80</strong><small>XAU / USD　<span>+1.24%</span></small></div></section>

      <section className="marketHub" id="top"><div className="hubLead"><div><p className="eyebrow">GOLD MARKET DASHBOARD</p><h1>今日黃金資訊</h1><p>報價、走勢、實用工具與市場新聞集中在這裡，點選分頁即可切換。</p></div><div className="hubPrice"><span>國際現貨金・XAU/USD</span><strong>4,424.50</strong><em className="up">▲ 18.43　0.42%</em></div></div><div className="marketTabs" role="tablist" aria-label="黃金資訊分類"><button role="tab" aria-selected={activeTab === "quotes"} className={activeTab === "quotes" ? "active" : ""} onClick={() => setActiveTab("quotes")}>即時報價</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>歷史金價</button><button role="tab" aria-selected={activeTab === "tools"} className={activeTab === "tools" ? "active" : ""} onClick={() => setActiveTab("tools")}>黃金工具</button><button role="tab" aria-selected={activeTab === "news"} className={activeTab === "news" ? "active" : ""} onClick={() => setActiveTab("news")}>市場新聞</button></div>

        {activeTab === "quotes" && <div className="hubPanel" role="tabpanel" id="quotes"><div className="panelHeading"><div><p className="eyebrow">LIVE MARKET</p><h2>即時報價</h2></div><p>最後更新 2026.09.09 15:56（GMT+8）</p></div><div className="quoteGrid">{quotes.map((q) => <article className="quoteCard" key={q.label}><div><p>{q.label}</p><span>{q.code}</span></div><strong>{q.price}</strong><div className="quoteFoot"><span>{q.unit}</span><b className={q.up ? "up" : "down"}>{q.up ? "▲" : "▼"} {q.change}</b></div></article>)}</div><div className="marketSummary"><div><span>今日高點</span><strong>4,413.70</strong></div><div><span>今日低點</span><strong>4,340.80</strong></div><div><span>今日振幅</span><strong>1.68%</strong></div><div><span>市場狀態</span><strong>多方回升</strong></div></div><div className="moreQuotesHead"><div><span>PRECIOUS METALS</span><strong>更多國際報價</strong></div><small>美元計價・參考行情</small></div><div className="moreQuotes">{additionalQuotes.map((item) => <article key={item.symbol}><span>{item.symbol}</span><div><p>{item.label}</p><small>{item.unit}</small></div><strong>{item.price}</strong><em>{item.change}</em></article>)}</div><p className="panelNote">國際行情參考 Kitco 紐約現貨市場；銀樓價格與實際成交價仍以各通路公告為準。</p></div>}

        {activeTab === "news" && <div className="hubPanel newsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">TODAY&apos;S MARKET FOCUS</p><h2>今日市場焦點</h2></div><p>{newsUpdated}</p></div><p className="panelIntro">整理可能影響金價的三個關鍵面向：黃金行情、美元走勢與聯準會政策。</p><div className="newsGrid">{news.slice(0, 3).map((item, i) => <article key={item.title}><div className={`newsVisual v${i + 1}${item.image ? " hasImage" : ""}`}>{item.image && <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer"/>}<span>{String(i + 1).padStart(2, "0")}</span></div><p>{focusLabels[i]}<time>{item.date}</time></p><h3>{item.title}</h3><a href={item.url} target="_blank" rel="noreferrer">閱讀原文　→</a></article>)}</div></div>}

        {activeTab === "history" && <div className="hubPanel historyPanel" role="tabpanel"><div className="historyChart"><div className="chartTop"><div><p className="eyebrow">XAU / USD</p><h2>近一個月價格走勢</h2></div><div><strong>4,424.50</strong><span className="up">▲ 0.42%</span></div></div><div className="chart"><div className="gridLines"/><svg viewBox="0 0 320 170" preserveAspectRatio="none" aria-label="黃金價格走勢圖"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9a62e" stopOpacity=".38"/><stop offset="1" stopColor="#d9a62e" stopOpacity="0"/></linearGradient></defs><path d={`${path} L320 170 L0 170 Z`} fill="url(#fill)"/><path d={path} fill="none" stroke="#d9a62e" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx="320" cy="18" r="4" fill="#c9951c" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chartPriceTag">4,424.50</div><div className="yAxis" aria-hidden="true"><span>4,450</span><span>4,380</span><span>4,310</span><span>4,240</span></div><div className="xAxis" aria-hidden="true"><span>8/10</span><span>8/17</span><span>8/24</span><span>8/31</span><span>9/08</span></div></div><div className="periods">{["1D", "1W", "1M", "1Y"].map((p) => <button className={period === p ? "selected" : ""} onClick={() => setPeriod(p)} key={p}>{p}</button>)}</div></div><div className="historyBlock"><div className="historyHead"><div><p className="eyebrow">30-DAY HISTORY</p><h3>每日參考收盤價</h3></div><span>美元／盎司</span></div><div className="historyList"><div className="historyRow historyLabels"><span>日期</span><span>收盤價</span><span>日變動</span></div>{monthlyGoldHistory.map(([date, price, change]) => <div className="historyRow" key={date}><time>2026/{date}</time><strong>{price}</strong><em className={change.startsWith("−") ? "down" : "up"}>{change}</em></div>)}</div></div><p className="historyNote">近 30 日參考走勢，與即時報價可能略有差異；資料不作交易依據。</p></div>}

        {activeTab === "tools" && <div className="hubPanel proToolsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">GOLD TOOLKIT</p><h2>黃金工具中心</h2></div><p>支援台灣常用重量與純度</p></div><div className="toolWorkspace"><section className="toolForm"><div className="fieldGroup"><label htmlFor="toolWeight">黃金重量</label><div className="inputPair"><input id="toolWeight" type="number" min="0" step="0.01" inputMode="decimal" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)}/><select aria-label="重量單位" value={toolUnit} onChange={(event) => setToolUnit(event.target.value as typeof toolUnit)}><option value="qian">錢</option><option value="gram">公克</option><option value="tael">台兩</option><option value="ounce">金衡盎司</option></select></div></div><div className="fieldGroup"><label htmlFor="purity">黃金純度</label><select id="purity" value={purity} onChange={(event) => setPurity(event.target.value)}><option value="0.9999">9999 純金</option><option value="0.999">999 純金</option><option value="0.916">916／22K</option><option value="0.75">750／18K</option><option value="0.585">585／14K</option></select></div><div className="fieldGroup"><label htmlFor="purchasePrice">你的買入價（每錢）</label><div className="moneyInput"><span>NT$</span><input id="purchasePrice" type="number" min="0" step="100" inputMode="numeric" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)}/></div></div><p className="toolHint">純度換算採理論含金量，實際回收仍依店家檢測、耗損與手續費為準。</p></section><section className="toolResults" aria-live="polite"><div className="primaryResult"><span>預估回收價值</span><strong>NT$ {toolResult.recycleValue.toLocaleString("zh-TW")}</strong><small>以 999.9 買進價 NT$16,560／錢估算</small></div><div className="resultMetrics"><div><span>換算重量</span><strong>{toolResult.grams.toFixed(2)} g</strong></div><div><span>純金重量</span><strong>{toolResult.pureQian.toFixed(3)} 錢</strong></div><div><span>購入成本</span><strong>NT$ {toolResult.cost.toLocaleString("zh-TW")}</strong></div><div><span>目前損益</span><strong className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.gain >= 0 ? "+" : "−"}NT$ {Math.abs(toolResult.gain).toLocaleString("zh-TW")}</strong><small className={toolResult.gain >= 0 ? "up" : "down"}>{toolResult.roi >= 0 ? "+" : ""}{toolResult.roi.toFixed(2)}%</small></div></div></section></div><div className="professionalStrip"><div><span>銀樓買賣價差</span><strong>NT$ 700／錢</strong><small>賣出 17,260 − 買進 16,560</small></div><div><span>回本所需漲幅</span><strong>4.23%</strong><small>未計工費與其他成本</small></div><div><span>國際換算參考</span><strong>NT$ 16,896／錢</strong><small>依 XAU/USD 與匯率推算</small></div></div></div>}
      </section>

      <section className="tools marketRadar"><div><p className="eyebrow">MARKET RADAR</p><h2>今日市場<br/>快速判讀</h2></div><div className="tool"><span>國際理論價</span><strong>NT$ 16,896</strong><small>每錢・依現貨與匯率換算</small></div><div className="tool"><span>銀樓溢價</span><strong>+2.15%</strong><small>牌告賣出價相較理論價</small></div><div className="tool"><span>買賣價差</span><strong>NT$ 700</strong><small>每錢・未含工費</small></div><button onClick={() => { setActiveTab("tools"); window.scrollTo({ top: 92, behavior: "smooth" }); }}>開啟專業工具 <b>→</b></button></section>
      <div id="price-alerts" className="scrollAnchor"/>

      <section className="alertCenter"><div className="alertIntro"><p className="eyebrow">PERSONAL WATCHLIST</p><h2>我的到價標記</h2><p>設定你關注的價格，網站會保存在這台裝置，回來時可快速查看距離目標還有多少。</p></div><div className="alertComposer"><label><span>關注項目</span><select value={alertMarket} onChange={(event) => setAlertMarket(event.target.value as typeof alertMarket)}>{alertMarkets.map((market) => <option value={market.id} key={market.id}>{market.label}</option>)}</select></label><label><span>目標價格</span><div><input type="number" inputMode="decimal" min="0" value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)}/><small>{selectedAlertMarket.unit}</small></div></label><button onClick={savePriceAlert}>加入關注</button></div><div className="savedAlerts">{savedAlerts.length === 0 ? <div className="alertEmpty"><span>尚未設定</span><p>輸入目標價後即可建立你的個人關注清單。</p></div> : savedAlerts.map((item) => { const market = alertMarkets.find((entry) => entry.id === item.market) ?? alertMarkets[0]; const gap = item.target - market.value; return <article key={item.id}><div><span>{market.label}</span><small>目前 {market.value.toLocaleString("en-US")} {market.unit}</small></div><strong>{item.target.toLocaleString("en-US")}</strong><em className={gap >= 0 ? "watchUp" : "watchReached"}>{gap > 0 ? `距離目標 ${gap.toLocaleString("en-US")}` : "已達目標"}</em><button aria-label={`移除${market.label}到價標記`} onClick={() => removePriceAlert(item.id)}>×</button></article>; })}</div><p className="alertDisclaimer">此功能為裝置內的價格標記，不會發送系統推播；行情更新後可回到本站查看。</p></section>

      <footer><a className="brand" href="#top"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a><p>資料供投資與消費參考，不構成任何交易建議。</p><span>© 2026 GOLDEN TIDE</span></footer>
    </main>
  );
}
