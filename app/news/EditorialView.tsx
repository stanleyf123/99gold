import Link from "next/link";
import { type Editorial } from "./editorial";
import { categories } from "./categories";
import CoverImage from "../CoverImage";

const ARCHIVE_CUTOFF_TIMESTAMP = Date.now() - 7 * 86_400_000;

export const editorialLabels = {
  zh: { home:"返回首頁", all:"市場新聞", by:"99GOLD.NET｜AI協作撰文", published:"本文發布", event:"事件日期", image:"AI生成示意圖，非新聞現場照片", references:"參考資料", facts:"資料來源", archived:"歷史文章：事件距今超過7天", noNews:"最近7天暫無新文章。", more:"閱讀全文", introduction:"查核近期資料後重新撰寫，分開呈現新聞事實與本站分析。", disclaimer:"資訊與分析不構成個人投資建議。" },
  en: { home:"Home", all:"Market news", by:"99GOLD.NET | AI-assisted editorial", published:"Article published", event:"Event date", image:"AI-generated illustration, not an event photograph", references:"References", facts:"Source", archived:"Archive: the event is more than 7 days old", noNews:"No new articles in the last 7 days.", more:"Read article", introduction:"Independently written from checked recent sources, with reported facts separated from analysis.", disclaimer:"Information and analysis are not personal investment advice." },
  ja: { home:"ホーム", all:"市場ニュース", by:"99GOLD.NET｜AI協働記事", published:"記事公開", event:"出来事の日付", image:"AI生成のイメージ画像。ニュース現場の写真ではありません", references:"参考資料", facts:"出典", archived:"過去の記事：出来事から7日以上経過", noNews:"過去7日間の新しい記事はありません。", more:"記事を読む", introduction:"最近の資料を確認して独自に執筆し、報道された事実と分析を区別しています。", disclaimer:"情報と分析は個別の投資助言ではありません。" },
};

export default function EditorialView({article:a}:{article:Editorial}) {
  const t=editorialLabels[a.locale];
  const json={"@context":"https://schema.org","@type":"NewsArticle",headline:a.title,description:a.description,datePublished:a.publishedAt,dateModified:a.publishedAt,inLanguage:a.locale==="zh"?"zh-Hant":a.locale,image:["https://99gold.net"+a.image],author:{"@type":"Organization",name:"99GOLD.NET"},publisher:{"@type":"Organization",name:"99GOLD.NET"},mainEntityOfPage:"https://99gold.net/news/"+a.id,citation:a.sources.map(s=>s.url)};
  return (
    <main className="articlePage editorialPage articleShell" lang={a.locale==="zh"?"zh-Hant":a.locale}>
    <article><p className="articleKicker">{t.by} · <Link href={`/news?lang=${a.locale}&category=${a.category??"macro"}`}>{categories[a.category??"macro"][a.locale]}</Link></p><h1>{a.title}</h1><p className="editorialLead">{a.description}</p>
      <div className="editorialDates"><span>{t.event}: <time dateTime={a.eventDate}>{a.eventDate}</time></span><span>{t.published}: <time dateTime={a.publishedAt}>{new Date(a.publishedAt).toLocaleString(a.locale==="zh"?"zh-TW":a.locale,{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false})} UTC+8</time></span></div>
      {Date.parse(a.eventDate)<ARCHIVE_CUTOFF_TIMESTAMP&&<p className="editorialArchive">{t.archived}</p>}
      <figure className="editorialFigure">
        <CoverImage src={a.image} alt={a.imageAlt} priority width={960} height={640} />
        <figcaption>{t.image}</figcaption>
      </figure>
      {a.sections.map((s,i)=><section key={i}><h2>{s.heading}</h2>{s.paragraphs.map((p,j)=><p key={j}>{p}</p>)}{s.source!==undefined&&<p className="editorialCitation"><a href={a.sources[s.source].url} target="_blank" rel="noreferrer">{t.facts}: {a.sources[s.source].title} ↗</a></p>}</section>)}
      <section className="articleSource"><h2>{t.references}</h2>{a.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a><br/><time>{s.date}</time></p>)}<p>{t.disclaimer}</p><Link href={`/news?lang=${a.locale}`}>← {t.all}</Link></section>
    </article><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(json).replace(/</g,"\\u003c")}}/>
    </main>
  );
}
