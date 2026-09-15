import { asNewsCategory } from "../news/categories";
import { recentEditorials, type NewsLocale } from "../news/editorial";
import { NEWS_SCHEDULE_STALE_AFTER_MS } from "../../lib/news/feed-client";
import type { NewsDatabase } from "../../lib/news/pipeline";
import { localizedBriefFields } from "../../lib/news/translate";
export type Locale = NewsLocale;
export type Article = { id:string; locale:Locale; title:string; body:string; source_url:string; published_at:string; fetched_at:string };

type PublishedCandidate = {
 id:string; title:string; summary:string|null; canonical_url:string;
 category:string; source_published_at:string; published_at:string; source_language:string|null;
 title_zh:string|null; title_en:string|null; title_ja:string|null;
 summary_zh:string|null; summary_en:string|null; summary_ja:string|null;
 translation_provider:string|null;
};
type LatestRun = { finished_at:string|null; status:string };

async function scheduledNews(database?:NewsDatabase) {
 if(!database)return {items:[] as PublishedCandidate[],checkedAt:"",runStatus:"not-configured"};
 try{
  const [rows,run]=await Promise.all([
   database.prepare(`SELECT id, title, summary, canonical_url, category,
    source_published_at, published_at, source_language,
    title_zh, title_en, title_ja, summary_zh, summary_en, summary_ja, translation_provider
    FROM news_candidates
    WHERE status = 'published' AND published_at IS NOT NULL
      AND source_published_at >= ?
    ORDER BY source_published_at DESC LIMIT 12`)
    .bind(new Date(Date.now()-7*86_400_000).toISOString()).all<PublishedCandidate>(),
   database.prepare(`SELECT finished_at, status FROM news_runs
    WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`).first<LatestRun>(),
  ]);
  return {items:rows.results,checkedAt:run?.finished_at??"",runStatus:run?.status??"pending"};
 }catch{return {items:[] as PublishedCandidate[],checkedAt:"",runStatus:"pending"};}
}

// Reader requests only read published work. Discovery, translation and publication
// happen in the scheduled news pipeline (`npm run news:pipeline`), never during a visitor request.
export async function getDailyGoldNews(inputLocale="zh",database?:NewsDatabase) {
 const locale:Locale=inputLocale==="en"||inputLocale==="ja"?inputLocale:"zh";
 const rows=recentEditorials(locale);
 const names={zh:"本站撰文 · AI協作",en:"Original editorial · AI-assisted",ja:"独自記事 · AI協働"};
 const briefLabels={zh:"市場快訊",en:"Market brief",ja:"市場速報"};
 const scheduled=await scheduledNews(database);
 const editorialItems=rows.map(r=>({id:r.id,title:r.title,summary:r.description,date:r.eventDate,category:r.category??"macro",url:"/news/"+r.id,image:r.image,sourceName:names[locale],translated:false,translationProvider:null as string|null,translationLabel:null as string|null,translationPending:false,translationPendingLabel:null as string|null,external:false,sourcePublishedAt:r.eventDate,publishedAt:r.publishedAt}));
 const officialItems=scheduled.items.map(r=>{
  const localized=localizedBriefFields(r,locale);
  return {id:r.id,title:localized.title,summary:localized.summary,date:r.source_published_at.slice(0,10),category:asNewsCategory(r.category),url:"/news/"+r.id,image:undefined,sourceName:briefLabels[locale],translated:localized.translated,translationProvider:localized.translationProvider,translationLabel:localized.translationLabel,translationPending:localized.translationPending,translationPendingLabel:localized.translationPendingLabel,external:true,sourcePublishedAt:r.source_published_at,publishedAt:r.published_at};
 });
 const items=[...officialItems,...editorialItems].sort((a,b)=>Date.parse(b.sourcePublishedAt)-Date.parse(a.sourcePublishedAt)).slice(0,15);
 const updatedAt=items.reduce((latest,item)=>Date.parse(item.publishedAt)>Date.parse(latest||"1970-01-01")?item.publishedAt:latest,"");
 const checkedTime=Date.parse(scheduled.checkedAt);
 const scheduleStatus:"healthy"|"delayed"|"error"|"pending"=scheduled.runStatus==="failed"?"error":!Number.isFinite(checkedTime)?"pending":Date.now()-checkedTime>NEWS_SCHEDULE_STALE_AFTER_MS?"delayed":"healthy";
 return {items,updatedAt,checkedAt:scheduled.checkedAt,scheduleStatus};
}
