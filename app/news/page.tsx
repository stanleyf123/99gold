import { env } from "cloudflare:workers";
import type { Metadata } from "next";
import Link from "next/link";
import { getDailyGoldNews } from "../api/news-service";
import { recentEditorials, type NewsLocale } from "./editorial";
import { editorialLabels } from "./EditorialView";
import { categories } from "./categories";

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
  return {
    title: `${categories[category][language]}｜99GOLD.NET`,
    description: editorialLabels[language].introduction,
    alternates: {
      canonical: `https://99gold.net/news?lang=${language}${suffix}`,
      languages: {
        "zh-Hant": `https://99gold.net/news?lang=zh${suffix}`,
        en: `https://99gold.net/news?lang=en${suffix}`,
        ja: `https://99gold.net/news?lang=ja${suffix}`,
      },
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
  const scheduled = await getDailyGoldNews(locale, env.DB);
  const official = scheduled.items.filter((item) => item.external);
  const officialRows = official.filter((item) => category === "all" || safeItemCategory(item.category) === category);
  const countFor = (entry: Category) => editorials.filter((article) => entry === "all" || (article.category ?? "macro") === entry).length
    + official.filter((item) => entry === "all" || safeItemCategory(item.category) === entry).length;

  return <main className="articlePage editorialPage" lang={locale === "zh" ? "zh-Hant" : locale}>
    <nav className="articleNav">
      <Link href="/">99GOLD.NET</Link><Link href="/">{labels.home}</Link>
      <div className="editorialLanguages">{(["zh", "en", "ja"] as NewsLocale[]).map((language) => <Link key={language} href={`/news?lang=${language}&category=${category}`} aria-current={language === locale ? "page" : undefined}>{language === "zh" ? "繁中" : language === "en" ? "English" : "日本語"}</Link>)}</div>
    </nav>
    <h1>{labels.all}</h1>
    <p className="editorialLead">{labels.introduction}</p>
    <p className="newsOperationsNote">{locale === "zh" ? "官方來源每 30 分鐘自動檢查；快訊經管理者核准後排程發布。" : locale === "ja" ? "公式情報源を30分ごとに確認し、承認済み速報を予定公開します。" : "Official sources are checked every 30 minutes; approved briefs are published on schedule."}</p>
    <nav className="editorialCategoryFilters" aria-label={locale === "zh" ? "新聞分類" : locale === "ja" ? "ニュース分類" : "News categories"}>{(Object.keys(categories) as Category[]).map((entry) => <Link key={entry} href={`/news?lang=${locale}&category=${entry}`} aria-current={category === entry ? "page" : undefined}>{categories[entry][locale]} <span>{countFor(entry)}</span></Link>)}</nav>

    <div className="editorialList">{editorialRows.map((article) => <article key={article.id}>
      <Link href={`/news/${article.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Editorial artwork paths are controlled article data and preserve their source dimensions. */}
        <img src={article.image} alt={article.imageAlt} width="1536" height="1024" loading="lazy"/>
        <p className="articleKicker">{categories[article.category ?? "macro"][locale]} · {labels.event}: {article.eventDate}</p>
        <h2>{article.title}</h2>
      </Link>
      <p>{article.description}</p><Link href={`/news/${article.id}`}>{labels.more} →</Link>
    </article>)}</div>

    {officialRows.length > 0 && <section className="officialBriefs">
      <p className="articleKicker">SCHEDULED OFFICIAL SOURCES</p>
      <h2>{locale === "zh" ? "官方來源快訊" : locale === "ja" ? "公式情報源速報" : "Official-source briefs"}</h2>
      <div>{officialRows.map((item) => <article key={String(item.id)}>
        <p><b>{categories[safeItemCategory(item.category)][locale]}</b><time dateTime={item.sourcePublishedAt}>{item.date}</time></p>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></h3>
        {item.summary && <p>{item.summary}</p>}
        <small>{item.sourceName}</small>
      </article>)}</div>
    </section>}
    {!editorialRows.length && !officialRows.length && <p>{labels.noNews}</p>}
  </main>;
}
