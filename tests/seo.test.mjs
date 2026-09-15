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
  articleJsonLd,
  itemListJsonLd,
  newsIndexFaq,
  briefFaq,
  routeCopy,
} = context.exports;

test("each public route has a unique zh title, description and https canonical", () => {
  const titles = new Set();
  const descriptions = new Set();
  const ogAlts = new Set();
  assert.equal(DEFAULT_OG_IMAGE, "/og.jpg");
  assert.equal(absoluteUrl(DEFAULT_OG_IMAGE), "https://99gold.net/og.jpg");
  for (const route of Object.keys(routeCopy)) {
    const meta = pageMetadata(route);
    const title = meta.title;
    const description = meta.description;
    const ogAlt = meta.openGraph.images[0].alt;
    assert.ok(title.length > 8);
    assert.ok(description.length > 20);
    assert.equal(titles.has(title), false, `duplicate title: ${title}`);
    assert.equal(descriptions.has(description), false, `duplicate description: ${description}`);
    assert.equal(ogAlts.has(ogAlt), false, `duplicate og alt: ${ogAlt}`);
    titles.add(title);
    descriptions.add(description);
    ogAlts.add(ogAlt);
    assert.equal(meta.alternates.canonical, absoluteUrl(routeCopy[route].path));
    assert.match(meta.alternates.canonical, /^https:\/\/99gold\.net/);
    assert.doesNotMatch(meta.alternates.canonical, /www\.99gold/);
    assert.equal(meta.openGraph.url, meta.alternates.canonical);
    assert.equal(meta.openGraph.type, "website");
    assert.equal(meta.openGraph.images[0].url, DEFAULT_OG_IMAGE);
    assert.equal(meta.openGraph.images[0].width, 1200);
    assert.equal(meta.openGraph.images[0].height, 630);
    assert.ok(ogAlt.includes(title));
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
  const article = articleJsonLd({
    headline: "Fed statement",
    description: "Official brief",
    url: "https://99gold.net/news/fed-1?lang=zh",
    datePublished: "2026-09-14T00:00:00.000Z",
    inLanguage: "zh-Hant",
  });
  assert.equal(article["@type"], "NewsArticle");
  assert.equal(article.isAccessibleForFree, true);
  assert.equal(article.publisher.name, "玖久黃金報價網");
  assert.equal(article.image[0], "https://99gold.net/og.jpg");
  assert.equal(article.image.length, 1);
  const list = itemListJsonLd([{ name: "Brief", path: "/news/fed-1" }]);
  assert.equal(list.itemListElement[0].url, "https://99gold.net/news/fed-1");
  assert.equal(newsIndexFaq.zh.length, 3);
  assert.equal(briefFaq.en.length, 2);
});
