import type { Metadata } from "next";
import { getRawDb } from "../../db";
import Link from "next/link";
import JsonLd from "../JsonLd";
import SiteLinks from "../SiteLinks";
import { getDailyGoldNews } from "../api/news-service";
import { recentEditorials, type NewsLocale } from "./editorial";
import { editorialLabels } from "./EditorialView";
import { categories } from "./categories";
import CoverImage from "../CoverImage";
import { DEFAULT_OG_ALT, DEFAULT_OG_IMAGE, SITE_URL, breadcrumbJsonLd, sectionCrumbs } from "../../lib/seo";
import { newsExcerpt } from "../../lib/news-excerpt";

export const dynamic = "force-dynamic";
type Query = { lang?: string; category?: string };
type Category = keyof typeof categories;

function localeOf(value?: string): NewsLocale {
  return value === "en" || value === "ja" ? value : "zh";
}
function categoryOf(value?: string): Category {
  return value && Object.prototype.hasOwnProperty.call(categories, value) ? value as Category : "all";
}
function safeItemCategory(value?: string): Exclude<Category, "all"> {
  return value && value !== "all" && Object.prototype.hasOwnProperty.call(categories, value) ? value as Exclude<Category, "all"> : "macro";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  const query = await searchParams;
  const language = localeOf(query.lang);
  const category = categoryOf(query.category);
  const suffix = category === "all" ? "" : `&category=${category}`;
  const canonical = `${SITE_URL}/news?lang=${language}${suffix}`;
  return {
    title: `${categories[category][language]}｜99GOLD.NET`,
    description: editorialLabels[language].introduction,
    alternates: {
      canonical,
      languages: {
        "zh-Hant": `${SITE_URL}/news?lang=zh${suffix}`,
        en: `${SITE_URL}/news?lang=en${suffix}`,
        ja: `${SITE_URL}/news?lang=ja${suffix}`,
      },
    },
    openGraph: {
      title: `${categories[category][language]}｜99GOLD.NET`,
      description: editorialLabels[language].introduction,
      url: canonical,
      siteName: "99GOLD.NET",
      locale: language === "zh" ? "zh_TW" : language === "ja" ? "ja_JP" : "en_US",
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${categories[category][language]}｜99GOLD.NET`,
      description: editorialLabels[language].introduction,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function NewsIndex({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const locale = localeOf(query.lang);
  const category = categoryOf(query.category);
  const labels = editorialLabels[locale];
  const editorials = recentEditorials(locale);
  const editorialRows = editorials.filter((article) => category === "all" || (article.category ?? "macro") === category);
  const scheduled = await getDailyGoldNews(locale, getRawDb());
  const official = scheduled.items.filter((item) => item.external);
  const officialRows = official.filter((item) => category === "all" || safeItemCategory(item.category) === category);
  const countFor = (entry: Category) => editorials.filter((article) => entry === "all" || (article.category ?? "macro") === entry).length
    + official.filter((item) => entry === "all" || safeItemCategory(item.category) === entry).length;

  return (
    <main className="articlePage editorialPage articleShell" lang={locale === "zh" ? "zh-Hant" : locale}>
    <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, sectionCrumbs.news])} />
    <h1>{labels.all}</h1>
    <p className="editorialLead">{labels.introduction}</p>
    <p className="newsOperationsNote">{locale === "zh" ? "官方來源每 30 分鐘自動檢查；快訊經管理者核准後排程發布。" : locale === "ja" ? "公式情報源を30分ごとに確認し、承認済み速報を予定公開します。" : "Official sources are checked every 30 minutes; approved briefs are published on schedule."}</p>
    <nav className="editorialCategoryFilters" aria-label={locale === "zh" ? "新聞分類" : locale === "ja" ? "ニュース分類" : "News categories"}>{(Object.keys(categories) as Category[]).map((entry) => <Link key={entry} href={`/news?lang=${locale}&category=${entry}`} aria-current={category === entry ? "page" : undefined}>{categories[entry][locale]} <span>{countFor(entry)}</span></Link>)}</nav>

    <div className="editorialList">{editorialRows.map((article) => {
      const excerpt = newsExcerpt(article.description);
      return <article key={article.id} className="newsCard">
      <Link href={`/news/${article.id}`}>
        <CoverImage src={article.image} alt={article.imageAlt} />
        <p className="articleKicker">{categories[article.category ?? "macro"][locale]} · {labels.event}: {article.eventDate}</p>
        <h2>{article.title}</h2>
      </Link>
      {excerpt ? <p className="newsExcerpt">{excerpt}</p> : <p className="newsExcerptMuted">{locale === "zh" ? "這篇文章沒有可顯示的摘要。" : locale === "ja" ? "この記事には表示できる要約がありません。" : "No excerpt is available for this article."}</p>}
      <Link href={`/news/${article.id}`}>{labels.more} →</Link>
    </article>;
    })}</div>

    {officialRows.length > 0 && <section className="officialBriefs">
      <p className="articleKicker">SCHEDULED OFFICIAL SOURCES</p>
      <h2>{locale === "zh" ? "官方來源快訊" : locale === "ja" ? "公式情報源速報" : "Official-source briefs"}</h2>
      <div>{officialRows.map((item) => {
        const excerpt = newsExcerpt(item.summary);
        return <article key={String(item.id)} className="officialBriefCard">
        <p><b>{categories[safeItemCategory(item.category)][locale]}</b><time dateTime={item.sourcePublishedAt}>{item.date}</time></p>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></h3>
        {excerpt ? <p className="newsExcerpt">{excerpt}</p> : <p className="newsExcerptMuted">{locale === "zh" ? "來源未提供摘要。" : locale === "ja" ? "情報源に要約がありません。" : "The source did not provide an excerpt."}</p>}
        <small>{item.sourceName}</small>
      </article>;
      })}</div>
    </section>}
    {!editorialRows.length && !officialRows.length && <p className="newsEmpty">{labels.noNews}</p>}
    <SiteLinks current="news" />
  </main>
  );
}
