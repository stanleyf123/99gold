import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load() {
  const code = ts.transpileModule(readFileSync(new URL("../lib/site-locale.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    URLSearchParams,
    Set,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const { localeFromGeoCountry, localeHrefsFromLocation, isSiteLocale } = load();

test("unknown or missing GeoIP country stays Traditional Chinese", () => {
  assert.equal(localeFromGeoCountry(""), "zh");
  assert.equal(localeFromGeoCountry(null), "zh");
  assert.equal(localeFromGeoCountry(undefined), "zh");
  assert.equal(localeFromGeoCountry("   "), "zh");
  assert.equal(localeFromGeoCountry("XX"), "zh");
  assert.equal(localeFromGeoCountry("T1"), "zh");
});

test("maps JP / TW / other countries when a country code is present", () => {
  assert.equal(localeFromGeoCountry("JP"), "ja");
  assert.equal(localeFromGeoCountry("tw"), "zh");
  assert.equal(localeFromGeoCountry("HK"), "zh");
  assert.equal(localeFromGeoCountry("MO"), "zh");
  assert.equal(localeFromGeoCountry("US"), "en");
  assert.equal(localeFromGeoCountry("GB"), "en");
  assert.equal(localeFromGeoCountry("DE"), "en");
});

test("builds news index and official-brief language hrefs", () => {
  const index = localeHrefsFromLocation("/news", "");
  assert.equal(index.zh, "/news?lang=zh&category=all");
  assert.equal(index.en, "/news?lang=en&category=all");
  assert.equal(index.ja, "/news?lang=ja&category=all");
  const policy = localeHrefsFromLocation("/news", "?lang=zh&category=policy");
  assert.equal(policy.en, "/news?lang=en&category=policy");
  const brief = localeHrefsFromLocation("/news/ecb-press-abc123", "?lang=zh");
  assert.equal(brief.zh, "/news/ecb-press-abc123?lang=zh");
  assert.equal(brief.en, "/news/ecb-press-abc123?lang=en");
  assert.equal(brief.ja, "/news/ecb-press-abc123?lang=ja");
  const editorial = localeHrefsFromLocation("/news/gold-inflation-20260912-zh", "");
  assert.equal(editorial.zh, "/news/gold-inflation-20260912-zh");
  assert.equal(editorial.en, "/news/gold-inflation-20260912-en");
  assert.equal(editorial.ja, "/news/gold-inflation-20260912-ja");
  assert.equal(localeHrefsFromLocation("/jewelry", ""), undefined);
  assert.equal(isSiteLocale("zh"), true);
  assert.equal(isSiteLocale("fr"), false);
});
