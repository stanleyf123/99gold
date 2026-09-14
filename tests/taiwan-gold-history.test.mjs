import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function loadCjs(relativePath, requireMap = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  const context = {
    exports: module.exports,
    module,
    require: (id) => {
      if (id in requireMap) return requireMap[id];
      throw new Error(`unexpected require: ${id}`);
    },
    Intl,
    Date,
    Number,
    Math,
    String,
    Array,
    Promise,
  };
  vm.runInNewContext(code, context);
  return module.exports;
}

const sectionQuotes = loadCjs("../lib/section-quotes.ts");
const {
  buildTaiwanGoldHistory,
  sessionDate,
  summarizeSellRange,
} = loadCjs("../lib/taiwan-gold-history.ts", {
  "./section-quotes": sectionQuotes,
  "./yahoo-chart": { fetchYahooChartCloses: async () => null },
});

const day = (close, usdTwd, timestamp) => {
  const gold = [{ timestamp, close }];
  const fx = [{ timestamp, close: usdTwd }];
  return buildTaiwanGoldHistory(gold, fx, null, 30);
};

test("session dates use the New York calendar day of the bar", () => {
  const first = sessionDate(1_700_000_000);
  assert.match(first, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(first, sessionDate(1_700_086_400));
});

test("converts GC and USD/TWD into buy, 4% sell and purity recycle columns", () => {
  const buy = sectionQuotes.qianFromGoldUsd(4400, 32);
  const history = day(4400, 32, 1_736_449_200);
  assert.ok(history);
  assert.equal(history.days.length, 1);
  assert.equal(history.days[0].buyQian, buy);
  assert.equal(history.days[0].sellQian, sectionQuotes.jewelrySellFromBuy(buy));
  assert.equal(history.days[0].recycleFine, buy);
  assert.equal(history.days[0].recycle916, sectionQuotes.recycleEstimateTwd(buy, 0.916));
  assert.equal(history.days[0].fxPaired, true);
  assert.equal(history.fxMode, "daily");
});

test("carries FX forward and can fall back to the latest rate without inventing gold", () => {
  const gold = [
    { timestamp: 1_736_449_200, close: 4400 },
    { timestamp: 1_736_535_600, close: 4420 },
  ];
  const carried = buildTaiwanGoldHistory(gold, [{ timestamp: 1_736_449_200, close: 32 }], null, 30);
  assert.equal(carried.days.length, 2);
  assert.equal(carried.days[0].fxPaired, false);
  assert.equal(carried.days[1].fxPaired, true);
  assert.equal(carried.days[0].changeQian, carried.days[0].sellQian - carried.days[1].sellQian);

  const latestOnly = buildTaiwanGoldHistory(gold, [], 31.5, 30);
  assert.equal(latestOnly.fxMode, "latest");
  assert.ok(latestOnly.days.every((row) => row.fxPaired === false && row.usdTwd === 31.5));
  assert.equal(buildTaiwanGoldHistory(gold, [], null), null);
});

test("30-session sell range uses only computed rows", () => {
  const gold = Array.from({ length: 5 }, (_, index) => ({ timestamp: 1_736_449_200 + index * 86_400, close: 4400 + index * 10 }));
  const fx = gold.map((point) => ({ timestamp: point.timestamp, close: 32 }));
  const history = buildTaiwanGoldHistory(gold, fx, null, 4);
  assert.equal(history.days.length, 4);
  assert.equal(history.range.count, 4);
  const sells = history.days.map((row) => row.sellQian);
  const range = summarizeSellRange(history.days);
  assert.equal(range.high, Math.max(...sells));
  assert.equal(range.low, Math.min(...sells));
  assert.equal(range.basis, "sell");
});
