import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function moduleFrom(path) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, Intl, Date, Number, URL, TextEncoder, Uint8Array, crypto };
  vm.runInNewContext(code, context);
  return context.exports;
}

const normalize = moduleFrom("../lib/news/normalize.ts");
const sources = moduleFrom("../lib/news/source-config.ts");

test("parses RSS and Atom entries without copying markup into candidates", () => {
  const rss = `<rss><channel><item><guid>release-1</guid><title><![CDATA[Consumer Price Index &amp; gold]]></title><link>https://www.bls.gov/news.release/cpi.nr0.htm?utm_source=test</link><description><![CDATA[<b>Official</b> release summary.]]></description><pubDate>Sun, 13 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
  const [rssItem] = normalize.parseFeed(rss);
  assert.equal(rssItem.externalId, "release-1");
  assert.equal(rssItem.title, "Consumer Price Index & gold");
  assert.equal(rssItem.summary, "Official release summary.");
  assert.equal(rssItem.publishedAt, "2026-09-13T12:00:00.000Z");

  const atom = `<feed><entry><id>fed-1</id><title>FOMC statement</title><link href="https://www.federalreserve.gov/newsevents/pressreleases/monetary20260913a.htm"/><content>Official policy decision</content><updated>2026-09-13T18:00:00Z</updated></entry></feed>`;
  assert.equal(normalize.parseFeed(atom)[0].url, "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260913a.htm");
  assert.equal(normalize.parseFeed(atom)[0].summary, "Official policy decision");
});

test("normalizes allowlisted source URLs and rejects unsafe destinations", () => {
  assert.equal(
    normalize.canonicalizeUrl("https://www.bls.gov/news.release/cpi.htm?utm_source=x&b=2&a=1#top", ["bls.gov"]),
    "https://www.bls.gov/news.release/cpi.htm?a=1&b=2",
  );
  assert.equal(normalize.canonicalizeUrl("http://www.bls.gov/news.release/cpi.htm", ["bls.gov"]), null);
  assert.equal(normalize.canonicalizeUrl("https://example.com/fake", ["bls.gov"]), null);
});

test("keeps dedicated BLS feeds focused on market-moving releases", () => {
  const bls = sources.newsSources.find((source) => source.id === "bls-cpi");
  assert.equal(sources.sourceAcceptsTitle(bls, "Consumer Price Index — August 2026"), true);
  assert.equal(bls.feedUrl, "https://www.bls.gov/feed/cpi.rss");
});

test("normalizes titles before computing stable fingerprints", async () => {
  assert.equal(normalize.normalizedTitle("  CPI — Gold  "), "cpi gold");
  assert.equal(await normalize.sha256("same"), await normalize.sha256("same"));
  assert.notEqual(await normalize.sha256("same"), await normalize.sha256("different"));
});
