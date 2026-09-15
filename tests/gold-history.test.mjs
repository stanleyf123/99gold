import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(path) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: (id) => {
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

const {
  historyPointsFromCloses,
  buildMetalHistory,
  isSilverHistoryPeriod,
  isMetalChartPeriod,
  isHistoryPeriod,
  resolveMetalHistorySymbol,
  SILVER_HISTORY_PERIODS,
  METAL_CHART_PERIODS,
  PLATINUM_YAHOO_SYMBOL,
  PALLADIUM_YAHOO_SYMBOL,
} = load("../lib/gold-history.ts");

test("silver history periods are 1M / 3M / 1Y and reuse gold helpers", () => {
  assert.deepEqual([...SILVER_HISTORY_PERIODS], ["1M", "3M", "1Y"]);
  assert.deepEqual([...METAL_CHART_PERIODS], ["1M", "3M", "1Y"]);
  assert.equal(isSilverHistoryPeriod("1M"), true);
  assert.equal(isSilverHistoryPeriod("3M"), true);
  assert.equal(isSilverHistoryPeriod("1Y"), true);
  assert.equal(isSilverHistoryPeriod("5Y"), false);
  assert.equal(isMetalChartPeriod("1Y"), true);
  assert.equal(isHistoryPeriod("1Y"), true);
});

test("PT=F aliases to Yahoo PL=F; PA=F is palladium", () => {
  assert.equal(resolveMetalHistorySymbol("PT=F"), "PL=F");
  assert.equal(resolveMetalHistorySymbol("pt=f"), "PL=F");
  assert.equal(resolveMetalHistorySymbol("PL=F"), "PL=F");
  assert.equal(resolveMetalHistorySymbol("PA=F"), "PA=F");
  assert.equal(resolveMetalHistorySymbol("SI=F"), "SI=F");
  assert.equal(resolveMetalHistorySymbol("GC=F"), "GC=F");
  assert.equal(resolveMetalHistorySymbol("XPT=F"), null);
  assert.equal(PLATINUM_YAHOO_SYMBOL, "PL=F");
  assert.equal(PALLADIUM_YAHOO_SYMBOL, "PA=F");
});

test("history helper omits missing closes and never invents prices", () => {
  const day = 17_000 * 86_400;
  const points = historyPointsFromCloses(
    [day, day + 86_400, day + 2 * 86_400, day + 3 * 86_400],
    [32.1, null, Number.NaN, 33.4],
  );
  assert.equal(points.length, 2);
  assert.equal(points[0].timestamp, day);
  assert.equal(points[0].close, 32.1);
  assert.equal(points[1].timestamp, day + 3 * 86_400);
  assert.equal(points[1].close, 33.4);
});

test("buildMetalHistory for SI=F drops unmatched days and keeps real closes", () => {
  const day = 17_000 * 86_400;
  const built = buildMetalHistory(
    "SI=F",
    "1M",
    [day, day + 86_400, day + 2 * 86_400],
    [30, null, 31.5],
    { currency: "USD", exchangeName: "COMEX" },
    "2026-09-14T00:00:00.000Z",
  );
  assert.equal(built.period, "1M");
  assert.equal(built.points.length, 2);
  assert.equal(built.points[0].close, 30);
  assert.equal(built.points[1].close, 31.5);
  assert.equal(built.stats.open, 30);
  assert.equal(built.stats.close, 31.5);
  assert.match(built.source, /SI futures/);
  assert.equal(built.currency, "USD");
});

test("silver history builder refuses to invent a series from a single valid close", () => {
  assert.throws(
    () => buildMetalHistory("SI=F", "1M", [1, 2, 3], [null, 40, undefined]),
    /history data missing/,
  );
});

test("buildMetalHistory for PL=F and PA=F omits missing days and never invents prices", () => {
  const day = 17_000 * 86_400;
  const platinum = buildMetalHistory(
    "PL=F",
    "1M",
    [day, day + 86_400, day + 2 * 86_400],
    [1480, null, 1492.5],
    { currency: "USD", exchangeName: "NYMEX" },
    "2026-09-14T00:00:00.000Z",
  );
  assert.equal(platinum.points.length, 2);
  assert.equal(platinum.points[0].close, 1480);
  assert.equal(platinum.points[1].close, 1492.5);
  assert.equal(platinum.stats.open, 1480);
  assert.equal(platinum.stats.close, 1492.5);
  assert.match(platinum.source, /PL futures/);
  assert.equal(platinum.currency, "USD");

  const palladium = buildMetalHistory(
    "PA=F",
    "3M",
    [day, day + 86_400, day + 2 * 86_400, day + 3 * 86_400],
    [1100, Number.NaN, undefined, 1112],
    { currency: "USD", exchangeName: "NYM" },
    "2026-09-14T00:00:00.000Z",
  );
  assert.equal(palladium.points.length, 2);
  assert.equal(palladium.points[0].close, 1100);
  assert.equal(palladium.points[1].close, 1112);
  assert.match(palladium.source, /PA futures/);
});
