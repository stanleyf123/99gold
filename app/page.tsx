"use client";

import { useMemo, useState } from "react";

const quotes = [
  { label: "國際現貨金", code: "XAU / USD", price: "4,424.50", unit: "美元／盎司", change: "+18.43", up: true },
  { label: "銀樓黃金買進", code: "999.9 純金", price: "16,560", unit: "台幣／錢", change: "+30", up: true },
  { label: "銀樓黃金賣出", code: "999.9 純金", price: "17,260", unit: "台幣／錢", change: "+30", up: true },
  { label: "美元匯率", code: "USD / TWD", price: "31.6858", unit: "新台幣", change: "−0.021", up: false },
];

const news = [
  ["市場焦點", "美元走弱，亞洲黃金現貨價盤中上揚"],
  ["投資觀點", "利率訊號轉向，金價的下一步如何解讀？"],
  ["黃金知識", "黃金存摺、金條與飾金：入門比較一次看懂"],
];

export default function Home() {
  const [active, setActive] = useState("今日金價");
  const [period, setPeriod] = useState("1M");
  const path = useMemo(() => {
    const shapes: Record<string, string> = {
      "1D": "M0 140 C28 126 48 140 70 112 S118 110 142 90 S190 99 218 55 S273 86 320 33",
      "1W": "M0 141 C22 135 43 104 68 116 S113 84 143 95 S188 62 219 73 S270 33 320 29",
      "1M": "M0 148 C22 134 45 135 67 103 S111 128 142 86 S185 105 213 63 S271 88 320 18",
      "1Y": "M0 151 C28 148 45 112 70 124 S112 71 141 101 S181 112 211 54 S265 98 320 13",
    };
    return shapes[period];
  }, [period]);

  return (
    <main>
      <div className="topline"><span>市場開盤中</span><span>最後更新 2026.09.08　10:28 (GMT+8)</span></div>
      <nav className="nav">
        <a className="brand" href="#top"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a>
        <div className="navlinks">{["今日金價", "國際金價", "銀樓價格", "黃金回收", "市場情報"].map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{item}</button>)}</div>
        <button className="menu" aria-label="開啟選單">☰</button>
      </nav>

      <section className="hero" id="top">
        <div className="heroCopy"><p className="eyebrow">TAIWAN GOLD PRICE DESK</p><h1>掌握黃金的<br/><span>每一刻價值</span></h1><p className="intro">彙整國際金價、台灣銀樓價格與市場訊號，讓每次買賣都有更清楚的依據。</p><div className="heroActions"><a href="#quotes">查看即時報價 <b>↓</b></a><button onClick={() => alert("提醒已設定：我們將在報價變動時通知您。")}>設定價格提醒</button></div></div>
        <div className="heroOrb" aria-hidden="true"><div className="orbLine one"/><div className="orbLine two"/><div className="orbLine three"/><span>AU<br/><small>79</small></span></div>
        <div className="heroMeta"><span>今日金市</span><strong>+0.42%</strong><small>行情偏多震盪</small></div>
      </section>

      <section className="quoteSection" id="quotes"><div className="sectionHead"><div><p className="eyebrow">LIVE MARKET</p><h2>即時報價</h2></div><p>報價僅供參考，實際成交價格請以各通路公告為準。</p></div><div className="quoteGrid">{quotes.map((q) => <article className="quoteCard" key={q.label}><div><p>{q.label}</p><span>{q.code}</span></div><strong>{q.price}</strong><div className="quoteFoot"><span>{q.unit}</span><b className={q.up ? "up" : "down"}>{q.up ? "▲" : "▼"} {q.change}</b></div></article>)}</div></section>

      <section className="marketWrap"><div className="chartCard"><div className="chartTop"><div><p className="eyebrow">XAU / USD</p><h2>國際現貨黃金</h2></div><div><strong>4,424.50</strong><span className="up">▲ 18.43　0.42%</span></div></div><div className="chart"><div className="gridLines"/><svg viewBox="0 0 320 170" preserveAspectRatio="none" aria-label="黃金價格走勢圖"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9a62e" stopOpacity=".38"/><stop offset="1" stopColor="#d9a62e" stopOpacity="0"/></linearGradient></defs><path d={`${path} L320 170 L0 170 Z`} fill="url(#fill)"/><path d={path} fill="none" stroke="#d9a62e" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg></div><div className="periods">{["1D", "1W", "1M", "1Y"].map((p) => <button className={period === p ? "selected" : ""} onClick={() => setPeriod(p)} key={p}>{p}</button>)}</div></div>
        <aside className="signalCard"><p className="eyebrow">MARKET SIGNAL</p><h2>今日觀察</h2><div className="signal"><span>01</span><p>美元指數小幅回落，為貴金屬帶來支撐。</p></div><div className="signal"><span>02</span><p>市場等待利率決議，短線波動可能放大。</p></div><a href="#insights">閱讀市場情報 <b>→</b></a></aside></section>

      <section className="tools"><div><p className="eyebrow">SMART TOOLS</p><h2>換算你的<br/>黃金價值</h2></div><div className="tool"><span>黃金重量</span><strong>1.00 <small>錢</small></strong></div><div className="tool"><span>參考回收價</span><strong>NT$ 16,560</strong></div><button onClick={() => alert("試算完成：1 錢黃金的參考回收價為 NT$16,560。")}>開始試算 <b>→</b></button></section>

      <section className="insights" id="insights"><div className="sectionHead"><div><p className="eyebrow">GOLD INSIGHTS</p><h2>市場情報</h2></div><a href="#top">全部文章 →</a></div><div className="newsGrid">{news.map(([type, title], i) => <article key={title}><div className={`newsVisual v${i + 1}`}><span>{String(i + 1).padStart(2, "0")}</span></div><p>{type}<time>2026.09.08</time></p><h3>{title}</h3><a href="#top">閱讀更多　→</a></article>)}</div></section>
      <footer><a className="brand" href="#top"><i>G</i><span>金澤<br/><em>GOLDEN TIDE</em></span></a><p>資料供投資與消費參考，不構成任何交易建議。</p><span>© 2026 GOLDEN TIDE</span></footer>
    </main>
  );
}
