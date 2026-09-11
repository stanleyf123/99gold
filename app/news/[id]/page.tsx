import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type Article = { id: number; title: string; url: string; article_date: string; image: string | null; fetched_at: string };

async function getArticle(id: string) {
  if (!/^\d+$/.test(id)) return null;
  return await env.DB.prepare("SELECT id, title, url, article_date, image, fetched_at FROM daily_news WHERE id = ? LIMIT 1").bind(Number(id)).first<Article>();
}

function sourceName(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "原始新聞來源"; } }
function summary(title: string) { return `本則市場新聞聚焦於「${title}」。黃金價格通常會受到美元走勢、利率預期、避險需求與全球金融市場情緒影響；閱讀時可留意事件是否改變這些因素。本頁提供玖久黃金的重點整理，完整事實與細節請以原始報導為準。`; }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const article = await getArticle((await params).id);
  return article ? { title: `${article.title}｜黃金市場新聞`, description: summary(article.title).slice(0, 155), alternates: { canonical: `/news/${article.id}` } } : { title: "市場新聞" };
}

export default async function NewsArticle({ params }: { params: Promise<{ id: string }> }) {
  const article = await getArticle((await params).id);
  if (!article) notFound();
  return <main className="articlePage"><nav className="articleNav"><a href="/">玖久黃金報價網</a><a href="/#top">返回黃金資訊</a></nav><article><p className="articleKicker">GOLD MARKET NEWS · {article.article_date}</p><h1>{article.title}</h1>{article.image && <img src={article.image} alt="" referrerPolicy="no-referrer"/>}<section><h2>市場重點整理</h2><p>{summary(article.title)}</p></section><section><h2>與金價的關聯</h2><p>黃金不會只由單一事件決定方向。請搭配本站即時報價、美元匯率與近期走勢觀察；如涉及交易或回收，仍應以實際報價與個人風險承受度為準。</p></section><p className="articleSource">新聞日期：{article.article_date}　｜　資料來源：<a href={article.url} target="_blank" rel="noreferrer">{sourceName(article.url)} 原始報導</a></p></article></main>;
}
