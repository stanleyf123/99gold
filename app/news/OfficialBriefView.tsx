import Link from "next/link";
import { categories, type NewsCategory } from "./categories";
import type { NewsLocale } from "./editorial";

const copy = {
  zh: { brief: "市場快訊", published: "本站發布", original: "閱讀原文", all: "市場新聞", disclaimer: "資訊與分析不構成個人投資建議。" },
  en: { brief: "Market brief", published: "Published", original: "Read original", all: "Market news", disclaimer: "Information and analysis are not personal investment advice." },
  ja: { brief: "市場速報", published: "公開", original: "原文を読む", all: "市場ニュース", disclaimer: "情報と分析は個別の投資助言ではありません。" },
} as const;

export default function OfficialBriefView({
  locale,
  id,
  title,
  summary,
  category,
  eventDate,
  publishedAt,
  originalUrl,
  translationLabel,
}: {
  locale: NewsLocale;
  id: string;
  title: string;
  summary: string | null;
  category: NewsCategory;
  eventDate: string;
  publishedAt: string;
  originalUrl: string;
  translationLabel: string | null;
}) {
  const t = copy[locale];
  const categoryLabel = categories[category][locale];
  const json = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: summary ?? title,
    datePublished: publishedAt,
    inLanguage: locale === "zh" ? "zh-Hant" : locale,
    author: { "@type": "Organization", name: "99GOLD.NET" },
    publisher: { "@type": "Organization", name: "99GOLD.NET" },
    mainEntityOfPage: `https://99gold.net/news/${id}?lang=${locale}`,
  };
  return (
    <main className="articlePage editorialPage articleShell" lang={locale === "zh" ? "zh-Hant" : locale}>
      <article>
        <p className="articleKicker">{t.brief} · <Link href={`/news?lang=${locale}&category=${category}`}>{categoryLabel}</Link>{translationLabel ? ` · ${translationLabel}` : ""}</p>
        <h1>{title}</h1>
        <div className="editorialDates">
          <span>{t.published}: <time dateTime={publishedAt}>{eventDate}</time></span>
        </div>
        {summary ? summary.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : null}
        <section className="articleSource">
          <p><a href={originalUrl} target="_blank" rel="noreferrer">{t.original} ↗</a></p>
          <p>{t.disclaimer}</p>
          <Link href={`/news?lang=${locale}`}>← {t.all}</Link>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }} />
    </main>
  );
}
