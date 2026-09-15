import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
const require=createRequire(import.meta.url);
function moduleFrom(file, overrides={}) {
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const context={exports:{},require:(id)=>overrides[id]??require(id),Date,console,JSON,URL,AbortSignal,Headers,fetch,setTimeout,process};
 vm.runInNewContext(code,context);return context.exports;
}
const batch=moduleFrom("../app/news/batch-20260912.ts");
const batchNew=moduleFrom("../app/news/batch-20260913.ts");
const batchPolicy=moduleFrom("../app/news/batch-policy-20260913.ts");
const categories=moduleFrom("../app/news/categories.ts");
const data=moduleFrom("../app/news/editorial.ts",{"./batch-20260912":batch,"./batch-20260913":batchNew,"./batch-policy-20260913":batchPolicy});
const cover=moduleFrom("../app/CoverImage.tsx");
const view=moduleFrom("../app/news/EditorialView.tsx",{"./editorial":data,"./categories":categories,"../CoverImage":cover});
const feedClient=moduleFrom("../lib/news/feed-client.ts");
const translate=moduleFrom("../lib/news/translate.ts");
test("three complete editions have local art, stable dates and cited sources",()=>{
 assert.equal(data.editorials.length,18);
 assert.equal(new Set(batch.batchSeptember12.map(a=>a.group)).size,2);
 assert.equal(new Set(batchNew.batchSeptember13.map(a=>a.group)).size,2);
 assert.equal(new Set(batchPolicy.batchPolicySeptember13.map(a=>a.group)).size,1);
 assert.ok(!data.editorials.some(a=>a.id.startsWith("goldgroup-financing")));
 for(const a of data.editorials){
  assert.ok(a.sections.length>=3);
  assert.ok(a.sections.every(s=>s.heading&&s.paragraphs.every(p=>p.length>40)));
  assert.ok(["2026-09-11","2026-09-12","2026-09-13"].includes(a.eventDate));
  assert.ok(Date.parse(a.publishedAt)<=Date.now());
  assert.ok(existsSync(new URL("../public"+a.image,import.meta.url)));
  assert.ok(a.sources[0].url.startsWith("https://"));
  const html=renderToStaticMarkup(view.default({article:a}));
  assert.ok(html.includes(a.title));
  assert.ok(html.includes(a.sections.at(-1).paragraphs[0]));
  assert.ok(html.includes(a.image));
  assert.ok(html.includes('type="application/ld+json"'));
  assert.ok(html.includes(`href="/news?lang=${a.locale}`));
  assert.ok(html.includes(a.locale==="zh"?'lang="zh-Hant"':`lang="${a.locale}"`));
 }
});
test("old events are excluded instead of receiving a new publication date",()=>{
 assert.equal(data.recentEditorials("zh",Date.parse("2026-09-13T12:00:00Z")).length,6);
 assert.equal(data.recentEditorials("zh",Date.parse("2026-09-20T12:00:00Z")).length,0);
});
test("reader API returns original work and local images without a translation request",async()=>{
 const api=moduleFrom("../app/api/news-service.ts",{"../news/editorial":data,"../news/categories":categories,"../../lib/news/feed-client":feedClient,"../../lib/news/translate":translate});
 for(const lang of ["zh","en","ja"]){const result=await api.getDailyGoldNews(lang);assert.equal(result.items.length,6);assert.ok(result.items[0].id.endsWith("-"+lang));assert.equal(result.items[0].translated,false);assert.ok(result.items[0].image.startsWith("/"));assert.equal(result.items[0].category,"policy");}
});
test("official briefs expose locale-specific translations from stored fields",async()=>{
 const api=moduleFrom("../app/api/news-service.ts",{"../news/editorial":data,"../news/categories":categories,"../../lib/news/feed-client":feedClient,"../../lib/news/translate":translate});
 const official={
  id:"fed-1",title:"Federal Reserve issues FOMC statement",summary:"Official policy decision",
  canonical_url:"https://www.federalreserve.gov/newsevents/pressreleases/monetary20260913a.htm",
  source_name:"Federal Reserve Board",category:"policy",source_published_at:"2026-09-13T18:00:00.000Z",
  published_at:"2026-09-14T13:00:00.000Z",source_language:"en",
  title_zh:"聯邦準備理事會發布FOMC聲明",title_en:"Federal Reserve issues FOMC statement",
  title_ja:"米連邦準備制度理事会がFOMC声明を発表",
  summary_zh:"官方政策決定",summary_en:"Official policy decision",summary_ja:"公式の政策決定",
  translation_provider:"mymemory",
 };
 const db={prepare(query){const q=query.replace(/\s+/g," ");return{bind(){return this;},async first(){return q.includes("news_runs")?{finished_at:"2026-09-14T13:00:00.000Z",status:"succeeded"}:null;},async all(){return{results:q.includes("news_candidates")?[official]:[]};}};}};
 const zh=await api.getDailyGoldNews("zh",db);
 const zhItem=zh.items.find((item)=>item.external);
 assert.equal(zhItem.title,"聯邦準備理事會發布FOMC聲明");
 assert.equal(zhItem.summary,"官方政策決定");
 assert.equal(zhItem.translated,true);
 assert.equal(zhItem.translationLabel,"機器翻譯");
 assert.equal(zhItem.translationPending,false);
 assert.equal(zhItem.sourceName,"市場快訊");
 assert.doesNotMatch(zhItem.sourceName,/Federal Reserve|ONS|Treasury|BLS|ECB/i);
 assert.equal(zhItem.url,"/news/fed-1");
 assert.doesNotMatch(zhItem.url,/federalreserve|ons\.gov|bls\.gov|ecb\.europa/i);
 const enItem=(await api.getDailyGoldNews("en",db)).items.find((item)=>item.external);
 assert.equal(enItem.title,"Federal Reserve issues FOMC statement");
 assert.equal(enItem.sourceName,"Market brief");
 assert.equal(enItem.translated,false);
 const jaItem=(await api.getDailyGoldNews("ja",db)).items.find((item)=>item.external);
 assert.equal(jaItem.title,"米連邦準備制度理事会がFOMC声明を発表");
 assert.equal(jaItem.sourceName,"市場速報");
 assert.equal(jaItem.translated,true);
});
test("official briefs mark English titles as pending under zh/ja chrome",async()=>{
 const api=moduleFrom("../app/api/news-service.ts",{"../news/editorial":data,"../news/categories":categories,"../../lib/news/feed-client":feedClient,"../../lib/news/translate":translate});
 const official={
  id:"ecb-1",title:"Christine Lagarde: Introductory statement",summary:"Policy remarks.",
  canonical_url:"https://www.ecb.europa.eu/press/pressconf/html/index.en.html",
  source_name:"European Central Bank",category:"policy",source_published_at:"2026-09-13T18:00:00.000Z",
  published_at:"2026-09-14T13:00:00.000Z",source_language:"en",
  title_zh:"Christine Lagarde: Introductory statement",title_en:"Christine Lagarde: Introductory statement",
  title_ja:"Christine Lagarde: Introductory statement",
  summary_zh:"Policy remarks.",summary_en:"Policy remarks.",summary_ja:"Policy remarks.",
  translation_provider:"source",
 };
 const db={prepare(query){const q=query.replace(/\s+/g," ");return{bind(){return this;},async first(){return q.includes("news_runs")?{finished_at:"2026-09-14T13:00:00.000Z",status:"succeeded"}:null;},async all(){return{results:q.includes("news_candidates")?[official]:[]};}};}};
 const zhItem=(await api.getDailyGoldNews("zh",db)).items.find((item)=>item.external);
 assert.equal(zhItem.title,"Christine Lagarde: Introductory statement");
 assert.equal(zhItem.translated,false);
 assert.equal(zhItem.translationPending,true);
 assert.equal(zhItem.translationPendingLabel,"原文／翻譯待補");
 const jaItem=(await api.getDailyGoldNews("ja",db)).items.find((item)=>item.external);
 assert.equal(jaItem.translationPending,true);
 assert.equal(jaItem.translationPendingLabel,"原文／翻訳待ち");
 const enItem=(await api.getDailyGoldNews("en",db)).items.find((item)=>item.external);
 assert.equal(enItem.translationPending,false);
});
