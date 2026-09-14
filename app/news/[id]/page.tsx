import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { editorials } from "../editorial";
import EditorialView from "../EditorialView";
import type { Article } from "../../api/news-service";
import SiteHeader, { type Locale } from "../../SiteHeader";

export const dynamic = "force-dynamic";

const labels = {
  zh: { home: "返回首頁", note: "聯準會官方公告・機器翻譯，請以英文原文為準。", source: "官方原文", saved: "擷取時間" },
  en: { home: "Home", note: "Official Federal Reserve release. The English source is authoritative.", source: "Official source", saved: "Retrieved" },
  ja: { home: "ホーム", note: "連邦準備制度の公式発表・機械翻訳。英語原文をご確認ください。", source: "公式原文", saved: "取得日時" },
};

async function getArticle(id: string) {
  return env.DB.prepare("SELECT * FROM news_articles WHERE id = ?").bind(id).first<Article>();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const article = editorials.find((a) => a.id === id);
  if (article) {
    return {
      title: article.title,
      description: article.description,
      alternates: {
        canonical: "https://99gold.net/news/" + id,
        languages: Object.fromEntries(editorials.filter((a) => a.group === article.group).map((a) => [a.locale === "zh" ? "zh-Hant" : a.locale, "https://99gold.net/news/" + a.id])),
      },
      openGraph: { type: "article", title: article.title, description: article.description, images: [{ url: "https://99gold.net" + article.image, width: 1536, height: 1024, alt: article.imageAlt }] },
      twitter: { title: article.title, description: article.description, images: ["https://99gold.net" + article.image] },
    };
  }
  const row = await getArticle(id);
  if (!row) return { title: "Article unavailable", robots: { index: false } };
  const related = (await env.DB.prepare("SELECT id,locale FROM news_articles WHERE source_url = ?").bind(row.source_url).all<{ id: string; locale: string }>()).results;
  return {
    title: row.title,
    description: row.body.slice(0, 150),
    alternates: { canonical: "https://99gold.net/news/" + row.id, languages: Object.fromEntries(related.map((r) => [r.locale === "zh" ? "zh-Hant" : r.locale, "https://99gold.net/news/" + r.id])) },
    openGraph: { title: row.title, description: row.body.slice(0, 150), images: [] },
    twitter: { title: row.title, description: row.body.slice(0, 150), images: [] },
  };
}

export default async function NewsArticle({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const article = editorials.find((a) => a.id === id);
  if (article) return <EditorialView article={article} />;
  const row = await getArticle(id);
  if (!row) notFound();
  const t = labels[row.locale];
  const related = (await env.DB.prepare("SELECT id,locale FROM news_articles WHERE source_url = ?").bind(row.source_url).all<{ id: string; locale: string }>()).results;
  const localeHrefs = Object.fromEntries(related.map((item) => [item.locale, `/news/${item.id}`])) as Partial<Record<Locale, string>>;
  const structured = { "@context": "https://schema.org", "@type": "NewsArticle", headline: row.title, datePublished: row.published_at, inLanguage: row.locale === "zh" ? "zh-Hant" : row.locale, isBasedOn: row.source_url };
  return (
    <>
      <SiteHeader locale={row.locale} localeHrefs={localeHrefs} />
      <main className="articlePage articleShell" lang={row.locale === "zh" ? "zh-Hant" : row.locale}>
        <article>
          <p className="articleKicker">FEDERAL RESERVE · {row.published_at.slice(0, 10)}</p>
          <h1>{row.title}</h1>
          <p>{t.note}</p>
          {row.body.split(/\n\n+/).map((paragraph, index) => <p key={index} style={{ lineHeight: 1.9, marginBottom: "1.25rem" }}>{paragraph}</p>)}
          <p className="articleSource">{t.saved}: {row.fetched_at}<br /><a href={row.source_url} target="_blank" rel="noreferrer">{t.source} ↗</a></p>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
      </main>
    </>
  );
}
