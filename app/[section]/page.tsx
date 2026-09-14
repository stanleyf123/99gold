import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getGlobalQuotes, type GlobalQuotes } from "../../lib/quotes";
import { buildSectionView, formatTaipeiTime, marketStatusLabel, type SectionName } from "../../lib/section-quotes";

export const dynamic = "force-dynamic";

const sections = ["international", "jewelry", "recycling"] as const;

function isSection(value: string): value is SectionName {
  return (sections as readonly string[]).includes(value);
}

async function loadQuotes(): Promise<GlobalQuotes | null> {
  try {
    return await getGlobalQuotes();
  } catch {
    return null;
  }
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "insights") redirect("/news");
  if (!isSection(section)) notFound();

  const quotes = await loadQuotes();
  const page = buildSectionView(section, quotes);
  const quotedLabel = quotes ? formatTaipeiTime(quotes.quotedAt) : "";
  const checkLabel = quotes ? formatTaipeiTime(quotes.retrievedAt) : "";
  const status = marketStatusLabel(quotes?.marketStatus, page.connected);

  return (
    <main className="subpage">
      <div className="topline">
        <span>{status}</span>
        <span>
          {page.connected
            ? `行情時間 ${quotedLabel} · 本站檢查 ${checkLabel} (GMT+8)`
            : "未連接有效行情時不顯示數字"}
        </span>
      </div>
      <section className="subHero">
        <p className="eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <div className="subStat"><span>{page.unit}</span><strong>{page.price}</strong><b>{page.change}</b></div>
      </section>
      <section className="subContent">
        <div className="sectionHead">
          <div><p className="eyebrow">TODAY&apos;S REFERENCE</p><h2>重點數據</h2></div>
          <p>{page.connected ? `行情時間 ${quotedLabel}（GMT+8）` : "最後更新時間以頁面顯示為準。"}</p>
        </div>
        <div className="subCards">{page.cards.map((card) => <article key={card.name}><p>{card.name}</p><strong>{card.price}</strong><span>{card.unit}</span><b>{card.change}</b></article>)}</div>
        <div className="guide">
          <span>玖久黃金報價網提示</span>
          <p>{page.note}</p>
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
