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
    Date,
    Number,
    JSON,
    Set,
    Object,
    Map,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const seo = { SITE_URL: "https://99gold.net" };
const {
  sitemapLastmod,
  briefSitemapEntries,
  archivedArticleSitemapEntries,
} = load("../lib/sitemap-entries.ts", { "./seo": seo });

test("sitemap lastmod falls back when timestamps are missing or invalid", () => {
  const fromIso = sitemapLastmod("2026-09-14T08:00:00.000Z");
  assert.equal(fromIso.toISOString(), "2026-09-14T08:00:00.000Z");
  assert.ok(sitemapLastmod("not-a-date") instanceof Date);
  assert.ok(sitemapLastmod(null) instanceof Date);
});

test("published briefs become sitemap URLs with lastmod and language alternates", () => {
  const entries = briefSitemapEntries([
    { id: "ecb-1", published_at: "2026-09-14T10:00:00.000Z", translated_at: "2026-09-14T11:00:00.000Z" },
    { id: "ecb-1", published_at: "2026-09-14T10:00:00.000Z" },
    { id: "  ", published_at: "2026-09-14T10:00:00.000Z" },
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, "https://99gold.net/news/ecb-1");
  assert.equal(entries[0].lastModified.toISOString(), "2026-09-14T11:00:00.000Z");
  assert.equal(entries[0].alternates.languages["zh-Hant"], "https://99gold.net/news/ecb-1?lang=zh");
  assert.equal(entries[0].alternates.languages.ja, "https://99gold.net/news/ecb-1?lang=ja");
  assert.equal(entries[0].alternates.languages["x-default"], "https://99gold.net/news/ecb-1?lang=zh");
  const archived = archivedArticleSitemapEntries([{ id: "legacy-1", published_at: "2026-01-01T00:00:00.000Z" }]);
  assert.equal(archived[0].url, "https://99gold.net/news/legacy-1");
  assert.equal(archived[0].priority, 0.4);
});
