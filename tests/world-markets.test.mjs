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

const section = load("../lib/section-quotes.ts");
const {
  HONG_KONG_TAEL_GRAMS,
  CHINA_SHI_TAEL_GRAMS,
  usdOzToLocal,
  formatWorldPrice,
  taiwanGramFromUsdOz,
  buildWorldMarketQuotes,
  converterOunces,
} = load("../lib/world-markets.ts", { "./section-quotes": section });

const GOLD = 4000;
const FX = { USD: 1, TWD: 32, HKD: 7.8, CNY: 7.2, JPY: 150, SGD: 1.35, GBP: 0.78, EUR: 0.92 };

function byId(quotes, id) {
  return quotes.find((item) => item.id === id);
}

test("documents Hong Kong tael and China shi-tael constants", () => {
  assert.equal(HONG_KONG_TAEL_GRAMS, 37.429);
  assert.equal(CHINA_SHI_TAEL_GRAMS, 50);
});

test("Taiwan qian/gram reuse the jewelry GC × USD/TWD formula", () => {
  const quotes = buildWorldMarketQuotes({ goldUsdPerOz: GOLD, currencies: FX, goldChangePercent: 0.42 });
  const taiwan = byId(quotes, "taipei");
  assert.equal(taiwan.primary.value, section.qianFromUsdOz(GOLD, FX.TWD));
  assert.equal(taiwan.secondary.value, taiwanGramFromUsdOz(GOLD, FX.TWD));
  assert.equal(taiwanGramFromUsdOz(GOLD, FX.TWD), Math.round(GOLD * FX.TWD / 31.1034768));
  assert.equal(taiwan.primary.value, Math.round(GOLD * FX.TWD / 31.1034768 * 3.75));
  assert.equal(taiwan.basis, "local-fx");
  assert.equal(taiwan.changePercent, 0.42);
});

test("Hong Kong converts USD/oz through HKD into a 37.429 g tael", () => {
  const tael = usdOzToLocal(GOLD, FX.HKD, HONG_KONG_TAEL_GRAMS);
  const gram = usdOzToLocal(GOLD, FX.HKD, 1);
  const quotes = buildWorldMarketQuotes({ goldUsdPerOz: GOLD, currencies: FX });
  const hk = byId(quotes, "hong-kong");
  assert.equal(hk.primary.value, Math.round(tael));
  assert.equal(hk.secondary.value, gram);
  assert.equal(Math.round(tael), Math.round(GOLD * FX.HKD / 31.1034768 * 37.429));
});

test("China, Japan, Singapore, London and New York use live FX when present", () => {
  const quotes = buildWorldMarketQuotes({ goldUsdPerOz: GOLD, currencies: FX, goldChangePercent: -1.2 });
  const china = byId(quotes, "shanghai");
  const japan = byId(quotes, "tokyo");
  const singapore = byId(quotes, "singapore");
  const london = byId(quotes, "london");
  const ny = byId(quotes, "new-york");
  assert.equal(china.primary.value, usdOzToLocal(GOLD, FX.CNY, 1));
  assert.equal(china.secondary.value, Math.round(usdOzToLocal(GOLD, FX.CNY, 50)));
  assert.equal(japan.primary.value, Math.round(usdOzToLocal(GOLD, FX.JPY, 1)));
  assert.equal(singapore.primary.value, GOLD * FX.SGD);
  assert.equal(singapore.primary.currency, "SGD");
  assert.equal(london.primary.value, GOLD * FX.GBP);
  assert.equal(london.primary.currency, "GBP");
  assert.equal(london.basis, "local-fx");
  assert.equal(ny.primary.value, GOLD);
  assert.equal(ny.primary.currency, "USD");
  assert.equal(japan.changePercent, -1.2);
});

test("missing FX or metal yields dashes and never fabricates a local price", () => {
  const empty = buildWorldMarketQuotes({ goldUsdPerOz: null, currencies: {} });
  for (const market of empty) {
    assert.equal(market.primary.value, null);
    assert.equal(formatWorldPrice(market.primary.value, 2), "—");
    assert.equal(market.changePercent, null);
    assert.equal(market.basis, "missing");
  }

  const noFx = buildWorldMarketQuotes({ goldUsdPerOz: GOLD, currencies: { USD: 1 }, goldChangePercent: 1 });
  assert.equal(byId(noFx, "taipei").primary.value, null);
  assert.equal(byId(noFx, "hong-kong").primary.value, null);
  assert.equal(byId(noFx, "shanghai").primary.value, null);
  assert.equal(byId(noFx, "tokyo").primary.value, null);
  assert.equal(formatWorldPrice(byId(noFx, "taipei").primary.value, 0), "—");
  const singapore = byId(noFx, "singapore");
  assert.equal(singapore.primary.value, GOLD);
  assert.equal(singapore.primary.currency, "USD");
  assert.equal(singapore.basis, "usd-fallback");
  const london = byId(noFx, "london");
  assert.equal(london.primary.value, GOLD);
  assert.equal(london.primary.currency, "USD");
  assert.equal(london.basis, "usd-fallback");
  assert.equal(byId(noFx, "new-york").primary.value, GOLD);
});

test("London falls back to EUR before USD, and prefers supplied taiwan-qian", () => {
  const eurOnly = buildWorldMarketQuotes({ goldUsdPerOz: GOLD, currencies: { USD: 1, EUR: 0.9 } });
  assert.equal(byId(eurOnly, "london").primary.currency, "EUR");
  assert.equal(byId(eurOnly, "london").primary.value, GOLD * 0.9);
  assert.equal(byId(eurOnly, "london").basis, "eur-fallback");

  const quotes = buildWorldMarketQuotes({
    goldUsdPerOz: GOLD,
    currencies: FX,
    taiwanQian: 16560,
    taiwanGram: 4416,
  });
  assert.equal(byId(quotes, "taipei").primary.value, 16560);
  assert.equal(byId(quotes, "taipei").secondary.value, 4416);
});

test("currency converter ounces match Taiwan qian/tael and troy-ounce grams", () => {
  assert.equal(converterOunces(1, "ounce"), 1);
  assert.equal(converterOunces(31.1034768, "gram"), 1);
  assert.equal(converterOunces(1, "qian"), 3.75 / 31.1034768);
  assert.equal(converterOunces(1, "tael"), 37.5 / 31.1034768);
});
