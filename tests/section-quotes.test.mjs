import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path, requireMap = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: (id) => {
      if (requireMap[id]) return requireMap[id];
      throw new Error(`unexpected require: ${id}`);
    },
    Intl,
    Date,
    Number,
    Math,
    String,
    Array,
    Map,
    Set,
    JSON,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const historicalFx = load("../lib/historical-fx.ts");
const {
  JEWELRY_SELL_PREMIUM_RATE,
  RECYCLE_PURITY,
  parseQuotedNumber,
  jewelrySellFromBuy,
  recycleFromQian,
  recycleEstimateTwd,
  parseCustomPurityPercent,
  weightToQian,
  taiwanQianValue,
  buildSectionView,
  formatTaipeiTime,
  marketStatusLabel,
  qianFromUsdOz,
  jewelryHistoryRows,
  jewelryRangeFromRows,
  jewelryLiveExtras,
  jewelryFaqEntries,
} = load("../lib/section-quotes.ts", { "./historical-fx": historicalFx });

const quotes = {
  metals: [
    { id: "gold", symbol: "GC=F", name: "黃金期貨", price: 4424.5, previousClose: 4400, change: 18.43, changePercent: 0.42, source: "Yahoo Finance chart" },
    { id: "silver", symbol: "SI=F", name: "白銀期貨", price: 54.31, change: 0.6, changePercent: 1.12, source: "Yahoo Finance chart" },
    { id: "platinum", symbol: "PL=F", name: "鉑金期貨", price: 1410.2, change: -2.1, changePercent: -0.15, source: "Yahoo Finance chart" },
  ],
  items: [
    { id: "gold-reference", label: "COMEX 黃金期貨參考", price: "4,424.50", unit: "美元／金衡盎司", change: "+0.42% · 期貨參考" },
    { id: "taiwan-qian", label: "台灣理論買進成本", price: "16,560", unit: "新台幣／錢", change: "未含銀樓價差與費用" },
    { id: "taiwan-gram", label: "黃金每公克", price: "4,416", unit: "新台幣／公克", change: "未含銀樓價差與費用" },
  ],
  quotedAt: "2026-09-14T08:00:00.000Z",
  retrievedAt: "2026-09-14T08:01:00.000Z",
  source: "Yahoo Finance chart · 臺灣銀行美元即期牌告",
  marketStatus: "open",
  currencies: { TWD: 32 },
};

test("parses locale-formatted taiwan-qian prices", () => {
  assert.equal(parseQuotedNumber("16,560"), 16560);
  assert.equal(taiwanQianValue(quotes.items), 16560);
  assert.equal(taiwanQianValue([]), null);
});

test("jewelry sell applies a labeled 4% premium to taiwan-qian", () => {
  assert.equal(JEWELRY_SELL_PREMIUM_RATE, 0.04);
  assert.equal(jewelrySellFromBuy(16560), 17222);
  const view = buildSectionView("jewelry", quotes);
  assert.equal(view.connected, true);
  assert.equal(view.price, "17,222");
  assert.match(view.change, /估計溢價 4%/);
  assert.equal(view.cards[0].price, "16,560");
  assert.equal(view.cards[1].price, "17,222");
  assert.match(view.cards[1].change, /非店家牌價/);
  assert.doesNotMatch(view.price, /—/);
});

test("recycling scales taiwan-qian by 999.9 / 916 / 750 purity", () => {
  assert.equal(recycleFromQian(16560, RECYCLE_PURITY["999.9"]), 16560);
  assert.equal(recycleFromQian(16560, RECYCLE_PURITY["916"]), 15169);
  assert.equal(recycleFromQian(16560, RECYCLE_PURITY["750"]), 12420);
  const view = buildSectionView("recycling", quotes);
  assert.equal(view.cards[0].price, "16,560");
  assert.equal(view.cards[1].price, "15,169");
  assert.equal(view.cards[2].price, "12,420");
  assert.match(view.note, /實際回收請向店家確認/);
});

test("recycle estimate multiplies taiwan-qian by weight, unit and purity", () => {
  assert.equal(weightToQian(10, "qian"), 10);
  assert.equal(weightToQian(3.75, "gram"), 1);
  assert.equal(weightToQian(1, "tael"), 10);
  assert.equal(recycleEstimateTwd(16560, 10, "qian", RECYCLE_PURITY["999.9"]), 165600);
  assert.equal(recycleEstimateTwd(16560, 1, "tael", RECYCLE_PURITY["999.9"]), 165600);
  assert.equal(recycleEstimateTwd(16560, 3.75, "gram", RECYCLE_PURITY["999.9"]), 16560);
  assert.equal(recycleEstimateTwd(16560, 10, "qian", RECYCLE_PURITY["916"]), 151690);
  assert.equal(recycleEstimateTwd(16560, 10, "qian", parseCustomPurityPercent("75")), 124200);
  assert.equal(recycleEstimateTwd(16560, 0, "qian", 1), null);
  assert.equal(recycleEstimateTwd(Number.NaN, 10, "qian", 1), null);
  assert.equal(parseCustomPurityPercent("99.99"), 0.9999);
  assert.equal(parseCustomPurityPercent("0"), null);
  assert.equal(parseCustomPurityPercent("101"), null);
});

test("international section uses live metal prices in USD/oz", () => {
  const view = buildSectionView("international", quotes);
  assert.equal(view.price, "4,424.50");
  assert.match(view.unit, /USD\/oz/);
  assert.equal(view.cards.length, 3);
  assert.match(view.cards[0].name, /GC=F/);
  assert.match(view.cards[1].name, /SI=F/);
  assert.match(view.note, /Yahoo Finance/);
});

test("jewelry stays empty when gold exists but taiwan-qian is missing", () => {
  const view = buildSectionView("jewelry", { ...quotes, items: quotes.items.filter((item) => item.id !== "taiwan-qian") });
  assert.equal(view.connected, false);
  assert.equal(view.price, "—");
});

test("jewelry live extras and history rows use existing quote math", () => {
  assert.equal(qianFromUsdOz(2000, 32), Math.round(2000 * 32 / 31.1034768 * 3.75));
  const extras = jewelryLiveExtras(quotes);
  assert.equal(extras?.buy, 16560);
  assert.equal(extras?.sell, 17222);
  assert.equal(extras?.sellChange, 17222 - jewelrySellFromBuy(qianFromUsdOz(4400, quotes.currencies.TWD)));
  const rows = jewelryHistoryRows([
    { timestamp: 1, close: 2000 },
    { timestamp: 2, close: 2100 },
  ], 32);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].buy, qianFromUsdOz(2000, 32));
  assert.equal(rows[0].sell, jewelrySellFromBuy(rows[0].buy));
  assert.equal(rows[0].recycleFine, recycleFromQian(rows[0].buy, 1));
  assert.equal(rows[0].change, null);
  assert.equal(rows[1].change, rows[1].sell - rows[0].sell);
  const range = jewelryRangeFromRows(rows);
  assert.equal(range?.count, 2);
  assert.equal(range?.sellHigh, Math.max(rows[0].sell, rows[1].sell));
  const faq = jewelryFaqEntries(extras);
  assert.equal(faq.length, 6);
  assert.match(faq[0].answer, /16,560/);
  assert.match(faq[1].answer, /4%/);
  assert.match(faq[5].answer, /歷史匯率換算參考/);
  assert.match(faq[5].answer, /最近前一營業日/);
});

test("jewelry history rows pair each close with same-day FX and omit missing rates", () => {
  const friday = Date.parse("2026-09-11T04:00:00Z") / 1000;
  const saturday = Date.parse("2026-09-12T04:00:00Z") / 1000;
  const monday = Date.parse("2026-09-14T04:00:00Z") / 1000;
  const rates = [
    { date: "2026-09-11", usdTwd: 31.5, source: "bot-sight-sell" },
    { date: "2026-09-14", usdTwd: 32.0, source: "bot-sight-sell" },
  ];
  const rows = jewelryHistoryRows([
    { timestamp: friday, close: 2000 },
    { timestamp: saturday, close: 2000 },
    { timestamp: monday, close: 2100 },
    { timestamp: Date.parse("2026-08-01T00:00:00Z") / 1000, close: 1800 },
  ], rates);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].usdTwd, 31.5);
  assert.equal(rows[0].fxDate, "2026-09-11");
  assert.equal(rows[1].usdTwd, 31.5);
  assert.equal(rows[1].fxDate, "2026-09-11");
  assert.equal(rows[2].usdTwd, 32);
  assert.equal(rows[2].buy, qianFromUsdOz(2100, 32));
  assert.notEqual(rows[0].buy, qianFromUsdOz(2000, 32));
});

test("empty quotes keep dashes only when upstream data is missing", () => {
  const view = buildSectionView("jewelry", null);
  assert.equal(view.connected, false);
  assert.equal(view.price, "—");
  assert.equal(view.change, "尚無有效資料");
  assert.equal(marketStatusLabel("open", true), "市場交易中");
  assert.equal(marketStatusLabel("open", false), "行情暫不可用");
  assert.match(formatTaipeiTime("2026-09-14T08:00:00.000Z"), /2026/);
});
