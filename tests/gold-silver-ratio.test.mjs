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
  windowHistoryPoints,
  downsampleToUtcWeekCloses,
  boundHistoryPoints,
  isHistoryPeriod,
  isRatioHistoryPeriod,
} = history;
const {
  goldSilverRatio,
  formatGoldSilverRatio,
  ratioHistoryPoints,
  buildGoldSilverRatioHistory,
  utcDayKey,
  ratioChartPoints,
  ratioHistoryCoverage,
  RATIO_CHART_MAX_POINTS,
} = load("../lib/gold-silver-ratio.ts", { "./gold-history": history });

const NOW = 1_789_200_000; // 2026-09-12-ish UTC, a Saturday

function weekdayCloses(endSec, calendarDays) {
  const points = [];
  for (let day = calendarDays; day >= 0; day -= 1) {
    const timestamp = endSec - day * 86_400;
    const weekday = new Date(timestamp * 1000).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    points.push({ timestamp, close: 2000 + (calendarDays - day) });
  }
  return points;
}

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

test("period helpers accept 1Y, 3Y and 5Y ratio windows", () => {
  assert.equal(isHistoryPeriod("3Y"), true);
  assert.equal(isHistoryPeriod("5Y"), true);
  assert.equal(isRatioHistoryPeriod("1Y"), true);
  assert.equal(isRatioHistoryPeriod("1D"), false);
});

test("range windows clip 1Y/3Y/5Y and keep longer ranges strictly larger", () => {
  const points = weekdayCloses(NOW, 365 * 6 + 10);
  const oneYear = windowHistoryPoints(points, "1Y", NOW);
  const threeYear = windowHistoryPoints(points, "3Y", NOW);
  const fiveYear = windowHistoryPoints(points, "5Y", NOW);
  assert.ok(oneYear.length >= 240 && oneYear.length <= 270, `1Y length ${oneYear.length}`);
  assert.ok(threeYear.length >= 740 && threeYear.length <= 800, `3Y length ${threeYear.length}`);
  assert.ok(fiveYear.length >= 1240 && fiveYear.length <= 1320, `5Y length ${fiveYear.length}`);
  assert.ok(oneYear.length < threeYear.length);
  assert.ok(threeYear.length < fiveYear.length);
  assert.ok(fiveYear.length <= points.length);
  assert.ok(oneYear.every((point) => point.timestamp >= NOW - 365 * 86_400));
  assert.ok(threeYear.every((point) => point.timestamp >= NOW - 365 * 3 * 86_400));
  assert.ok(fiveYear.every((point) => point.timestamp >= NOW - 365 * 5 * 86_400));
  const oneMonth = windowHistoryPoints(points, "1M", NOW);
  const threeMonth = windowHistoryPoints(points, "3M", NOW);
  assert.ok(oneMonth.length >= 18 && oneMonth.length <= 23, `1M length ${oneMonth.length}`);
  assert.ok(threeMonth.length >= 60 && threeMonth.length <= 70, `3M length ${threeMonth.length}`);
  assert.ok(oneMonth.length < threeMonth.length);
  assert.ok(threeMonth.length < oneYear.length);
});

test("3Y/5Y chart series is bounded and only uses real paired closes", () => {
  const daily = weekdayCloses(NOW, 365 * 5);
  const weekly = downsampleToUtcWeekCloses(daily);
  const bounded = boundHistoryPoints(weekly, RATIO_CHART_MAX_POINTS);
  const chart = ratioChartPoints(daily, "5Y");
  assert.ok(weekly.length < daily.length);
  assert.ok(weekly.length <= 280);
  assert.ok(chart.length <= RATIO_CHART_MAX_POINTS);
  assert.ok(chart.length < daily.length);
  assert.equal(chart[0].timestamp, daily[0].timestamp);
  assert.equal(chart.at(-1).timestamp, daily.at(-1).timestamp);
  const dailyByTs = new Map(daily.map((point) => [point.timestamp, point.close]));
  for (const point of [...weekly, ...bounded, ...chart]) {
    assert.equal(dailyByTs.get(point.timestamp), point.close);
  }
});

test("builder windows 5Y from daily pairs, omits unmatched days, and does not invent prices", () => {
  const gold = weekdayCloses(NOW, 365 * 6);
  const silver = gold
    .filter((_, index) => index % 7 !== 3)
    .map((point) => ({ timestamp: point.timestamp, close: 50 }));
  const source = {
    quotedAt: "2026-09-14T00:00:00.000Z",
    retrievedAt: "2026-09-14T00:00:00.000Z",
    source: "COMEX GC",
  };
  const built = buildGoldSilverRatioHistory("5Y", { ...source, points: gold }, { points: silver, source: "COMEX SI" }, NOW);
  const oneYear = buildGoldSilverRatioHistory("1Y", { ...source, points: gold }, { points: silver, source: "COMEX SI" }, NOW);
  const threeYear = buildGoldSilverRatioHistory("3Y", { ...source, points: gold }, { points: silver, source: "COMEX SI" }, NOW);
  assert.equal(built.sampled, "weekly");
  assert.equal(oneYear.sampled, "daily");
  assert.ok(oneYear.pairedDays < threeYear.pairedDays);
  assert.ok(threeYear.pairedDays < built.pairedDays);
  assert.ok(built.points.length <= RATIO_CHART_MAX_POINTS);
  assert.ok(built.pairedDays > built.points.length);
  assert.equal(built.coverage, "full");
  const dailyPairs = windowHistoryPoints(ratioHistoryPoints(gold, silver), "5Y", NOW);
  assert.equal(built.pairedDays, dailyPairs.length);
  assert.equal(built.stats.close, dailyPairs.at(-1).close);
  assert.equal(built.stats.high, Math.max(...dailyPairs.map((point) => point.close)));
  const goldByDay = new Map(gold.map((point) => [utcDayKey(point.timestamp), point.close]));
  const silverByDay = new Map(silver.map((point) => [utcDayKey(point.timestamp), point.close]));
  for (const point of built.points) {
    const g = goldByDay.get(utcDayKey(point.timestamp));
    const s = silverByDay.get(utcDayKey(point.timestamp));
    assert.ok(g > 0 && s > 0);
    assert.equal(point.close, g / s);
  }
  const short = buildGoldSilverRatioHistory(
    "5Y",
    { ...source, points: gold.slice(-80) },
    { points: silver.slice(-80), source: "COMEX SI" },
    NOW,
  );
  assert.equal(short.coverage, "partial");
  assert.equal(ratioHistoryCoverage("5Y", gold.slice(-80), NOW), "partial");
});
