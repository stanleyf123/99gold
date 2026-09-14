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
    Number,
    Math,
    String,
    Intl,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const { bankOfTaiwanUsdSightSell, formatUsdTwdSightSell } = load("../lib/fx-display.ts");

test("uses BOT bank-sight-sell, preferring bankSellsUsd over currencies.TWD", () => {
  assert.equal(bankOfTaiwanUsdSightSell({
    fxBasis: "bank-sight-sell",
    bankOfTaiwan: { bankSellsUsd: 31.215 },
    currencies: { TWD: 30.5 },
  }), 31.215);
});

test("falls back to currencies.TWD when BOT object is missing but basis is bank-sight-sell", () => {
  assert.equal(bankOfTaiwanUsdSightSell({
    fxBasis: "bank-sight-sell",
    currencies: { TWD: 31.215 },
  }), 31.215);
});

test("does not show market-reference FX as Bank of Taiwan spot sell", () => {
  assert.equal(bankOfTaiwanUsdSightSell({
    fxBasis: "market-reference",
    currencies: { TWD: 31.1 },
  }), null);
  assert.equal(bankOfTaiwanUsdSightSell({
    fxBasis: null,
    bankOfTaiwan: { bankSellsUsd: 31.215 },
  }), null);
  assert.equal(bankOfTaiwanUsdSightSell({}), null);
});

test("formats missing or invalid rates as an em dash", () => {
  assert.equal(formatUsdTwdSightSell(null), "—");
  assert.equal(formatUsdTwdSightSell(0), "—");
  assert.equal(formatUsdTwdSightSell(Number.NaN), "—");
  assert.equal(formatUsdTwdSightSell(31.215), "31.215");
});
