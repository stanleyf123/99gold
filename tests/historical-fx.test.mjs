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
    URL,
    URLSearchParams,
    Buffer,
    process,
    console,
    AbortSignal,
    fetch: () => { throw new Error("fetch should not run in parser tests"); },
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const {
  parseBotHistoryCsv,
  parseBotHistoryHtml,
  parseYahooTwdHistory,
  parseFredDextausCsv,
  pairFxRate,
  pairFxForTimestamp,
  mergeDailyFxRates,
  taipeiCalendarDate,
  monthsInclusive,
  fxHonestyLabel,
  MAX_FX_LOOKBACK_DAYS,
} = load("../lib/historical-fx.ts");

const botCsv = `資料日期,幣別,匯率,現金,即期,遠期10天,遠期30天,遠期60天,遠期90天,遠期120天,遠期150天,遠期180天,匯率,現金,即期,遠期10天,遠期30天,遠期60天,遠期90天,遠期120天,遠期150天,遠期180天
20260914,USD,本行買入,31.30000,31.65000,31.63400,31.58500,31.51900,31.45500,31.38200,31.32000,31.26000,本行賣出,31.97000,31.75000,31.73800,31.69300,31.63500,31.57800,31.51100,31.45500,31.40200,
20260911,USD,本行買入,31.24000,31.59000,31.57500,31.52800,31.45900,31.39800,31.32800,31.25700,31.19800,本行賣出,31.91000,31.69000,31.67900,31.63700,31.57700,31.52200,31.46000,31.39900,31.34800,
`;

test("parses BOT monthly CSV sight-sell as usdTwd", () => {
  const rates = parseBotHistoryCsv(botCsv);
  assert.equal(rates.length, 2);
  assert.equal(rates[0].date, "2026-09-11");
  assert.equal(rates[0].usdTwd, 31.69);
  assert.equal(rates[0].source, "bot-sight-sell");
  assert.equal(rates[1].date, "2026-09-14");
  assert.equal(rates[1].usdTwd, 31.75);
  assert.equal(parseBotHistoryCsv("很抱歉，本次查詢找不到任何一筆資料！").length, 0);
});

test("parses BOT HTML table rows as a fallback", () => {
  const html = `<table><tr><th>掛牌日期</th></tr>
  <tr><td>2026/09/14</td><td>美金 (USD)</td><td>31.3</td><td>31.97</td><td>31.65</td><td>31.75</td></tr></table>`;
  const rates = parseBotHistoryHtml(html);
  assert.equal(rates.length, 1);
  assert.equal(rates[0].usdTwd, 31.75);
});

test("pairs same Taipei day, else nearest prior BOT day, and never a future rate", () => {
  const rates = [
    { date: "2026-09-10", usdTwd: 31.4, source: "bot-sight-sell" },
    { date: "2026-09-11", usdTwd: 31.69, source: "bot-sight-sell" },
    { date: "2026-09-14", usdTwd: 31.75, source: "bot-sight-sell" },
    { date: "2026-09-12", usdTwd: 31.2, source: "yahoo-twd" },
  ];
  assert.equal(pairFxRate("2026-09-11", rates).usdTwd, 31.69);
  assert.equal(pairFxRate("2026-09-12", rates).source, "bot-sight-sell");
  assert.equal(pairFxRate("2026-09-12", rates).date, "2026-09-11");
  assert.equal(pairFxRate("2026-09-13", rates).date, "2026-09-11");
  const monday = pairFxRate("2026-09-14", rates);
  assert.equal(monday.usdTwd, 31.75);
  assert.equal(pairFxRate("2026-08-01", rates), null);
});

test("falls back to Yahoo/FRED only when no BOT rate is within the lookback window", () => {
  const rates = [
    { date: "2026-08-01", usdTwd: 31.1, source: "bot-sight-sell" },
    { date: "2026-09-14", usdTwd: 31.8, source: "yahoo-twd" },
  ];
  const paired = pairFxRate("2026-09-14", rates);
  assert.equal(paired.source, "yahoo-twd");
  assert.equal(paired.usdTwd, 31.8);
  assert.ok(MAX_FX_LOOKBACK_DAYS >= 7);
});

test("omits points rather than inventing FX when nothing is in range", () => {
  assert.equal(pairFxRate("2026-09-14", []), null);
  assert.equal(pairFxForTimestamp(1, [{ date: "2026-09-14", usdTwd: 32, source: "yahoo-twd" }]), null);
});

test("merges sources preferring BOT sight-sell on the same date", () => {
  const merged = mergeDailyFxRates([
    [{ date: "2026-09-14", usdTwd: 31.2, source: "yahoo-twd" }],
    [{ date: "2026-09-14", usdTwd: 31.75, source: "bot-sight-sell" }],
    [{ date: "2026-09-13", usdTwd: 31.6, source: "fred-dextaus" }],
  ]);
  assert.equal(merged.find((row) => row.date === "2026-09-14").usdTwd, 31.75);
  assert.equal(merged.find((row) => row.date === "2026-09-14").source, "bot-sight-sell");
});

test("parses Yahoo TWD=X and FRED DEXTAUS fallbacks, skipping missing FRED dots", () => {
  const yahoo = parseYahooTwdHistory({
    chart: { result: [{ timestamp: [1781478000], indicators: { quote: [{ close: [31.613] }] } }] },
  });
  assert.equal(yahoo.length, 1);
  assert.equal(yahoo[0].source, "yahoo-twd");
  assert.equal(taipeiCalendarDate(1781478000), yahoo[0].date);
  const fred = parseFredDextausCsv("observation_date,DEXTAUS\n2026-09-01,31.6600\n2026-09-02,.\n");
  assert.equal(fred.length, 1);
  assert.equal(fred[0].usdTwd, 31.66);
  assert.equal(fred[0].source, "fred-dextaus");
});

test("lists months inclusively and labels the chart honestly", () => {
  assert.equal(monthsInclusive("2026-08-30", "2026-09-14").join(","), "2026-08,2026-09");
  assert.match(fxHonestyLabel("zh", "bot-sight-sell"), /歷史匯率換算參考/);
  assert.match(fxHonestyLabel("en", "mixed"), /Yahoo TWD=X/);
  assert.match(fxHonestyLabel("ja", "market-reference"), /FRED DEXTAUS/);
});
