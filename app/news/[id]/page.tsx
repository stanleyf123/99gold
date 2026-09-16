import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editorials } from "../editorial";
import EditorialView from "../EditorialView";
import OfficialBriefView from "../OfficialBriefView";
import type { Article } from "../../api/news-service";
import { getRawDb } from "../../../db";
import { asNewsCategory, type NewsCategory } from "../categories";
import { localizedBriefFields } from "../../../lib/news/translate";
import { DEFAULT_OG_IMAGE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, SITE_URL, languageAlternates } from "../../../lib/seo";
import { localizedHref } from "../../../lib/locale-path";
import { localeFromCandidates, requestLocale } from "../../../lib/request-locale";

export const dynamic = "force-dynamic";

const labels = {
  zh: { home: "返回首頁", note: "本則快訊已翻譯上架。", source: "閱讀原文", saved: "擷取時間", brief: "市場快訊" },
  en: { home: "Home", note: "This brief has been translated for publication.", source: "Read original", saved: "Retrieved", brief: "Market brief" },
  ja: { home: "ホーム", note: "この速報は翻訳して公開しています。", source: "原文を読む", saved: "取得日時", brief: "市場速報" },
};

type StoredBrief = {
  id: string;
  title: string;
  summary: string | null;
  canonical_url: string;
  category: string;
  source_published_at: string;
  published_at: string;
  source_language: string | null;
  title_zh: string | null;
  title_en: string | null;
  title_ja: string | null;
  summary_zh: string | null;
  summary_en: string | null;
  summary_ja: string | null;
  translation_provider: string | null;
};

function briefCategory(value?: string): NewsCategory {
  return asNewsCategory(value);
}

async function getLegacyArticle(id: string) {
  return getRawDb().prepare("SELECT * FROM news_articles WHERE id = ?").bind(id).first<Article>();
}

async function getPublishedBrief(id: string) {
  return getRawDb().prepare(`SELECT id, title, summary, canonical_url, category,
    source_published_at, published_at, source_language,
    title_zh, title_en, title_ja, summary_zh, summary_en, summary_ja, translation_provider
    FROM news_candidates
    WHERE id = ? AND status = 'published' AND published_at IS NOT NULL`)
    .bind(id).first<StoredBrief>();
}

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> },
): Promise<Metadata> {
  const id = (await params).id;
  const locale = localeFromCandidates((await searchParams).lang, await requestLocale());
  const article = editorials.find((a) => a.id === id);
  if (article) {
    return {
      title: article.title,
      description: article.description,
      alternates: {
        canonical: `${SITE_URL}/news/` + id,
        languages: Object.fromEntries(editorials.filter((a) => a.group === article.group).map((a) => [a.locale === "zh" ? "zh-Hant" : a.locale, `${SITE_URL}${localizedHref(`/news/${a.id}`, a.locale)}`])),
      },
      openGraph: { type: "article", title: article.title, description: article.description, images: [{ url: SITE_URL + article.image, width: 1536, height: 1024, alt: article.imageAlt }] },
      twitter: { title: article.title, description: article.description, images: [SITE_URL + article.image] },
    };
  }
  const brief = await getPublishedBrief(id);
  if (brief) {
    const localized = localizedBriefFields(brief, locale);
    const canonical = `${SITE_URL}${localizedHref(`/news/${id}`, locale)}`;
    return {
      title: localized.title,
      description: localized.summary ?? localized.title,
      alternates: {
        canonical,
        languages: languageAlternates(`/news/${id}`),
      },
      openGraph: { type: "article", title: localized.title, description: localized.summary ?? localized.title, url: canonical, images: [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: localized.title, type: "image/png" }] },
      twitter: { card: "summary_large_image", title: localized.title, description: localized.summary ?? localized.title, images: [DEFAULT_OG_IMAGE] },
    };
  }
  const row = await getLegacyArticle(id);
  if (!row) return { title: "Article unavailable", robots: { index: false } };
  const related = (await getRawDb().prepare("SELECT id,locale FROM news_articles WHERE source_url = ?").bind(row.source_url).all<{ id: string; locale: string }>()).results;
  return {
    title: row.title,
    description: row.body.slice(0, 150),
    alternates: { canonical: `${SITE_URL}/news/` + row.id, languages: Object.fromEntries(related.map((r) => [r.locale === "zh" ? "zh-Hant" : r.locale, `${SITE_URL}/news/` + r.id])) },
    openGraph: { title: row.title, description: row.body.slice(0, 150), images: [] },
    twitter: { title: row.title, description: row.body.slice(0, 150), images: [] },
  };
}

export default async function NewsArticle(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> },
) {
  const id = (await params).id;
  const locale = localeFromCandidates((await searchParams).lang, await requestLocale());
  const article = editorials.find((a) => a.id === id);
  if (article) return <EditorialView article={article} />;
  const brief = await getPublishedBrief(id);
  if (brief) {
    const localized = localizedBriefFields(brief, locale);
    return <OfficialBriefView
      locale={locale}
      id={brief.id}
      title={localized.title}
      summary={localized.summary}
      category={briefCategory(brief.category)}
      eventDate={brief.source_published_at.slice(0, 10)}
      publishedAt={brief.published_at}
      originalUrl={brief.canonical_url}
      translationLabel={localized.translationLabel}
      translationPending={localized.translationPending}
      translationPendingLabel={localized.translationPendingLabel}
    />;
  }
  const row = await getLegacyArticle(id);
  if (!row) notFound();
  const t = labels[row.locale];
  const structured = { "@context": "https://schema.org", "@type": "NewsArticle", headline: row.title, datePublished: row.published_at, inLanguage: row.locale === "zh" ? "zh-Hant" : row.locale };
  return (
    <main className="articlePage articleShell" lang={row.locale === "zh" ? "zh-Hant" : row.locale}>
      <article>
        <p className="articleKicker">{t.brief} · {row.published_at.slice(0, 10)}</p>
        <h1>{row.title}</h1>
        <p>{t.note}</p>
        {row.body.split(/\n\n+/).map((paragraph, index) => <p key={index} style={{ lineHeight: 1.9, marginBottom: "1.25rem" }}>{paragraph}</p>)}
        <p className="articleSource">{t.saved}: {row.fetched_at}<br /><a href={row.source_url} target="_blank" rel="noreferrer">{t.source} ↗</a></p>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    </main>
  );
}
