import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("../lib/section-quotes.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {}, module: { exports: {} }, Intl, Date, Number, Math, String, Array };
vm.runInNewContext(code, context);
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
} = context.exports;

const quotes = {
  metals: [
    { id: "gold", symbol: "GC=F", name: "黃金期貨", price: 4424.5, change: 18.43, changePercent: 0.42, source: "Yahoo Finance chart" },
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

test("empty quotes keep dashes only when upstream data is missing", () => {
  const view = buildSectionView("jewelry", null);
  assert.equal(view.connected, false);
  assert.equal(view.price, "—");
  assert.equal(view.change, "尚無有效資料");
  assert.equal(marketStatusLabel("open", true), "市場交易中");
  assert.equal(marketStatusLabel("open", false), "行情暫不可用");
  assert.match(formatTaipeiTime("2026-09-14T08:00:00.000Z"), /2026/);
});
