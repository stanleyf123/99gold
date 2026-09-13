import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("build emits the complete 99gold professional quote workspace", async () => {
  const assetsRoot = new URL("../dist/client/assets/", import.meta.url);
  const assetNames = await readdir(assetsRoot);
  const pageBundles = assetNames.filter((name) => /^page-.*\.js$/.test(name));
  const bundleText = (await Promise.all(pageBundles.map((name) => readFile(new URL(name, assetsRoot), "utf8")))).join("\n");

  assert.match(bundleText, /99GOLD PROFESSIONAL QUOTES/);
  assert.match(bundleText, /專業黃金報價/);
  assert.match(bundleText, /GC=F/);
  assert.match(bundleText, /COMEX/);
  assert.match(bundleText, /台灣黃金換算/);
  assert.match(bundleText, /全球貴金屬比較/);
  assert.match(bundleText, /歷史金價/);
  assert.doesNotMatch(bundleText, /Your site is taking shape|codex-preview/);
  await access(new URL("../dist/client/og-quotes-v2.png", import.meta.url));
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
  assert.match(page, /不是現貨 XAU\/USD/);
  assert.match(page, /不顯示估造價格/);
  assert.match(chart, /ResizeObserver/);
  assert.match(chart, /role="img"/);
  assert.match(quoteApi, /regularMarketDayHigh/);
  assert.match(historyApi, /GC%3DF/);
  assert.match(historyApi, /periodConfig/);
  assert.doesNotMatch(page, /fallbackHistory|fallbackMetals/);
  assert.match(styles, /@media\(max-width:520px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(layout, /og-quotes-v2\.png/);
});
