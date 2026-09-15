import type { Metadata } from "next";
import { getRawDb } from "../../db";
import Link from "next/link";
import JsonLd from "../JsonLd";
import SiteLinks from "../SiteLinks";
import { getDailyGoldNews } from "../api/news-service";
import { recentEditorials, type NewsLocale } from "./editorial";
import { editorialLabels } from "./EditorialView";
import { asNewsCategory, categories } from "./categories";
import CoverImage from "../CoverImage";
import { DEFAULT_OG_IMAGE, SITE_URL, breadcrumbJsonLd, faqJsonLd, itemListJsonLd, newsIndexFaq, sectionCrumbs } from "../../lib/seo";
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
  return asNewsCategory(value);
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  const query = await searchParams;
  const language = localeOf(query.lang);
  const category = categoryOf(query.category);
  const suffix = category === "all" ? "" : `&category=${category}`;
  const canonical = `${SITE_URL}/news?lang=${language}${suffix}`;
  const title = `${category === "all" ? editorialLabels[language].all : categories[category][language]}｜99GOLD.NET`;
  const description = category === "all"
    ? editorialLabels[language].introduction
    : `${categories[category][language]} · ${editorialLabels[language].introduction}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        "zh-Hant": `${SITE_URL}/news?lang=zh${suffix}`,
        en: `${SITE_URL}/news?lang=en${suffix}`,
        ja: `${SITE_URL}/news?lang=ja${suffix}`,
        "x-default": `${SITE_URL}/news?lang=zh${suffix}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "99GOLD.NET",
      locale: language === "zh" ? "zh_TW" : language === "ja" ? "ja_JP" : "en_US",
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title, type: "image/jpeg" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  const listItems = [
    ...editorialRows.map((article) => ({ name: article.title, path: `/news/${article.id}` })),
    ...officialRows.map((item) => ({ name: item.title, path: `/news/${item.id}?lang=${locale}` })),
  ];
  const faq = newsIndexFaq[locale];

  return (
    <main className="articlePage editorialPage articleShell" lang={locale === "zh" ? "zh-Hant" : locale}>
    <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, sectionCrumbs.news])} />
    {listItems.length ? <JsonLd data={itemListJsonLd(listItems)} /> : null}
    <JsonLd data={faqJsonLd(faq)} />
    <h1>{labels.all}</h1>
    <p className="editorialLead">{labels.introduction}</p>
    <p className="newsOperationsNote">{locale === "zh" ? "官方來源每 3 小時自動檢查、翻譯並上架快訊，無需人工核准。" : locale === "ja" ? "公式情報源を3時間ごとに確認し、速報を自動翻訳して公開します。管理者の承認は不要です。" : "Official sources are checked every 3 hours; briefs are auto-translated and published without manual approval."}</p>
    <nav className="editorialCategoryFilters" aria-label={locale === "zh" ? "新聞分類" : locale === "ja" ? "ニュース分類" : "News categories"}>{(Object.keys(categories) as Category[]).map((entry) => <Link key={entry} href={`/news?lang=${locale}&category=${entry}`} aria-current={category === entry ? "page" : undefined}>{categories[entry][locale]} <span>{countFor(entry)}</span></Link>)}</nav>

    <div className="editorialList">{editorialRows.map((article, index) => {
      const excerpt = newsExcerpt(article.description);
      return <article key={article.id} className="newsCard">
      <Link href={`/news/${article.id}`}>
        <CoverImage src={article.image} alt={article.imageAlt} priority={index === 0} />
        <p className="articleKicker">{categories[article.category ?? "macro"][locale]} · {labels.event}: {article.eventDate}</p>
        <h2>{article.title}</h2>
      </Link>
      {excerpt ? <p className="newsExcerpt">{excerpt}</p> : <p className="newsExcerptMuted">{locale === "zh" ? "這篇文章沒有可顯示的摘要。" : locale === "ja" ? "この記事には表示できる要約がありません。" : "No excerpt is available for this article."}</p>}
      <Link href={`/news/${article.id}`}>{labels.more} →</Link>
    </article>;
    })}</div>

    {officialRows.length > 0 && <section className="officialBriefs">
      <p className="articleKicker">MARKET BRIEFS</p>
      <h2>{locale === "zh" ? "市場快訊" : locale === "ja" ? "市場速報" : "Market briefs"}</h2>
      <div>{officialRows.map((item) => {
        const excerpt = newsExcerpt(item.summary);
        return <article key={String(item.id)} className="officialBriefCard">
        <p><b>{categories[safeItemCategory(item.category)][locale]}</b><time dateTime={item.sourcePublishedAt}>{item.date}</time></p>
        <h3><Link href={`/news/${item.id}?lang=${locale}`} lang={item.translationPending ? "en" : undefined}>{item.title}</Link></h3>
        {excerpt ? <p className="newsExcerpt">{excerpt}</p> : <p className="newsExcerptMuted">{locale === "zh" ? "這則快訊沒有可顯示的摘要。" : locale === "ja" ? "この速報には表示できる要約がありません。" : "No excerpt is available for this brief."}</p>}
        <small>{item.sourceName}{item.translationLabel ? ` · ${item.translationLabel}` : item.translationPending ? ` · ${item.translationPendingLabel || (locale === "zh" ? "原文／翻譯待補" : locale === "ja" ? "原文／翻訳待ち" : "Original / translation pending")}` : ""}</small>
      </article>;
      })}</div>
    </section>}
    {!editorialRows.length && !officialRows.length && <p className="newsEmpty">{labels.noNews}</p>}
    <section className="newsIndexFaq" aria-labelledby="news-faq">
      <h2 id="news-faq">{locale === "zh" ? "常見問題" : locale === "ja" ? "よくある質問" : "Frequently asked questions"}</h2>
      {faq.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
    <SiteLinks current="news" />
  </main>
  );
}
