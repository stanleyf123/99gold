import { recentEditorials, type NewsLocale } from "../news/editorial";
export type Locale = NewsLocale;
export type Article = { id:string; locale:Locale; title:string; body:string; source_url:string; published_at:string; fetched_at:string };

// Reader requests only read published work. They never trigger translation or
// republish an old source with a fresh date. Unattended editorial scheduling is
// separate from this endpoint and is not claimed to be configured.
export async function getDailyGoldNews(inputLocale="zh") {
 const locale:Locale=inputLocale==="en"||inputLocale==="ja"?inputLocale:"zh";
 const rows=recentEditorials(locale);
 const names={zh:"本站撰文 · AI協作",en:"Original editorial · AI-assisted",ja:"独自記事 · AI協働"};
 return {items:rows.map(r=>({id:r.id,title:r.title,summary:r.description,date:r.eventDate,url:"/news/"+r.id,image:r.image,sourceName:names[locale],translated:false})),updatedAt:rows[0]?.publishedAt??""};
}
