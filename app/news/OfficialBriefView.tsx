import Link from "next/link";
import JsonLd from "../JsonLd";
import SiteLinks from "../SiteLinks";
import ShareBrief from "./ShareBrief";
import { categories, type NewsCategory } from "./categories";
import type { NewsLocale } from "./editorial";
import {
  SITE_URL,
  articleJsonLd,
  breadcrumbJsonLd,
  briefFaq,
  faqJsonLd,
  sectionCrumbs,
} from "../../lib/seo";

const copy = {
  zh: {
    brief: "市場快訊",
    published: "本站發布",
    original: "閱讀原文",
    all: "市場新聞",
    disclaimer: "資訊與分析不構成個人投資建議。",
    jewelry: "查看今日銀樓金價",
    quotes: "查看今日金價",
    faq: "關於這則快訊",
  },
  en: {
    brief: "Market brief",
    published: "Published",
    original: "Read original",
    all: "Market news",
    disclaimer: "Information and analysis are not personal investment advice.",
    jewelry: "Today’s jewelry gold price",
    quotes: "Today’s gold quotes",
    faq: "About this brief",
  },
  ja: {
    brief: "市場速報",
    published: "公開",
    original: "原文を読む",
    all: "市場ニュース",
    disclaimer: "情報と分析は個別の投資助言ではありません。",
    jewelry: "本日の店頭金価格",
    quotes: "本日の金相場",
    faq: "この速報について",
  },
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
  translationPending = false,
  translationPendingLabel = null,
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
  translationPending?: boolean;
  translationPendingLabel?: string | null;
}) {
  const t = copy[locale];
  const categoryLabel = categories[category][locale];
  const pageUrl = `${SITE_URL}/news/${id}?lang=${locale}`;
  const faq = briefFaq[locale];
  const article = articleJsonLd({
    headline: title,
    description: summary ?? title,
    url: pageUrl,
    datePublished: publishedAt,
    dateModified: publishedAt,
    inLanguage: translationPending ? "en" : locale === "zh" ? "zh-Hant" : locale,
  });
  const pendingLabel = translationPendingLabel
    || (locale === "zh" ? "原文／翻譯待補" : locale === "ja" ? "原文／翻訳待ち" : "Original / translation pending");
  const statusLabel = translationLabel
    ? ` · ${translationLabel}`
    : translationPending
      ? ` · ${pendingLabel}`
      : "";
  return (
    <main className="articlePage editorialPage articleShell" lang={locale === "zh" ? "zh-Hant" : locale}>
      <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, sectionCrumbs.news, { name: title, path: `/news/${id}` }])} />
      <JsonLd data={article} />
      <JsonLd data={faqJsonLd(faq)} />
      <article>
        <p className="articleKicker">{t.brief} · <Link href={`/news?lang=${locale}&category=${category}`}>{categoryLabel}</Link>{statusLabel}</p>
        <h1 lang={translationPending ? "en" : undefined}>{title}</h1>
        <div className="editorialDates">
          <span>{t.published}: <time dateTime={publishedAt}>{eventDate}</time></span>
        </div>
        {summary ? summary.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : null}
        <ShareBrief locale={locale} title={title} url={pageUrl} />
        <section className="briefFaq" aria-labelledby="brief-faq">
          <h2 id="brief-faq">{t.faq}</h2>
          {faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
        <section className="articleSource">
          <p><a href={originalUrl} target="_blank" rel="noreferrer">{t.original} ↗</a></p>
          <p className="briefRelated">
            <Link href="/">{t.quotes}</Link>
            <Link href="/jewelry">{t.jewelry}</Link>
          </p>
          <p>{t.disclaimer}</p>
          <Link href={`/news?lang=${locale}`}>← {t.all}</Link>
        </section>
      </article>
      <SiteLinks current="news" />
    </main>
  );
}
