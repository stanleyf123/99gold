import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load() {
  const code = ts.transpileModule(readFileSync(new URL("../lib/locale-path.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    URLSearchParams,
    Object,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const {
  stripLocalePrefix,
  withLocalePrefix,
  localeFromPathname,
  localePathRedirect,
  localizedHref,
  hreflangHrefs,
  skipLocaleRouting,
  mergeLocaleCookie,
} = load();

test("strips /en and /ja prefixes and treats /zh as default", () => {
  const enHome = stripLocalePrefix("/en");
  assert.equal(enHome.locale, "en");
  assert.equal(enHome.pathname, "/");
  assert.equal(enHome.hadPrefix, true);
  const enNews = stripLocalePrefix("/en/news");
  assert.equal(enNews.locale, "en");
  assert.equal(enNews.pathname, "/news");
  const jaJewelry = stripLocalePrefix("/ja/jewelry");
  assert.equal(jaJewelry.locale, "ja");
  assert.equal(jaJewelry.pathname, "/jewelry");
  const zhNews = stripLocalePrefix("/zh/news");
  assert.equal(zhNews.locale, "zh");
  assert.equal(zhNews.pathname, "/news");
  assert.equal(zhNews.hadPrefix, true);
  const root = stripLocalePrefix("/");
  assert.equal(root.locale, "zh");
  assert.equal(root.pathname, "/");
  assert.equal(root.hadPrefix, false);
  const intl = stripLocalePrefix("/international");
  assert.equal(intl.locale, "zh");
  assert.equal(intl.pathname, "/international");
  assert.equal(intl.hadPrefix, false);
});

test("builds locale-prefixed hrefs without a trailing slash on home", () => {
  assert.equal(withLocalePrefix("/", "zh"), "/");
  assert.equal(withLocalePrefix("/", "en"), "/en");
  assert.equal(withLocalePrefix("/news", "ja"), "/ja/news");
  assert.equal(withLocalePrefix("/en/jewelry", "zh"), "/jewelry");
  assert.equal(localizedHref("/news", "en", { category: "policy" }), "/en/news?category=policy");
  assert.equal(localizedHref("/news/ecb-1", "zh"), "/news/ecb-1");
});

test("reads locale from path prefix or editorial suffix", () => {
  assert.equal(localeFromPathname("/en"), "en");
  assert.equal(localeFromPathname("/ja/global"), "ja");
  assert.equal(localeFromPathname("/news/gold-inflation-20260912-en"), "en");
  assert.equal(localeFromPathname("/"), null);
  assert.equal(localeFromPathname("/jewelry"), null);
});

test("redirects ?lang= bookmarks and /zh prefixes onto locale paths", () => {
  const toEn = localePathRedirect("/", "?lang=en");
  assert.equal(toEn.pathname, "/en");
  assert.equal(toEn.search, "");
  const newsJa = localePathRedirect("/news", "?lang=ja&category=policy");
  assert.equal(newsJa.pathname, "/ja/news");
  assert.equal(newsJa.search, "?category=policy");
  const backToZh = localePathRedirect("/en/news", "?lang=zh");
  assert.equal(backToZh.pathname, "/news");
  assert.equal(backToZh.search, "");
  const dropZhPrefix = localePathRedirect("/zh", "");
  assert.equal(dropZhPrefix.pathname, "/");
  assert.equal(dropZhPrefix.search, "");
  assert.equal(localePathRedirect("/en", ""), null);
  assert.equal(localePathRedirect("/api/global-quotes", "?lang=en"), null);
  assert.equal(skipLocaleRouting("/api/price-alerts"), true);
  assert.equal(skipLocaleRouting("/admin"), true);
});

test("merges site-locale into the request Cookie header", () => {
  assert.equal(mergeLocaleCookie("", "en"), "site-locale=en");
  assert.equal(mergeLocaleCookie("theme=dark; site-locale=zh", "ja"), "theme=dark; site-locale=ja");
});

test("hreflang map covers zh-Hant, en, ja and x-default", () => {
  const home = hreflangHrefs("/");
  assert.equal(home["zh-Hant"], "/");
  assert.equal(home.en, "/en");
  assert.equal(home.ja, "/ja");
  assert.equal(home["x-default"], "/");
  const news = hreflangHrefs("/news", { category: "macro" });
  assert.equal(news.en, "/en/news?category=macro");
});
