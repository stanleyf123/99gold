"use client";

import { useEffect, useMemo, useState } from "react";

const quotes = [
  { label: "國際現貨金", code: "XAU / USD", price: "4,424.50", unit: "美元／盎司", change: "+18.43", up: true },
  { label: "銀樓黃金買進", code: "999.9 純金", price: "16,560", unit: "台幣／錢", change: "+30", up: true },
  { label: "銀樓黃金賣出", code: "999.9 純金", price: "17,260", unit: "台幣／錢", change: "+30", up: true },
  { label: "美元匯率", code: "USD / TWD", price: "31.6858", unit: "新台幣", change: "−0.021", up: false },
];

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
  const [activeTab, setActiveTab] = useState<"quotes" | "news" | "history">("quotes");
  const [period, setPeriod] = useState("1M");
  const [goldWeight, setGoldWeight] = useState("1.00");
  const [resultOpen, setResultOpen] = useState(false);
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
  const path = useMemo(() => {
    const shapes: Record<string, string> = {
      "1D": "M0 140 C28 126 48 140 70 112 S118 110 142 90 S190 99 218 55 S273 86 320 33",
      "1W": "M0 141 C22 135 43 104 68 116 S113 84 143 95 S188 62 219 73 S270 33 320 29",
      "1M": "M0 148 C22 134 45 135 67 103 S111 128 142 86 S185 105 213 63 S271 88 320 18",
      "1Y": "M0 151 C28 148 45 112 70 124 S112 71 141 101 S181 112 211 54 S265 98 320 13",
    };
    return shapes[period];
  }, [period]);
  const estimatedRecycleValue = useMemo(() => {
    const weight = Number.parseFloat(goldWeight);
    return Number.isFinite(weight) && weight >= 0 ? Math.round(weight * 16560) : 0;
  }, [goldWeight]);

  return (
    <main>
      <div className="topline"><span>市場開盤中</span><span>最後更新 2026.09.08　10:28 (GMT+8)</span></div>
      <nav className="nav">
        <a className="brand" href="/"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a>
        <div className="navlinks"><a className="active" href="/#quotes">今日金價</a><a href="/international">國際金價</a><a href="/jewelry">銀樓價格</a><a href="/recycling">黃金回收</a><a href="/insights">市場情報</a></div>
        <button className="menu" aria-label="開啟選單">☰</button>
      </nav>

      <section className="marketHub" id="top"><div className="hubLead"><div><p className="eyebrow">GOLD MARKET DASHBOARD</p><h1>今日黃金資訊</h1><p>報價、新聞與近一個月走勢集中在這裡，點選分頁即可切換。</p></div><div className="hubPrice"><span>國際現貨金・XAU/USD</span><strong>4,424.50</strong><em className="up">▲ 18.43　0.42%</em></div></div><div className="marketTabs" role="tablist" aria-label="黃金資訊分類"><button role="tab" aria-selected={activeTab === "quotes"} className={activeTab === "quotes" ? "active" : ""} onClick={() => setActiveTab("quotes")}>即時報價</button><button role="tab" aria-selected={activeTab === "news"} className={activeTab === "news" ? "active" : ""} onClick={() => setActiveTab("news")}>市場新聞</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>歷史金價</button></div>

        {activeTab === "quotes" && <div className="hubPanel" role="tabpanel" id="quotes"><div className="panelHeading"><div><p className="eyebrow">LIVE MARKET</p><h2>即時報價</h2></div><p>最後更新 2026.09.08 10:28（GMT+8）</p></div><div className="quoteGrid">{quotes.map((q) => <article className="quoteCard" key={q.label}><div><p>{q.label}</p><span>{q.code}</span></div><strong>{q.price}</strong><div className="quoteFoot"><span>{q.unit}</span><b className={q.up ? "up" : "down"}>{q.up ? "▲" : "▼"} {q.change}</b></div></article>)}</div><div className="marketSummary"><div><span>今日高點</span><strong>4,438.20</strong></div><div><span>今日低點</span><strong>4,392.10</strong></div><div><span>今日振幅</span><strong>1.05%</strong></div><div><span>市場狀態</span><strong>偏多震盪</strong></div></div><p className="panelNote">報價僅供參考，實際成交價格請以各通路公告為準。</p></div>}

        {activeTab === "news" && <div className="hubPanel newsPanel" role="tabpanel"><div className="panelHeading"><div><p className="eyebrow">TODAY&apos;S MARKET FOCUS</p><h2>今日市場焦點</h2></div><p>{newsUpdated}</p></div><p className="panelIntro">整理可能影響金價的三個關鍵面向：黃金行情、美元走勢與聯準會政策。</p><div className="newsGrid">{news.slice(0, 3).map((item, i) => <article key={item.title}><div className={`newsVisual v${i + 1}${item.image ? " hasImage" : ""}`}>{item.image && <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer"/>}<span>{String(i + 1).padStart(2, "0")}</span></div><p>{focusLabels[i]}<time>{item.date}</time></p><h3>{item.title}</h3><a href={item.url} target="_blank" rel="noreferrer">閱讀原文　→</a></article>)}</div></div>}

        {activeTab === "history" && <div className="hubPanel historyPanel" role="tabpanel"><div className="historyChart"><div className="chartTop"><div><p className="eyebrow">XAU / USD</p><h2>近一個月價格走勢</h2></div><div><strong>4,424.50</strong><span className="up">▲ 0.42%</span></div></div><div className="chart"><div className="gridLines"/><svg viewBox="0 0 320 170" preserveAspectRatio="none" aria-label="黃金價格走勢圖"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9a62e" stopOpacity=".38"/><stop offset="1" stopColor="#d9a62e" stopOpacity="0"/></linearGradient></defs><path d={`${path} L320 170 L0 170 Z`} fill="url(#fill)"/><path d={path} fill="none" stroke="#d9a62e" strokeWidth="3" vectorEffect="non-scaling-stroke"/><circle cx="320" cy="18" r="4" fill="#c9951c" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chartPriceTag">4,424.50</div><div className="yAxis" aria-hidden="true"><span>4,450</span><span>4,380</span><span>4,310</span><span>4,240</span></div><div className="xAxis" aria-hidden="true"><span>8/10</span><span>8/17</span><span>8/24</span><span>8/31</span><span>9/08</span></div></div><div className="periods">{["1D", "1W", "1M", "1Y"].map((p) => <button className={period === p ? "selected" : ""} onClick={() => setPeriod(p)} key={p}>{p}</button>)}</div></div><div className="historyBlock"><div className="historyHead"><div><p className="eyebrow">30-DAY HISTORY</p><h3>每日參考收盤價</h3></div><span>美元／盎司</span></div><div className="historyList"><div className="historyRow historyLabels"><span>日期</span><span>收盤價</span><span>日變動</span></div>{monthlyGoldHistory.map(([date, price, change]) => <div className="historyRow" key={date}><time>2026/{date}</time><strong>{price}</strong><em className={change.startsWith("−") ? "down" : "up"}>{change}</em></div>)}</div></div><p className="historyNote">近 30 日參考走勢，與即時報價可能略有差異；資料不作交易依據。</p></div>}
      </section>

      <section className="tools"><div><p className="eyebrow">SMART TOOLS</p><h2>換算你的<br/>黃金價值</h2></div><label className="tool weightInput"><span>黃金重量</span><strong><input type="number" inputMode="decimal" min="0" step="0.01" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)} aria-label="黃金重量（錢）"/> <small>錢</small></strong></label><div className="tool priceResult"><span>預估回收價</span><strong>NT$ {estimatedRecycleValue.toLocaleString("zh-TW")}</strong><small>依每錢 NT$16,560 試算</small></div><button onClick={() => { (document.activeElement as HTMLElement | null)?.blur(); setResultOpen(true); }}>查看試算結果 <b>→</b></button></section>
      {resultOpen && <div className="resultOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResultOpen(false); }}><section className="resultDialog" role="dialog" aria-modal="true" aria-labelledby="resultTitle"><button className="dialogClose" aria-label="關閉試算結果" onClick={() => setResultOpen(false)}>×</button><div className="resultMark">✓</div><p className="eyebrow">GOLD VALUE RESULT</p><h2 id="resultTitle">黃金價值試算</h2><div className="resultRows"><div><span>黃金重量</span><strong>{goldWeight || "0"} 錢</strong></div><div><span>每錢參考價</span><strong>NT$ 16,560</strong></div></div><div className="resultTotal"><span>預估回收價</span><strong>NT$ {estimatedRecycleValue.toLocaleString("zh-TW")}</strong></div><p className="resultNote">此金額為參考試算，實際價格依各通路當下報價為準。</p><button className="dialogConfirm" onClick={() => setResultOpen(false)}>完成</button></section></div>}

      <footer><a className="brand" href="#top"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a><p>資料供投資與消費參考，不構成任何交易建議。</p><span>© 2026 GOLDEN TIDE</span></footer>
    </main>
  );
}
