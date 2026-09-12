import type { Metadata } from "next";
import { recentEditorials, type NewsLocale } from "./editorial";
import { editorialLabels } from "./EditorialView";
export const dynamic="force-dynamic";
function localeOf(s?:string):NewsLocale{return s==="en"||s==="ja"?s:"zh";}
export async function generateMetadata({searchParams}:{searchParams:Promise<{lang?:string}>}):Promise<Metadata>{const lang=localeOf((await searchParams).lang);return {title:editorialLabels[lang].all+"｜99GOLD.NET",description:editorialLabels[lang].introduction,alternates:{canonical:`https://99gold.net/news?lang=${lang}`,languages:{"zh-Hant":"https://99gold.net/news?lang=zh",en:"https://99gold.net/news?lang=en",ja:"https://99gold.net/news?lang=ja"}}};}
export default async function NewsIndex({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const locale=localeOf((await searchParams).lang),t=editorialLabels[locale],rows=recentEditorials(locale);
 return <main className="articlePage editorialPage" lang={locale==="zh"?"zh-Hant":locale}><nav className="articleNav"><a href="/">99GOLD.NET</a><a href="/">{t.home}</a><div className="editorialLanguages"><a href="/news?lang=zh">繁中</a><a href="/news?lang=en">English</a><a href="/news?lang=ja">日本語</a></div></nav><h1>{t.all}</h1><p className="editorialLead">{t.introduction}</p><div className="editorialList">{rows.map(a=><article key={a.id}><a href={`/news/${a.id}`}><img src={a.image} alt={a.imageAlt} width="1536" height="1024"/><p className="articleKicker">{t.event}: {a.eventDate}</p><h2>{a.title}</h2></a><p>{a.description}</p><a href={`/news/${a.id}`}>{t.more} →</a></article>)}</div>{!rows.length&&<p>{t.noNews}</p>}</main>;
}
