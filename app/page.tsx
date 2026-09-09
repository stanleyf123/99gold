"use client";

import { useEffect, useMemo, useState } from "react";

const quotes = [
  { label: "國際現貨金", code: "XAU / USD", price: "4,424.50", unit: "美元／盎司", change: "+18.43", up: true },
  { label: "銀樓黃金買進", code: "999.9 純金", price: "16,560", unit: "台幣／錢", change: "+30", up: true },
  { label: "銀樓黃金賣出", code: "999.9 純金", price: "17,260", unit: "台幣／錢", change: "+30", up: true },
  { label: "美元匯率", code: "USD / TWD", price: "31.6858", unit: "新台幣", change: "−0.021", up: false },
];

type NewsItem = { title: string; date: string; url: string };

const fallbackNews: NewsItem[] = [
  { title: "查看最新黃金市場消息", date: "即時", url: "https://news.google.com/search?q=%E9%BB%83%E9%87%91&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant" },
  { title: "查看美元指數最新消息", date: "即時", url: "https://news.google.com/search?q=%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant" },
  { title: "查看聯準會利率決策消息", date: "即時", url: "https://news.google.com/search?q=%E8%81%AF%E6%BA%96%E6%9C%83%20%E5%88%A9%E7%8E%87&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant" },
];

export default function Home() {
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

      <section className="hero" id="top">
        <div className="heroCopy"><p className="eyebrow">TAIWAN GOLD PRICE DESK</p><h1>掌握黃金的<br/><span>每一刻價值</span></h1><p className="intro">彙整國際金價、台灣銀樓價格與市場訊號，讓每次買賣都有更清楚的依據。</p><div className="heroActions"><a href="#quotes">查看即時報價 <b>↓</b></a><button onClick={() => alert("提醒已設定：我們將在報價變動時通知您。")}>設定價格提醒</button></div></div>
        <div className="heroOrb" aria-hidden="true"><div className="orbLine one"/><div className="orbLine two"/><div className="orbLine three"/><span>AU<br/><small>79</small></span></div>
        <div className="heroMeta"><span>今日金市</span><strong>+0.42%</strong><small>行情偏多震盪</small></div>
      </section>

      <section className="quoteSection" id="quotes"><div className="sectionHead"><div><p className="eyebrow">LIVE MARKET</p><h2>即時報價</h2></div><p>報價僅供參考，實際成交價格請以各通路公告為準。</p></div><div className="quoteGrid">{quotes.map((q) => <article className="quoteCard" key={q.label}><div><p>{q.label}</p><span>{q.code}</span></div><strong>{q.price}</strong><div className="quoteFoot"><span>{q.unit}</span><b className={q.up ? "up" : "down"}>{q.up ? "▲" : "▼"} {q.change}</b></div></article>)}</div></section>

      <section className="marketWrap"><div className="chartCard"><div className="chartTop"><div><p className="eyebrow">XAU / USD</p><h2>國際現貨黃金</h2></div><div><strong>4,424.50</strong><span className="up">▲ 18.43　0.42%</span></div></div><div className="chart"><div className="gridLines"/><svg viewBox="0 0 320 170" preserveAspectRatio="none" aria-label="黃金價格走勢圖"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9a62e" stopOpacity=".38"/><stop offset="1" stopColor="#d9a62e" stopOpacity="0"/></linearGradient></defs><path d={`${path} L320 170 L0 170 Z`} fill="url(#fill)"/><path d={path} fill="none" stroke="#d9a62e" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg></div><div className="periods">{["1D", "1W", "1M", "1Y"].map((p) => <button className={period === p ? "selected" : ""} onClick={() => setPeriod(p)} key={p}>{p}</button>)}</div></div>
        <aside className="signalCard"><p className="eyebrow">DAILY GOLD NEWS</p><h2>今日觀察</h2>{news.slice(0, 2).map((item, index) => <div className="signal" key={item.title}><span>0{index + 1}</span>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <p>{item.title}</p>}</div>)}<a href="#insights">查看最新黃金新聞 <b>→</b></a></aside></section>

      <section className="tools"><div><p className="eyebrow">SMART TOOLS</p><h2>換算你的<br/>黃金價值</h2></div><label className="tool weightInput"><span>黃金重量</span><strong><input type="number" inputMode="decimal" min="0" step="0.01" value={goldWeight} onChange={(event) => setGoldWeight(event.target.value)} aria-label="黃金重量（錢）"/> <small>錢</small></strong></label><div className="tool priceResult"><span>預估回收價</span><strong>NT$ {estimatedRecycleValue.toLocaleString("zh-TW")}</strong><small>依每錢 NT$16,560 試算</small></div><button onClick={() => { (document.activeElement as HTMLElement | null)?.blur(); setResultOpen(true); }}>查看試算結果 <b>→</b></button></section>
      {resultOpen && <div className="resultOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResultOpen(false); }}><section className="resultDialog" role="dialog" aria-modal="true" aria-labelledby="resultTitle"><button className="dialogClose" aria-label="關閉試算結果" onClick={() => setResultOpen(false)}>×</button><div className="resultMark">✓</div><p className="eyebrow">GOLD VALUE RESULT</p><h2 id="resultTitle">黃金價值試算</h2><div className="resultRows"><div><span>黃金重量</span><strong>{goldWeight || "0"} 錢</strong></div><div><span>每錢參考價</span><strong>NT$ 16,560</strong></div></div><div className="resultTotal"><span>預估回收價</span><strong>NT$ {estimatedRecycleValue.toLocaleString("zh-TW")}</strong></div><p className="resultNote">此金額為參考試算，實際價格依各通路當下報價為準。</p><button className="dialogConfirm" onClick={() => setResultOpen(false)}>完成</button></section></div>}

      <section className="insights" id="insights"><div className="sectionHead"><div><p className="eyebrow">DAILY GOLD NEWS</p><h2>最新黃金新聞</h2></div><p>{newsUpdated}</p></div><div className="newsGrid">{news.map((item, i) => <article key={item.title}><div className={`newsVisual v${i + 1}`}><span>{String(i + 1).padStart(2, "0")}</span></div><p>黃金市場<time>{item.date}</time></p><h3>{item.title}</h3>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">閱讀原文　→</a> : <span className="loadingNews">載入中</span>}</article>)}</div></section>
      <footer><a className="brand" href="#top"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a><p>資料供投資與消費參考，不構成任何交易建議。</p><span>© 2026 GOLDEN TIDE</span></footer>
    </main>
  );
}
