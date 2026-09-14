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
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const history = load("../lib/gold-history.ts");
const {
  goldSilverRatio,
  formatGoldSilverRatio,
  ratioHistoryPoints,
  buildGoldSilverRatioHistory,
  utcDayKey,
} = load("../lib/gold-silver-ratio.ts", { "./gold-history": history });

test("gold/silver ratio is gold USD/oz divided by silver USD/oz", () => {
  assert.equal(goldSilverRatio(4000, 50), 80);
  assert.equal(goldSilverRatio(4324.5, 63.52).toFixed(2), "68.08");
});

test("missing or non-positive metals never invent a ratio", () => {
  assert.equal(goldSilverRatio(4000, Number.NaN), null);
  assert.equal(goldSilverRatio(Number.NaN, 50), null);
  assert.equal(goldSilverRatio(4000, 0), null);
  assert.equal(goldSilverRatio(0, 50), null);
  assert.equal(goldSilverRatio(-1, 50), null);
  assert.equal(formatGoldSilverRatio(null), "—");
  assert.equal(formatGoldSilverRatio(80), "80.00");
});

test("history joins gold and silver closes by UTC day and skips unmatched sessions", () => {
  const day = 17_000 * 86_400;
  const gold = [
    { timestamp: day + 100, close: 4000 },
    { timestamp: day + 86_400 + 100, close: 4100 },
    { timestamp: day + 86_400 * 2 + 100, close: 4200 },
  ];
  const silver = [
    { timestamp: day + 80, close: 50 },
    { timestamp: day + 86_400 * 2 + 40, close: 40 },
  ];
  const points = ratioHistoryPoints(gold, silver);
  assert.equal(points.length, 2);
  assert.equal(points[0].close, 80);
  assert.equal(points[1].close, 105);
  assert.equal(utcDayKey(points[0].timestamp), utcDayKey(day + 100));
});

test("history builder refuses to fabricate a series without both metals", () => {
  const gold = {
    points: [{ timestamp: 1, close: 4000 }, { timestamp: 2, close: 4100 }],
    quotedAt: "2026-09-14T00:00:00.000Z",
    retrievedAt: "2026-09-14T00:00:00.000Z",
    source: "COMEX GC",
  };
  assert.throws(() => buildGoldSilverRatioHistory("1M", gold, { points: [], source: "COMEX SI" }));
  const built = buildGoldSilverRatioHistory("1M", gold, {
    points: [{ timestamp: 1, close: 50 }, { timestamp: 2, close: 50 }],
    source: "COMEX SI",
  });
  assert.equal(built.points.length, 2);
  assert.equal(built.stats.close, 82);
});
