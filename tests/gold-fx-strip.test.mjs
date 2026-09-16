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
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const historicalFx = load("../lib/historical-fx.ts");
const section = load("../lib/section-quotes.ts", { "./historical-fx": historicalFx });
const world = load("../lib/world-markets.ts", { "./section-quotes": section });
const { buildGoldFxQuotes, formatGoldFxValue } = load("../lib/gold-fx-strip.ts", { "./world-markets": world });

test("converts USD/oz into EUR JPY CNY and keeps Taiwan qian separate", () => {
  const rows = buildGoldFxQuotes({
    goldUsdPerOz: 4000,
    taiwanQian: 16200,
    currencies: { USD: 1, EUR: 0.92, JPY: 150, CNY: 7.2, TWD: 32 },
  });
  const byCode = Object.fromEntries(rows.map((row) => [row.code, row]));
  assert.equal(byCode.TWD.value, 16200);
  assert.equal(byCode.USD.value, 4000);
  assert.equal(byCode.EUR.value, 3680);
  assert.equal(byCode.JPY.value, 600000);
  assert.equal(byCode.CNY.value, 28800);
  assert.equal(formatGoldFxValue(16200, 0), "16,200");
  assert.equal(formatGoldFxValue(3680, 2), "3,680.00");
});

test("missing FX or gold prints as null so the UI can show an em dash", () => {
  const rows = buildGoldFxQuotes({
    goldUsdPerOz: 4000,
    taiwanQian: null,
    currencies: { USD: 1, EUR: 0.92 },
  });
  const byCode = Object.fromEntries(rows.map((row) => [row.code, row]));
  assert.equal(byCode.TWD.value, null);
  assert.equal(byCode.USD.value, 4000);
  assert.equal(byCode.EUR.value, 3680);
  assert.equal(byCode.JPY.value, null);
  assert.equal(byCode.CNY.value, null);
  assert.equal(formatGoldFxValue(null, 2), "—");
  const empty = buildGoldFxQuotes({ currencies: {} });
  assert.ok(empty.every((row) => row.value === null));
});
