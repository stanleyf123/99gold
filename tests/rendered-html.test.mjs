import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import test from "node:test";

async function collectJs(root) {
  const files = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const next = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".js")) files.push(next);
    }
  }
  await walk(root);
  return files;
}

test("build emits the complete 99gold professional quote workspace", async (t) => {
  if (!existsSync(new URL("../.next/BUILD_ID", import.meta.url))) {
    t.skip("run `npm run build` (or `npm run test:build`) to verify Next.js output");
    return;
  }
  const files = [
    ...await collectJs(new URL("../.next/static/", import.meta.url)),
    ...await collectJs(new URL("../.next/server/app/", import.meta.url)),
  ];
  assert.ok(files.length > 0, "Next.js build should emit JS bundles");
  const bundleText = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  assert.match(bundleText, /99GOLD PROFESSIONAL QUOTES/);
  assert.match(bundleText, /專業黃金報價/);
  assert.match(bundleText, /GC=F/);
  assert.match(bundleText, /COMEX/);
  assert.match(bundleText, /台灣黃金換算/);
  assert.match(bundleText, /全球貴金屬比較/);
  assert.match(bundleText, /歷史金價/);
  assert.doesNotMatch(bundleText, /Your site is taking shape|codex-preview/);
  await access(new URL("../public/og-quotes-v2.png", import.meta.url));
});

test("uses a shared SiteHeader and coherent homepage layout", async () => {
  const [page, header, chrome, layout, section, globalPage, news, article, editorial, cover] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/site-chrome.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/news/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/news/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/news/EditorialView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CoverImage.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(header, /今日金價/);
  assert.match(header, /全球報價/);
  assert.match(header, /國際金價/);
  assert.match(header, /銀樓價格/);
  assert.match(header, /黃金回收/);
  assert.match(header, /市場情報/);
  assert.match(header, /className="siteHeader"/);
  assert.match(header, /\/news\?lang=zh/);
  assert.match(header, /\$\{base\}-ja/);
  assert.match(layout, /site-chrome\.css/);
  assert.match(layout, /SiteChrome/);
  assert.match(chrome, /--page-gutter:/);
  assert.match(chrome, /--page-max:\s*1240px/);
  assert.match(chrome, /--hero-height:\s*clamp\(/);
  assert.match(chrome, /heroPhoto/);
  assert.match(chrome, /brandHeroCopy/);
  assert.doesNotMatch(chrome, /aspect-ratio:\s*1200\/630/);
  assert.doesNotMatch(page, /<SiteHeader/);
  assert.match(page, /className="heroPhoto"/);
  assert.match(page, /className="brandHeroCopy"/);
  assert.match(page, /今日市場快速判讀/);
  assert.match(page, /quoteEmptyPanel/);
  assert.match(page, /brandHero[\s\S]*marketRadar[\s\S]*marketHub/);
  assert.doesNotMatch(page, /marketHub[\s\S]*marketRadar/);
  assert.doesNotMatch(page, /brandCover|aspect-ratio:1200\/630/);
  assert.doesNotMatch(section, /<SiteHeader/);
  assert.doesNotMatch(globalPage, /<SiteHeader/);
  assert.doesNotMatch(globalPage, /globalNav/);
  assert.doesNotMatch(news, /<SiteHeader/);
  assert.doesNotMatch(news, /articleNav/);
  assert.doesNotMatch(news, /alt=\{article\.imageAlt\}/);
  assert.doesNotMatch(article, /<SiteHeader/);
  assert.doesNotMatch(editorial, /<SiteHeader/);
  assert.doesNotMatch(editorial, /alt=\{a\.imageAlt\}/);
  assert.match(cover, /onError/);
  assert.match(cover, /coverFallback/);
});

test("keeps quote history, data transparency and responsive styles wired", async () => {
  const [page, chart, quoteApi, historyApi, styles, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/MarketLineChart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/global-quotes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/gold-history/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/quotes.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\["1D", "1W", "1M", "3M", "1Y"\]/);
  assert.match(page, /非可成交報價/);
  assert.match(page, /來源受限時改列 Gold API XAU\/USD/);
  assert.match(page, /不顯示估造價格/);
  assert.match(chart, /ResizeObserver/);
  assert.match(chart, /role="img"/);
  assert.match(quoteApi, /regularMarketDayHigh/);
  assert.match(quoteApi, /sessionOpen/);
  assert.match(quoteApi, /api\.gold-api\.com\/price/);
  assert.match(quoteApi, /Resolve gold first/);
  assert.match(quoteApi, /quotedAt: gold\.quotedAt/);
  assert.match(quoteApi, /retrievedAt/);
  assert.match(page, /行情時間/);
  assert.match(page, /本站檢查/);
  assert.match(page, /週末休市/);
  assert.doesNotMatch(page, /api\/market-quotes\?t=|api\/global-quotes\?t=|api\/gold-history\?period=\$\{period\}&t=/);
  assert.match(historyApi, /GC%3DF/);
  assert.match(historyApi, /periodConfig/);
  assert.match(historyApi, /quotedAt/);
  assert.match(historyApi, /retrievedAt/);
  assert.doesNotMatch(page, /fallbackHistory|fallbackMetals/);
  assert.match(styles, /@media\(max-width:520px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /og-quotes-v2\.png/);
});

test("ships a scheduled, approval-gated news pipeline", async () => {
  const [script, deploy, service, pipeline, migration, admin] = await Promise.all([
    readFile(new URL("../scripts/run-news-pipeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../DEPLOY-LINODE.md", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/news/pipeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_news_pipeline.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/news/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(script, /runNewsPipeline/);
  assert.match(script, /news:pipeline|--manual|cron/);
  assert.match(deploy, /OnCalendar=\*:0\/30/);
  assert.match(deploy, /npm run news:pipeline/);
  assert.match(deploy, /127\.0\.0\.1:3000/);
  assert.match(pipeline, /status = 'published'/);
  assert.match(pipeline, /status = 'approved'/);
  assert.match(pipeline, /news_pipeline_completed/);
  assert.match(migration, /CREATE TABLE `news_candidates`/);
  assert.match(migration, /CREATE TABLE `news_runs`/);
  assert.match(admin, /requireAdmin/);
  assert.doesNotMatch(service, /fetch\(/);
});
