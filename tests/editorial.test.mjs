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
 const context={exports:{},require:(id)=>overrides[id]??require(id),Date,console};
 vm.runInNewContext(code,context);return context.exports;
}
const batch=moduleFrom("../app/news/batch-20260912.ts");
const batchNew=moduleFrom("../app/news/batch-20260913.ts");
const categories=moduleFrom("../app/news/categories.ts");
const data=moduleFrom("../app/news/editorial.ts",{"./batch-20260912":batch,"./batch-20260913":batchNew});
const view=moduleFrom("../app/news/EditorialView.tsx",{"./editorial":data,"./categories":categories});
test("three complete editions have local art, stable dates and cited sources",()=>{
 assert.equal(data.editorials.length,15);
 assert.equal(new Set(batch.batchSeptember12.map(a=>a.group)).size,2);
 assert.equal(new Set(batchNew.batchSeptember13.map(a=>a.group)).size,2);
 assert.ok(!data.editorials.some(a=>a.id.startsWith("goldgroup-financing")));
 for(const a of data.editorials){
  assert.ok(a.sections.length>=3);
  assert.ok(a.sections.every(s=>s.heading&&s.paragraphs.every(p=>p.length>40)));
  assert.ok(["2026-09-11","2026-09-12"].includes(a.eventDate));
  assert.ok(Date.parse(a.publishedAt)<=Date.now());
  assert.ok(existsSync(new URL("../public"+a.image,import.meta.url)));
  assert.ok(a.sources[0].url.startsWith("https://"));
  const html=renderToStaticMarkup(view.default({article:a}));
  assert.ok(html.includes(a.title));
  assert.ok(html.includes(a.sections.at(-1).paragraphs[0]));
  assert.ok(html.includes('type="application/ld+json"'));
  assert.ok(html.includes('href="/news/'+a.group+'-ja"'));
  assert.ok(html.includes(a.locale==="zh"?'lang="zh-Hant"':`lang="${a.locale}"`));
 }
});
test("old events are excluded instead of receiving a new publication date",()=>{
 assert.equal(data.recentEditorials("zh",Date.parse("2026-09-12T18:00:00Z")).length,5);
 assert.equal(data.recentEditorials("zh",Date.parse("2026-09-20T12:00:00Z")).length,0);
});
test("reader API returns original work and local images without a translation request",async()=>{
 const api=moduleFrom("../app/api/news-service.ts",{"../news/editorial":data});
 for(const lang of ["zh","en","ja"]){const result=await api.getDailyGoldNews(lang);assert.equal(result.items.length,5);assert.ok(result.items[0].id.endsWith("-"+lang));assert.equal(result.items[0].translated,false);assert.ok(result.items[0].image.startsWith("/"));assert.equal(result.items[0].category,"macro");}
});
