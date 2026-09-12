import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type Article = { id: number | string; title: string; original_title: string | null; summary: string | null; url: string; source_name: string | null; source_url: string | null; source_language: string | null; article_date: string; image: string | null; fetched_at: string };

const fallbackArticles: Record<string, Article> = {
  "gold-market": { id: "gold-market", title: "今日黃金市場重點", original_title: null, summary: "黃金價格主要受到美元走勢、實質利率、央行政策與避險需求影響。最新自動新聞正在更新時，可先搭配本站即時金價與一個月走勢判斷市場方向。", url: "https://news.google.com/search?q=%E9%BB%83%E9%87%91&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", source_name: "國際新聞彙整", source_url: null, source_language: "zh", article_date: "即時", image: null, fetched_at: "" },
  "dollar-market": { id: "dollar-market", title: "美元指數與黃金價格關係", original_title: null, summary: "美元走強通常會提高非美元投資人購買黃金的成本，進而對金價形成壓力；美元轉弱時則可能提供支撐。實際走勢仍需同時觀察利率與避險資金。", url: "https://news.google.com/search?q=%E7%BE%8E%E5%85%83%E6%8C%87%E6%95%B8&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", source_name: "國際新聞彙整", source_url: null, source_language: "zh", article_date: "即時", image: null, fetched_at: "" },
  "fed-rates": { id: "fed-rates", title: "聯準會利率決策觀察", original_title: null, summary: "聯準會的升降息預期會影響美元與美債殖利率，進而牽動黃金的持有成本。市場通常也會關注會後聲明、通膨數據與官員談話。", url: "https://news.google.com/search?q=%E8%81%AF%E6%BA%96%E6%9C%83%20%E5%88%A9%E7%8E%87&hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant", source_name: "國際新聞彙整", source_url: null, source_language: "zh", article_date: "即時", image: null, fetched_at: "" },
};

async function getArticle(id: string) {
  if (!/^\d+$/.test(id)) return fallbackArticles[id] ?? null;
  return await env.DB.prepare("SELECT id, title, original_title, summary, url, source_name, source_url, source_language, article_date, image, fetched_at FROM daily_news WHERE id = ? LIMIT 1").bind(Number(id)).first<Article>();
}

function sourceName(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "原始新聞來源"; } }
function fallbackSummary(title: string) { return `本則市場新聞聚焦於「${title}」。黃金價格通常會受到美元走勢、利率預期、避險需求與全球金融市場情緒影響；完整事實與細節請以原始報導為準。`; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const article = await getArticle((await params).id);
  return article ? { title: `${article.title}｜黃金市場新聞`, description: (article.summary || fallbackSummary(article.title)).slice(0, 155), alternates: { canonical: `/news/${article.id}` } } : { title: "市場新聞" };
}

export default async function NewsArticle({ params }: { params: Promise<{ id: string }> }) {
  const article = await getArticle((await params).id);
  if (!article) notFound();
  return <main className="articlePage"><nav className="articleNav"><a href="/">玖久黃金報價網</a><a href="/#top">返回黃金資訊</a></nav><article><p className="articleKicker">GOLD MARKET NEWS · {article.article_date}</p><h1>{article.title}</h1>{article.original_title && article.original_title !== article.title && <p className="articleOriginal">原文標題：{article.original_title}</p>}{article.image && <img src={article.image} alt="" referrerPolicy="no-referrer"/>}<section><h2>本站翻譯摘要</h2><p>{article.summary || fallbackSummary(article.title)}</p></section><section><h2>與金價的關聯</h2><p>黃金不會只由單一事件決定方向。請搭配本站即時報價、美元匯率與近期走勢觀察；如涉及交易或回收，仍應以實際報價與個人風險承受度為準。</p></section><p className="articleSource">新聞日期：{article.article_date}　｜　資料來源：{article.source_name || sourceName(article.url)}　<a href={article.url} target="_blank" rel="noreferrer">查看原始報導 ↗</a></p></article></main>;
}
