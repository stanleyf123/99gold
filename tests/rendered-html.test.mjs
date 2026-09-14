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
  await access(new URL("../app/og/route.tsx", import.meta.url));
});

test("uses a shared SiteHeader and coherent homepage layout", async () => {
  const [page, homeView, header, chrome, layout, section, jewelryView, globalPage, globalView, news, article, editorial, cover] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/site-chrome.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/JewelryView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/GlobalView.tsx", import.meta.url), "utf8"),
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
  assert.match(header, /useSiteLocale/);
  assert.match(header, /className="languageSwitch menuLanguage"/);
  assert.match(layout, /site-chrome\.css/);
  assert.match(layout, /SiteChrome/);
  assert.match(chrome, /--page-gutter:/);
  assert.match(chrome, /--page-max:\s*1240px/);
  assert.match(chrome, /--hero-height:\s*clamp\(/);
  assert.match(chrome, /heroPhoto/);
  assert.match(chrome, /brandHeroCopy/);
  assert.match(chrome, /\.siteHeader \.languageSwitch:not\(\.menuLanguage\)/);
  assert.doesNotMatch(chrome, /aspect-ratio:\s*1200\/630/);
  assert.doesNotMatch(page, /<SiteHeader/);
  assert.doesNotMatch(homeView, /<SiteHeader/);
  assert.match(page, /getGlobalQuotesOrNull/);
  assert.match(page, /force-dynamic/);
  assert.match(homeView, /useSiteLocale/);
  assert.match(homeView, /className="heroPhoto"/);
  assert.match(homeView, /className="brandHeroCopy"/);
  assert.match(homeView, /今日市場快速判讀/);
  assert.match(homeView, /臺銀美金即期賣出/);
  assert.match(homeView, /BOT USD spot sell/);
  assert.match(homeView, /台湾銀行米ドル直物売り/);
  assert.match(homeView, /新台幣／美元/);
  assert.match(homeView, /bankOfTaiwanUsdSightSell/);
  assert.match(chrome, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(homeView, /Today’s Gold Dashboard/);
  assert.match(homeView, /本日の金情報/);
  assert.match(homeView, /quoteEmptyPanel/);
  assert.match(homeView, /brandHero[\s\S]*marketRadar[\s\S]*marketHub/);
  assert.doesNotMatch(homeView, /marketHub[\s\S]*marketRadar/);
  assert.doesNotMatch(homeView, /brandCover|aspect-ratio:1200\/630/);
  assert.doesNotMatch(section, /<SiteHeader/);
  assert.match(section, /getGlobalQuotesOrNull/);
  assert.match(section, /buildSectionView/);
  assert.match(section, /JewelryView/);
  assert.match(section, /taiwanQianValue/);
  assert.match(section, /redirect\("\/news"\)/);
  assert.match(section, /SectionView/);
  assert.match(jewelryView, /今日買進/);
  assert.match(jewelryView, /Today’s sell \(estimated\)/);
  assert.match(jewelryView, /常見問題/);
  assert.doesNotMatch(section, /此頁尚無可驗證的即時資料/);
  assert.doesNotMatch(globalPage, /<SiteHeader/);
  assert.doesNotMatch(globalPage, /globalNav/);
  assert.match(globalPage, /getGlobalQuotesOrNull/);
  assert.match(globalView, /useSiteLocale/);
  assert.match(globalView, /Global Precious Metals Desk/);
  assert.match(globalView, /世界貴金属相場センター/);
  assert.match(globalView, /buildWorldMarketQuotes/);
  assert.match(globalView, /依國際參考價與匯率換算，非當地交易所結算價／非店家牌價/);
  assert.match(globalView, /not a local exchange settlement or shop quote/);
  assert.match(globalView, /現地取引所の決済価格／店頭掲示価格ではありません/);
  assert.doesNotMatch(news, /<SiteHeader/);
  assert.doesNotMatch(news, /articleNav/);
  assert.match(news, /alt=\{article\.imageAlt\}/);
  assert.doesNotMatch(article, /<SiteHeader/);
  assert.doesNotMatch(editorial, /<SiteHeader/);
  assert.match(editorial, /alt=\{a\.imageAlt\}/);
  assert.match(cover, /onError/);
  assert.match(cover, /coverFallback/);
});

test("keeps one locale source for header, homepage, global and section chrome", async () => {
  const [localeMod, chrome, header, page, homeView, globalPage, globalView, sectionPage, sectionView, jewelryView, recycleCalc] = await Promise.all([
    readFile(new URL("../app/locale.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/GlobalView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/SectionView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/JewelryView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/RecycleCalculator.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(localeMod, /export const LOCALE_STORAGE_KEY = "golden-tide-locale"/);
  assert.match(localeMod, /export const LOCALE_EVENT = "golden-tide-locale"/);
  assert.match(localeMod, /new CustomEvent<Locale>\(LOCALE_EVENT, \{ detail: locale \}\)/);
  assert.match(localeMod, /function LocaleProvider/);
  assert.match(localeMod, /visitor-locale/);
  assert.match(chrome, /LocaleProvider/);
  assert.match(chrome, /<SiteHeader \/>/);
  assert.doesNotMatch(chrome, /<SiteHeader[\s\S]*<SiteHeader/);
  assert.match(header, /setContextLocale/);
  assert.match(homeView, /languageCopy\[locale\]/);
  assert.doesNotMatch(page, /addEventListener\("golden-tide-locale"/);
  assert.doesNotMatch(homeView, /addEventListener\("golden-tide-locale"/);
  assert.match(globalPage, /getGlobalQuotesOrNull/);
  assert.match(globalView, /國際市場參考行情/);
  assert.match(globalView, /International market references/);
  assert.match(globalView, /国際市場の参考相場/);
  assert.match(sectionPage, /SectionView/);
  assert.match(sectionView, /useSiteLocale/);
  assert.match(sectionView, /International Gold/);
  assert.match(sectionView, /国際金価格/);
  assert.match(jewelryView, /Today’s Jewelry Prices/);
  assert.match(sectionView, /Gold Recycling/);
  assert.match(sectionView, /No valid data/);
  assert.match(sectionView, /有効なデータなし/);
  assert.match(sectionView, /section === "recycling"/);
  assert.match(sectionView, /RecycleCalculator/);
  assert.match(recycleCalc, /回收試算/);
  assert.match(recycleCalc, /Recycle estimate/);
  assert.match(recycleCalc, /買取試算/);
  assert.match(recycleCalc, /參考試算、未含耗損／手續費／檢測，非店家成交價。/);
  assert.match(recycleCalc, /recycleEstimateTwd/);
  assert.match(recycleCalc, /taiwanQian/);
  assert.doesNotMatch(recycleCalc, /18000|16,800|假金價/);
});

test("keeps quote history, data transparency and responsive styles wired", async () => {
  const [page, homeView, chart, quoteApi, quoteRoute, historyApi, historyLib, styles, layout, robots, sitemap] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/MarketLineChart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/quotes.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/global-quotes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/gold-history/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/gold-history.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/quotes.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);

  assert.match(homeView, /\["1D", "1W", "1M", "3M", "1Y"\]/);
  assert.match(homeView, /非可成交報價/);
  assert.match(homeView, /來源受限時改列 Gold API XAU\/USD/);
  assert.match(homeView, /不顯示估造價格/);
  assert.match(chart, /ResizeObserver/);
  assert.match(chart, /role="img"/);
  assert.match(quoteApi, /regularMarketDayHigh/);
  assert.match(quoteApi, /sessionOpen/);
  assert.match(quoteApi, /api\.gold-api\.com\/price/);
  assert.match(quoteApi, /Resolve gold first/);
  assert.match(quoteApi, /quotedAt: gold\.quotedAt/);
  assert.match(quoteApi, /retrievedAt/);
  assert.match(quoteApi, /\["TWD", "HKD", "CNY", "JPY", "EUR", "GBP", "SGD"\]/);
  assert.match(quoteRoute, /getGlobalQuotes/);
  assert.match(quoteRoute, /lib\/quotes/);
  assert.match(homeView, /行情時間/);
  assert.match(homeView, /本站檢查/);
  assert.match(homeView, /週末休市/);
  assert.doesNotMatch(homeView, /api\/market-quotes\?t=|api\/global-quotes\?t=|api\/gold-history\?period=\$\{period\}&t=/);
  assert.match(historyLib, /encodeURIComponent\(symbol\)/);
  assert.match(historyLib, /GC=F/);
  assert.match(historyLib, /historyPeriodConfig/);
  assert.match(historyLib, /"3Y"/);
  assert.match(historyLib, /"5Y"/);
  assert.match(historyLib, /windowHistoryPoints/);
  assert.match(historyApi, /getGoldHistory/);
  assert.match(historyLib, /quotedAt/);
  assert.match(historyLib, /retrievedAt/);
  assert.doesNotMatch(homeView, /fallbackHistory|fallbackMetals/);
  assert.match(styles, /@media\(max-width:520px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /DEFAULT_OG_IMAGE/);
  assert.match(page, /getGlobalQuotesOrNull/);
  assert.match(robots, /\/admin/);
  assert.match(sitemap, /\/jewelry/);
  assert.match(sitemap, /\/international/);
  assert.match(sitemap, /\/recycling/);
  assert.match(sitemap, /\/global/);
});

test("ships a scheduled auto-publish news pipeline", async () => {
  const [script, deploy, service, pipeline, migration, translations, admin, sources, newsPage, homeView] = await Promise.all([
    readFile(new URL("../scripts/run-news-pipeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../DEPLOY-LINODE.md", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/news/pipeline.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_news_pipeline.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0005_news_translations.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/news/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/news/source-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/news/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeView.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(script, /runNewsPipeline/);
  assert.match(script, /news:pipeline|--manual|cron/);
  assert.match(deploy, /OnCalendar=0\/3:00:00/);
  assert.match(deploy, /99gold-news\.timer/);
  assert.match(deploy, /npm run news:pipeline/);
  assert.match(deploy, /127\.0\.0\.1:3000/);
  assert.match(deploy, /Akamai Access Denied HTML 403/);
  assert.match(deploy, /ons\.gov\.uk\/releasecalendar\?rss/);
  assert.match(deploy, /hm-treasury/);
  assert.match(deploy, /db:migrate/);
  assert.doesNotMatch(deploy, /快訊仍須在 `\/admin` 核准/);
  assert.match(pipeline, /status = 'published'/);
  assert.match(pipeline, /status IN \('pending', 'approved'\)/);
  assert.match(pipeline, /AUTO_PIPELINE_REVIEWER/);
  assert.match(pipeline, /translateOfficialBrief/);
  assert.match(pipeline, /news_pipeline_completed/);
  assert.match(migration, /CREATE TABLE `news_candidates`/);
  assert.match(migration, /CREATE TABLE `news_runs`/);
  assert.match(translations, /title_zh/);
  assert.match(translations, /translation_provider/);
  assert.match(admin, /requireAdmin/);
  assert.match(admin, /currentSourceHealth/);
  assert.match(sources, /ons-release-calendar/);
  assert.match(sources, /hm-treasury-news/);
  assert.doesNotMatch(sources, /bank-of-england-speeches/);
  assert.doesNotMatch(service, /fetch\(/);
  assert.match(service, /localizedBriefFields/);
  assert.match(newsPage, /無需人工核准/);
  assert.doesNotMatch(newsPage, /經管理者核准/);
  assert.match(homeView, /自動檢查、翻譯並上架/);
});

test("wires 30-90 day charts, metal comparison, browser alerts, OG route and PWA shell", async () => {
  const [
    jewelryView,
    sectionView,
    sectionPage,
    globalView,
    homeView,
    chart,
    alerts,
    alertsLib,
    og,
    seo,
    layout,
    manifest,
    sw,
    pwa,
    newsPage,
    excerpt,
    newsService,
  ] = await Promise.all([
    readFile(new URL("../app/[section]/JewelryView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/SectionView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/GlobalView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PriceHistoryChart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PriceAlerts.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/price-alerts.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/og/route.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/seo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../app/PwaRegister.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/news/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/news-excerpt.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/news-service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(sectionPage, /getGoldHistoryOrNull\("1M"\)/);
  assert.match(jewelryView, /PriceHistoryChart/);
  assert.match(jewelryView, /近 30／90 日/);
  assert.match(sectionView, /section === "international"/);
  assert.match(sectionView, /PriceHistoryChart/);
  assert.match(chart, /endpoint = "\/api\/gold-history"/);
  assert.match(chart, /\$\{endpoint\}\?period=\$\{period\}/);
  assert.match(globalView, /metalCompare/);
  assert.match(globalView, /金銀鉑鈀對照/);
  assert.match(globalView, /Gold \/ silver \/ platinum \/ palladium/);
  assert.match(homeView, /<PriceAlerts/);
  assert.match(globalView, /<PriceAlerts/);
  assert.match(alerts, /Notification.requestPermission/);
  assert.match(alerts, /LINE／Email/);
  assert.match(alertsLib, /PRICE_ALERTS_STORAGE_KEY/);
  assert.match(og, /ImageResponse/);
  assert.match(og, /taiwanQianValue/);
  assert.match(seo, /DEFAULT_OG_IMAGE = "\/og"/);
  assert.match(layout, /manifest: "\/manifest.webmanifest"/);
  assert.match(layout, /PwaRegister/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(sw, /99gold-quotes-v1/);
  assert.match(sw, /\/api\/global-quotes/);
  assert.match(sw, /pathname.startsWith\("\/admin"\)/);
  assert.match(pwa, /serviceWorker.register\("\/sw.js"\)/);
  assert.match(pwa, /行情時間／本站檢查/);
  assert.match(newsPage, /newsExcerpt/);
  assert.match(newsPage, /newsEmpty/);
  assert.match(excerpt, /newsExcerpt/);
  assert.match(newsService, /localizedBriefFields/);
});

test("wires gold/silver ratio math, history API, and charts on global, international and home", async () => {
  const [ratioLib, ratioApi, panel, globalView, globalPage, sectionView, sectionPage, homeView, homePage, chart] = await Promise.all([
    readFile(new URL("../lib/gold-silver-ratio.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/gold-silver-ratio/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/GoldSilverRatio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/GlobalView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/SectionView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[section]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeView.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PriceHistoryChart.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(ratioLib, /goldUsdPerOz \/ silverUsdPerOz/);
  assert.match(ratioLib, /SI=F/);
  assert.match(ratioLib, /return null/);
  assert.match(ratioApi, /getGoldSilverRatioHistory/);
  assert.match(panel, /金銀比/);
  assert.match(panel, /Gold\/silver ratio/);
  assert.match(panel, /數字愈高，代表相對白銀、黃金愈貴/);
  assert.match(panel, /A higher number means gold is expensive versus silver/);
  assert.match(panel, /数値が高いほど、銀に対して金が高い/);
  assert.match(panel, /\/api\/gold-silver-ratio/);
  assert.match(globalView, /GoldSilverRatioPanel/);
  assert.match(globalPage, /getGoldSilverRatioHistoryOrNull/);
  assert.match(sectionView, /GoldSilverRatioPanel/);
  assert.match(sectionPage, /section === "international" \? getGoldSilverRatioHistoryOrNull/);
  assert.match(homeView, /GoldSilverRatioPanel/);
  assert.match(homePage, /getGoldSilverRatioHistoryOrNull/);
  assert.match(chart, /endpoint/);
  assert.match(panel, /\["1M", "3M", "1Y", "3Y", "5Y"\]/);
  assert.match(panel, /1Y \/ 3Y \/ 5Y/);
  assert.match(chart, /case "5Y"/);
  assert.match(chart, /資料不足/);
  assert.match(ratioLib, /interval: "1d"/);
  assert.match(ratioLib, /downsampleToUtcWeekCloses/);
  assert.match(ratioApi, /isRatioHistoryPeriod/);
});
