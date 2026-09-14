import { notFound } from "next/navigation";
import Link from "next/link";

const pages = {
  international: ["GLOBAL SPOT MARKET", "國際金價", "追蹤 XAU/USD 現貨價格與主要貴金屬市場的盤中脈動。", "4,424.50", "美元／盎司", "+18.43　+0.42%", [["紐約黃金期貨", "4,430.20", "美元／盎司", "+0.38%"], ["國際白銀", "54.31", "美元／盎司", "+1.12%"], ["美元指數", "97.48", "DXY", "−0.07%"]], "價格以國際市場報價為參考；受到匯率、利率預期與市場情緒影響，盤中價格可能快速變動。"],
  jewelry: ["TAIWAN JEWELRY PRICE", "今日銀樓價格", "快速比較常見黃金飾品與金條的銀樓牌價，掌握買進、賣出的參考區間。", "17,260", "999.9 黃金賣出／台幣・錢", "+30　+0.17%", [["999.9 黃金買進", "16,560", "台幣／錢", "+30"], ["999.9 黃金賣出", "17,260", "台幣／錢", "+30"], ["白金 PT950", "4,100", "台幣／錢", "持平"]], "各銀樓的加工費、品牌與地區可能不同，實際交易前請向門市確認最終報價。"],
  recycling: ["GOLD RECYCLING GUIDE", "黃金回收", "用透明的參考價與步驟，協助你評估舊金飾、金條與紀念金幣的回收價值。", "16,560", "999.9 黃金參考回收／台幣・錢", "+30　今日更新", [["999.9 純金", "16,560", "台幣／錢", "高純度"], ["916 黃金", "15,180", "台幣／錢", "22K"], ["750 黃金", "12,420", "台幣／錢", "18K"]], "回收時建議攜帶身分證件，並確認秤重單位、純度檢測方式與是否扣除耗損費用。"],
  insights: ["GOLD INSIGHTS", "市場情報", "將價格變動放回宏觀環境中理解，掌握影響黃金的三個關鍵指標。", "偏多震盪", "本週市場觀點", "利率決議前波動升高", [["美元匯率", "31.6858", "USD / TWD", "小幅回落"], ["美債殖利率", "4.02%", "10 年期", "市場關注"], ["避險需求", "升溫", "市場情緒", "正向"]], "所有內容僅為市場資訊整理，不構成投資、交易或任何形式的建議。"],
} as const;

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section as keyof typeof pages];
  if (!page) notFound();
  const [eyebrow, title, , , unit, , cards, note] = page;
  return (
    <main className="subpage">
      <div className="topline"><span>資料來源校正中</span><span>未連接有效行情時不顯示數字</span></div>
      <section className="subHero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>此頁尚無可驗證的即時資料。請至全球報價查看附來源的期貨參考，銀樓成交價請直接向店家確認。</p>
        <div className="subStat"><span>{unit}</span><strong>—</strong><b>尚無有效資料</b></div>
      </section>
      <section className="subContent">
        <div className="sectionHead">
          <div><p className="eyebrow">TODAY&apos;S REFERENCE</p><h2>重點數據</h2></div>
          <p>最後更新時間以頁面顯示為準。</p>
        </div>
        <div className="subCards">{cards.map(([name, , cardUnit]) => <article key={name}><p>{name}</p><strong>—</strong><span>{cardUnit}</span><b>尚無有效資料</b></article>)}</div>
        <div className="guide">
          <span>玖久黃金報價網提示</span>
          <p>{note}</p>
          <Link href="/#quotes">回到即時報價　→</Link>
        </div>
      </section>
      <footer>
        <Link className="brand" href="/"><i>99</i><span>玖久黃金報價網<br/><em>99GOLD.NET</em></span></Link>
        <p>真金價值，長久相伴。</p>
        <span>© 2026 玖久黃金報價網</span>
      </footer>
    </main>
  );
}
