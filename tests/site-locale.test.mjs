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
    URLSearchParams,
    Set,
    Object,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const localePath = load("../lib/locale-path.ts");
const { localeFromGeoCountry, localeHrefsFromLocation, isSiteLocale } = load("../lib/site-locale.ts", {
  "./locale-path": localePath,
});

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

test("builds news index, brief, editorial and section language hrefs as locale paths", () => {
  const index = localeHrefsFromLocation("/news", "");
  assert.equal(index.zh, "/news?category=all");
  assert.equal(index.en, "/en/news?category=all");
  assert.equal(index.ja, "/ja/news?category=all");
  const policy = localeHrefsFromLocation("/news", "?lang=zh&category=policy");
  assert.equal(policy.en, "/en/news?category=policy");
  const brief = localeHrefsFromLocation("/news/ecb-press-abc123", "?lang=zh");
  assert.equal(brief.zh, "/news/ecb-press-abc123");
  assert.equal(brief.en, "/en/news/ecb-press-abc123");
  assert.equal(brief.ja, "/ja/news/ecb-press-abc123");
  const prefixed = localeHrefsFromLocation("/en/news/ecb-press-abc123", "");
  assert.equal(prefixed.zh, "/news/ecb-press-abc123");
  const editorial = localeHrefsFromLocation("/news/gold-inflation-20260912-zh", "");
  assert.equal(editorial.zh, "/news/gold-inflation-20260912-zh");
  assert.equal(editorial.en, "/en/news/gold-inflation-20260912-en");
  assert.equal(editorial.ja, "/ja/news/gold-inflation-20260912-ja");
  const jewelry = localeHrefsFromLocation("/jewelry", "");
  assert.equal(jewelry.zh, "/jewelry");
  assert.equal(jewelry.en, "/en/jewelry");
  assert.equal(jewelry.ja, "/ja/jewelry");
  assert.equal(isSiteLocale("zh"), true);
  assert.equal(isSiteLocale("fr"), false);
});
