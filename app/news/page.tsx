import type { Metadata } from "next";
import { recentEditorials, type NewsLocale } from "./editorial";
import { editorialLabels } from "./EditorialView";
import { categories } from "./categories";
export const dynamic="force-dynamic";
type Query={lang?:string;category?:string};
function localeOf(s?:string):NewsLocale{return s==="en"||s==="ja"?s:"zh";}
function categoryOf(s?:string):keyof typeof categories{return s&&Object.prototype.hasOwnProperty.call(categories,s)?s as keyof typeof categories:"all";}
export async function generateMetadata({searchParams}:{searchParams:Promise<Query>}):Promise<Metadata>{
 const q=await searchParams,lang=localeOf(q.lang),cat=categoryOf(q.category),suffix=cat==="all"?"":"&category="+cat;
 return {title:categories[cat][lang]+"｜99GOLD.NET",description:editorialLabels[lang].introduction,alternates:{canonical:"https://99gold.net/news?lang="+lang+suffix,languages:{"zh-Hant":"https://99gold.net/news?lang=zh"+suffix,en:"https://99gold.net/news?lang=en"+suffix,ja:"https://99gold.net/news?lang=ja"+suffix}}};
}
export default async function NewsIndex({searchParams}:{searchParams:Promise<Query>}){
 const q=await searchParams,locale=localeOf(q.lang),category=categoryOf(q.category),t=editorialLabels[locale],all=recentEditorials(locale),rows=all.filter(a=>category==="all"||(a.category??"macro")===category);
 return <main className="articlePage editorialPage" lang={locale==="zh"?"zh-Hant":locale}>
  <nav className="articleNav"><a href="/">99GOLD.NET</a><a href="/">{t.home}</a><div className="editorialLanguages">{(["zh","en","ja"] as NewsLocale[]).map(l=><a key={l} href={"/news?lang="+l+"&category="+category} aria-current={l===locale?"page":undefined}>{l==="zh"?"繁中":l==="en"?"English":"日本語"}</a>)}</div></nav>
  <h1>{t.all}</h1><p className="editorialLead">{t.introduction}</p>
  <nav className="editorialCategoryFilters" aria-label={locale==="zh"?"新聞分類":locale==="ja"?"ニュース分類":"News categories"}>{(Object.keys(categories) as (keyof typeof categories)[]).map(c=><a key={c} href={"/news?lang="+locale+"&category="+c} aria-current={category===c?"page":undefined}>{categories[c][locale]} <span>{all.filter(a=>c==="all"||(a.category??"macro")===c).length}</span></a>)}</nav>
  <div className="editorialList">{rows.map(a=><article key={a.id}><a href={"/news/"+a.id}><img src={a.image} alt={a.imageAlt} width="1536" height="1024" loading="lazy"/><p className="articleKicker">{categories[a.category??"macro"][locale]} · {t.event}: {a.eventDate}</p><h2>{a.title}</h2></a><p>{a.description}</p><a href={"/news/"+a.id}>{t.more} →</a></article>)}</div>{!rows.length&&<p>{t.noNews}</p>}
 </main>;
}
