import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("../lib/seo.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {}, module: { exports: {} } };
vm.runInNewContext(code, context);
const {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  pageMetadata,
  absoluteUrl,
  faqJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  routeCopy,
} = context.exports;

test("each public route has a unique zh title, description and https canonical", () => {
  const titles = new Set();
  const descriptions = new Set();
  assert.equal(DEFAULT_OG_IMAGE, "/og");
  for (const route of Object.keys(routeCopy)) {
    const meta = pageMetadata(route);
    const title = meta.title;
    const description = meta.description;
    assert.ok(title.length > 8);
    assert.ok(description.length > 20);
    assert.equal(titles.has(title), false, `duplicate title: ${title}`);
    assert.equal(descriptions.has(description), false, `duplicate description: ${description}`);
    titles.add(title);
    descriptions.add(description);
    assert.equal(meta.alternates.canonical, absoluteUrl(routeCopy[route].path));
    assert.match(meta.alternates.canonical, /^https:\/\/99gold\.net/);
    assert.doesNotMatch(meta.alternates.canonical, /www\.99gold/);
    assert.equal(meta.openGraph.url, meta.alternates.canonical);
    assert.equal(meta.openGraph.type, "website");
    assert.ok(meta.openGraph.images[0].url);
    assert.equal(meta.twitter.card, "summary_large_image");
  }
});

test("JSON-LD builders emit WebSite, Organization, FAQ and breadcrumbs", () => {
  assert.equal(SITE_URL, "https://99gold.net");
  assert.equal(organizationJsonLd()["@type"], "Organization");
  assert.equal(websiteJsonLd()["@type"], "WebSite");
  const faq = faqJsonLd([{ question: "Q", answer: "A" }]);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity[0].name, "Q");
  const crumbs = breadcrumbJsonLd([{ name: "首頁", path: "/" }, { name: "銀樓價格", path: "/jewelry" }]);
  assert.equal(crumbs.itemListElement[1].item, "https://99gold.net/jewelry");
  assert.equal(crumbs.itemListElement[1].position, 2);
});
