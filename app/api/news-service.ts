import { env } from "cloudflare:workers";
export type Locale = "zh" | "en" | "ja";
export type Article = { id:string; locale:Locale; title:string; body:string; source_url:string; published_at:string; fetched_at:string };
const feed = "https://www.federalreserve.gov/feeds/press_monetary.xml";
function plain(s:string) { return s.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").trim(); }
function tag(s:string,n:string) { return plain(s.match(new RegExp("<"+n+"[^>]*>([\\s\\S]*?)</"+n+">","i"))?.[1]??""); }
async function text(url:string) { const r=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:"follow"}); if(!r.ok)throw new Error("Source "+r.status); const final=new URL(r.url||url); if(final.protocol!=="https:"||final.hostname!=="www.federalreserve.gov")throw new Error("Unexpected source redirect"); return r.text(); }
async function translate(value:string,locale:Locale) {
 if(locale==="en")return value;
 const parts=value.match(/[\s\S]{1,420}(?:\s|$)|[\s\S]{1,420}/g)??[];
 const results:string[]=[];
 for(const p of parts) {
  const url=new URL("https://api.mymemory.translated.net/get");
  url.search=new URLSearchParams({q:p,langpair:`en|${locale==="zh"?"zh-TW":"ja"}`}).toString();
  const r=await fetch(url,{signal:AbortSignal.timeout(10000)}); if(!r.ok)throw new Error("Translation status "+r.status);
  const d=await r.json() as {responseStatus?:number;responseData?:{translatedText?:string}};
  const translated=d.responseData?.translatedText?.trim();
  if(d.responseStatus&&d.responseStatus!==200)throw new Error("Translation rejected "+d.responseStatus);
  if(!translated||translated===p.trim())throw new Error("Translation incomplete");
  results.push(translated);
 }
 return results.join("\n\n");
}
export async function readArticles(locale:Locale) { return (await env.DB.prepare("SELECT * FROM news_articles WHERE locale = ? ORDER BY published_at DESC LIMIT 12").bind(locale).all<Article>()).results; }
export async function refreshArticles(locale:Locale) {
 const last=await env.DB.prepare("SELECT value FROM site_settings WHERE key = ?").bind("news-refresh-"+locale).first<{value:string}>();
 if(last&&Date.now()-Date.parse(last.value)<7200000)return;
 const xml=await text(feed);
 const entries=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,3);
 if(!entries.length)throw new Error("Empty source feed");
 let failed=false;
 for(const entry of entries) {
  try {
   const url=tag(entry[1],"link"); const u=new URL(url);
   if(u.protocol!=="https:"||u.hostname!=="www.federalreserve.gov"||!u.pathname.startsWith("/newsevents/pressreleases/monetary"))continue;
   const id=u.pathname.split("/").pop()!.replace(".htm","")+"-"+locale;
   if(await env.DB.prepare("SELECT id FROM news_articles WHERE id = ?").bind(id).first())continue;
   const html=await text(url);
   const start=html.search(/id=["']article["']/i);
   if(start<0)throw new Error("Missing article");
   const end=html.indexOf('id="lastUpdate"',start);
   const content=html.slice(start,end>start?end:undefined);
   const paragraphs=[...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1])).filter(p=>p.length>25&&!/Last Update:|For media inquiries|Stay Connected|For release at/i.test(p));
   const body=paragraphs.join("\n\n");
   if(body.length<300)throw new Error("Incomplete article");
   const date=new Date(tag(entry[1],"pubDate")).toISOString();
   const title=await translate(tag(entry[1],"title"),locale);
   const localized=await translate(body,locale);
   await env.DB.prepare("INSERT INTO news_articles (id,locale,title,body,source_url,published_at,fetched_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,locale,title,localized,url,date,new Date().toISOString()).run();
  } catch(error) { failed=true; console.error("Article not published",String(error)); }
 }
 if(!failed){const now=new Date().toISOString();await env.DB.prepare("INSERT INTO site_settings (key,value,updated_at,updated_by) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("news-refresh-"+locale,now,now,"news-service").run();}
}
export async function getDailyGoldNews(inputLocale="zh") {
 const locale:Locale=inputLocale==="en"||inputLocale==="ja"?inputLocale:"zh";
 try{await refreshArticles(locale);}catch(error){console.error("News unavailable",String(error));}
 let rows=await readArticles(locale);
 let isTranslated=locale!=="en";
 if(!rows.length&&locale!=="en"){rows=await readArticles("en");isTranslated=false;}
 return {items:rows.map(r=>({id:r.id,title:r.title,summary:r.body.slice(0,180),date:r.published_at.slice(0,10),url:"/news/"+r.id,sourceName:isTranslated?"Federal Reserve · machine translation":"Federal Reserve · English original",translated:isTranslated})),updatedAt:rows[0]?.fetched_at??""};
}
