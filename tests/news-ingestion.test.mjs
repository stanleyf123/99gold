import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function moduleFrom(path, extras = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    console,
    Headers,
    AbortSignal,
    Date,
    JSON,
    Intl,
    Number,
    URL,
    TextEncoder,
    Uint8Array,
    crypto,
    ...extras,
  };
  context.module.exports = context.exports;
  if (!extras.require) {
    context.require = (id) => {
      throw new Error(`unexpected require: ${id}`);
    };
  }
  vm.runInNewContext(code, context);
  return context.exports;
}

const normalize = moduleFrom("../lib/news/normalize.ts");
const sources = moduleFrom("../lib/news/source-config.ts");
const feedClient = moduleFrom("../lib/news/feed-client.ts");

function loadPipeline() {
  const mocks = {
    "./normalize": normalize,
    "./source-config": sources,
    "./feed-client": feedClient,
  };
  return moduleFrom("../lib/news/pipeline.ts", {
    require: (id) => {
      if (mocks[id]) return mocks[id];
      throw new Error(`unexpected require: ${id}`);
    },
  });
}

function memoryDb() {
  const sourceState = new Map();
  const candidates = [];
  const runs = [];
  return {
    candidates,
    sourceState,
    runs,
    prepare(query) {
      const q = query.replace(/\s+/g, " ");
      let bound = [];
      const statement = {
        bind(...values) {
          bound = values;
          return statement;
        },
        async run() {
          if (q.includes("INSERT OR IGNORE INTO news_runs")) {
            runs.push({ id: bound[0], status: "running" });
            return { meta: { changes: 1 } };
          }
          if (q.includes("INSERT INTO news_source_state")) {
            const existing = sourceState.get(bound[0]) ?? { consecutive_errors: 0 };
            if (q.includes("consecutive_errors = 0")) {
              sourceState.set(bound[0], { last_error: null, consecutive_errors: 0 });
            }
            if (q.includes("VALUES (?, NULL, NULL, ?, NULL, ?, 1)")) {
              sourceState.set(bound[0], {
                last_error: bound[2],
                consecutive_errors: (existing.consecutive_errors ?? 0) + (sourceState.has(bound[0]) ? 1 : 1),
              });
            }
            return { meta: { changes: 1 } };
          }
          if (q.includes("INSERT OR IGNORE INTO news_candidates")) {
            const row = { id: bound[0], url: bound[3], title: bound[4], status: "pending" };
            if (candidates.some((item) => item.id === row.id || item.url === row.url)) {
              return { meta: { changes: 0 } };
            }
            candidates.push(row);
            return { meta: { changes: 1 } };
          }
          if (q.includes("UPDATE news_candidates") && q.includes("published")) return { meta: { changes: 0 } };
          if (q.includes("UPDATE news_runs")) {
            const run = runs.find((item) => item.id === bound[bound.length - 1]);
            if (run) run.status = bound[1];
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async first() {
          if (q.includes("FROM news_source_state")) return null;
          if (q.includes("FROM news_candidates")) {
            return candidates.find((item) => item.url === bound[0]) ?? null;
          }
          return null;
        },
        async all() {
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

function jsonResponse(status, body, statusText = "") {
  return new Response(body, {
    status,
    statusText,
    headers: { "content-type": "application/rss+xml" },
  });
}

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

test("parses Fed-style CDATA RSS links and pubDates", () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
    <title>Federal Reserve issues FOMC statement</title>
    <link><![CDATA[https://www.federalreserve.gov/newsevents/pressreleases/monetary20260825a.htm]]></link>
    <guid><![CDATA[https://www.federalreserve.gov/newsevents/pressreleases/monetary20260825a.htm]]></guid>
    <pubDate><![CDATA[Tue, 25 Aug 2026 18:00:00 GMT]]></pubDate>
  </item></channel></rss>`;
  const [item] = normalize.parseFeed(xml);
  assert.equal(item.url, "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260825a.htm");
  assert.equal(item.publishedAt, "2026-08-25T18:00:00.000Z");
});

test("normalizes allowlisted source URLs and rejects unsafe destinations", () => {
  assert.equal(
    normalize.canonicalizeUrl("https://www.bls.gov/news.release/cpi.htm?utm_source=x&b=2&a=1#top", ["bls.gov"]),
    "https://www.bls.gov/news.release/cpi.htm?a=1&b=2",
  );
  assert.equal(
    normalize.canonicalizeUrl("http://www.bls.gov/news.release/cpi.htm", ["bls.gov"]),
    "https://www.bls.gov/news.release/cpi.htm",
  );
  assert.equal(
    normalize.canonicalizeUrl("https://www.ecb.europa.eu//press/key/date/2026/html/ecb.sp.html", ["ecb.europa.eu"]),
    "https://www.ecb.europa.eu/press/key/date/2026/html/ecb.sp.html",
  );
  assert.equal(
    normalize.canonicalizeUrl("https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026", ["ons.gov.uk"]),
    "https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026",
  );
  assert.equal(
    normalize.canonicalizeUrl("https://www.gov.uk/government/speeches/example", ["gov.uk"]),
    "https://www.gov.uk/government/speeches/example",
  );
  assert.equal(normalize.canonicalizeUrl("https://example.com/fake", ["bls.gov"]), null);
});

test("keeps dedicated BLS feeds focused on market-moving releases", () => {
  const bls = sources.newsSources.find((source) => source.id === "bls-cpi");
  assert.equal(sources.sourceAcceptsTitle(bls, "Consumer Price Index — August 2026"), true);
  assert.equal(bls.feedUrl, "https://www.bls.gov/feed/cpi.rss");
});

test("allowlists first-party gold and macro RSS that use https", () => {
  const ids = sources.newsSources.map((source) => source.id);
  for (const id of [
    "federal-reserve-monetary",
    "federal-reserve-speeches",
    "ecb-press",
    "ons-release-calendar",
    "hm-treasury-news",
    "bea-news",
    "census-indicators",
  ]) {
    assert.ok(ids.includes(id), `missing source ${id}`);
  }
  assert.equal(ids.includes("bank-of-england-speeches"), false);
  assert.ok(!sources.newsSources.some((source) => /bankofengland/i.test(source.feedUrl)));
  assert.ok(sources.newsSources.length >= 8);
  const ons = sources.newsSources.find((source) => source.id === "ons-release-calendar");
  const treasury = sources.newsSources.find((source) => source.id === "hm-treasury-news");
  assert.equal(ons.feedUrl, "https://www.ons.gov.uk/releasecalendar?rss");
  assert.match(treasury.feedUrl, /gov\.uk\/government\/organisations\/hm-treasury\.atom/);
  assert.equal(ons.allowedHosts.join(","), "ons.gov.uk");
  assert.equal(treasury.allowedHosts.join(","), "gov.uk");
  for (const source of sources.newsSources) {
    assert.match(source.feedUrl, /^https:\/\//);
    assert.ok(source.allowedHosts.length > 0);
  }
});

test("identifies the news fetcher with a compatible User-Agent and Accept headers", () => {
  assert.match(feedClient.NEWS_FEED_USER_AGENT, /Mozilla\/5\.0/);
  assert.match(feedClient.NEWS_FEED_USER_AGENT, /99gold\.net/);
  assert.match(feedClient.NEWS_FEED_ACCEPT, /application\/rss\+xml/);
  const headers = feedClient.newsFeedHeaders({ etag: '"abc"', lastModified: "Wed, 01 Jan 2026 00:00:00 GMT" });
  assert.equal(headers["User-Agent"], feedClient.NEWS_FEED_USER_AGENT);
  assert.equal(headers.Accept, feedClient.NEWS_FEED_ACCEPT);
  assert.equal(headers["If-None-Match"], '"abc"');
  assert.equal(headers["If-Modified-Since"], "Wed, 01 Jan 2026 00:00:00 GMT");
  assert.equal(feedClient.NEWS_PIPELINE_INTERVAL_MS, 3 * 60 * 60 * 1000);
  assert.ok(feedClient.NEWS_SCHEDULE_STALE_AFTER_MS > feedClient.NEWS_PIPELINE_INTERVAL_MS);
});

test("treats HTTP 403 as a blocked source, not an empty feed", () => {
  assert.match(feedClient.feedHttpErrorMessage(403, "Forbidden"), /HTTP 403 Forbidden/);
  assert.match(feedClient.feedHttpErrorMessage(403, "Forbidden"), /not an empty feed/);
  assert.throws(
    () => feedClient.inspectFeedResponse(403, "Forbidden", ""),
    /HTTP 403 Forbidden.*not an empty feed/,
  );
  assert.throws(
    () => feedClient.inspectFeedResponse(200, "OK", "<html><title>Access Denied</title></html>"),
    /not a parseable RSS\/Atom feed/,
  );
  assert.equal(feedClient.inspectFeedResponse(304, "Not Modified", "").kind, "not-modified");
  assert.equal(
    feedClient.inspectFeedResponse(200, "OK", "<rss><channel><title>ok</title></channel></rss>").kind,
    "ok",
  );
  assert.equal(feedClient.looksLikeFeedXml("\uFEFF<?xml version='1.0'?><feed xmlns='http://www.w3.org/2005/Atom'>"), true);
});

test("normalizes titles before computing stable fingerprints", async () => {
  assert.equal(normalize.normalizedTitle("  CPI — Gold  "), "cpi gold");
  assert.equal(await normalize.sha256("same"), await normalize.sha256("same"));
  assert.notEqual(await normalize.sha256("same"), await normalize.sha256("different"));
});

test("pipeline records per-source 403 errors instead of empty success", async () => {
  const { runNewsPipeline } = loadPipeline();
  const db = memoryDb();
  const seenHeaders = [];
  const fetcher = async (url, init) => {
    seenHeaders.push(Object.fromEntries(new Headers(init.headers).entries()));
    if (String(url).includes("bls.gov")) {
      return jsonResponse(403, "<html>blocked</html>", "Forbidden");
    }
    return jsonResponse(200, `<rss><channel><item>
      <title>Recent official brief</title>
      <link>https://www.federalreserve.gov/newsevents/pressreleases/monetary20260913a.htm</link>
      <guid>fed-recent</guid>
      <pubDate>Sun, 13 Sep 2026 12:00:00 GMT</pubDate>
    </item></channel></rss>`);
  };
  const summary = await runNewsPipeline(db, new Date("2026-09-14T13:00:00Z"), "manual", fetcher);
  assert.ok(summary.errorCount >= 4, `expected BLS 403s, got ${summary.errorCount}`);
  assert.equal(summary.status, "partial");
  assert.ok(summary.itemsSeen > 0);
  const blocked = summary.sources.filter((source) => source.status === "error");
  assert.ok(blocked.some((source) => source.source.startsWith("bls-")));
  assert.ok(blocked.every((source) => /HTTP 403/.test(source.error ?? "")));
  assert.ok(seenHeaders.every((headers) => headers["user-agent"] === feedClient.NEWS_FEED_USER_AGENT));
  assert.ok(db.candidates.length >= 1);
  assert.equal(db.candidates[0].status, "pending");
});

test("pipeline counts parsed feed items even when they are older than the candidate window", async () => {
  const { runNewsPipeline } = loadPipeline();
  const db = memoryDb();
  const oldFeed = `<rss><channel><item>
    <title>Minutes of the Board discount rate meetings</title>
    <link><![CDATA[https://www.federalreserve.gov/newsevents/pressreleases/monetary20260825a.htm]]></link>
    <guid>old-minutes</guid>
    <pubDate><![CDATA[Tue, 25 Aug 2026 18:00:00 GMT]]></pubDate>
  </item></channel></rss>`;
  const fetcher = async (url) => {
    if (String(url).includes("press_monetary.xml")) return jsonResponse(200, oldFeed);
    return jsonResponse(403, "", "Forbidden");
  };
  const summary = await runNewsPipeline(db, new Date("2026-09-14T13:00:00Z"), "manual", fetcher);
  const monetary = summary.sources.find((source) => source.source === "federal-reserve-monetary");
  assert.equal(monetary?.status, "ok");
  assert.equal(monetary?.seen, 1);
  assert.ok((monetary?.staleSkipped ?? 0) >= 1);
  assert.equal(db.candidates.length, 0);
});

test("parses ONS RSS and HM Treasury Atom entries from official hosts", () => {
  const ons = `<rss version="2.0"><channel>
    <item>
      <title>GDP monthly estimate, UK: July 2026</title>
      <link>https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026</link>
      <description>UK monthly GDP.</description>
      <guid>https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026</guid>
      <pubDate>Fri, 11 Sep 2026 06:00:00 +0000</pubDate>
    </item>
  </channel></rss>`;
  const [onsItem] = normalize.parseFeed(ons);
  assert.equal(onsItem.title, "GDP monthly estimate, UK: July 2026");
  assert.equal(onsItem.url, "https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026");
  assert.equal(onsItem.publishedAt, "2026-09-11T06:00:00.000Z");

  const atom = `<feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <id>tag:www.gov.uk,2005:/government/speeches/example</id>
      <updated>2026-09-10T16:02:00+01:00</updated>
      <link rel="alternate" type="text/html" href="https://www.gov.uk/government/speeches/example"/>
      <title>Economic Secretary to the Treasury speech</title>
      <summary type="html">Official speech summary.</summary>
    </entry>
  </feed>`;
  const [treasuryItem] = normalize.parseFeed(atom);
  assert.equal(treasuryItem.url, "https://www.gov.uk/government/speeches/example");
  assert.equal(treasuryItem.publishedAt, "2026-09-10T15:02:00.000Z");
  assert.equal(treasuryItem.summary, "Official speech summary.");
});

test("admin health lists current allowlist names and hides retired BoE 403 rows", () => {
  const health = sources.currentSourceHealth([
    {
      source_id: "bank-of-england-speeches",
      last_attempt_at: "2026-09-14T09:00:00.000Z",
      last_success_at: null,
      last_error: "HTTP 403 Forbidden — source blocked or unavailable (not an empty feed)",
      consecutive_errors: 12,
    },
    {
      source_id: "federal-reserve-monetary",
      last_attempt_at: "2026-09-14T09:00:00.000Z",
      last_success_at: "2026-09-14T09:00:00.000Z",
      last_error: null,
      consecutive_errors: 0,
    },
  ]);
  assert.equal(health.some((row) => row.source_id === "bank-of-england-speeches"), false);
  assert.equal(health.some((row) => /bankofengland/i.test(row.source_id)), false);
  const ons = health.find((row) => row.source_id === "ons-release-calendar");
  const treasury = health.find((row) => row.source_id === "hm-treasury-news");
  const fed = health.find((row) => row.source_id === "federal-reserve-monetary");
  assert.equal(ons.source_name, "UK Office for National Statistics");
  assert.equal(treasury.source_name, "HM Treasury");
  assert.equal(ons.consecutive_errors, 0);
  assert.equal(ons.last_error, null);
  assert.equal(fed.last_success_at, "2026-09-14T09:00:00.000Z");
  assert.equal(sources.newsSourceLabel("ons-release-calendar"), "UK Office for National Statistics");
  assert.equal(health.length, sources.newsSources.length);
});

test("pipeline stays succeeded without BoE and enqueues recent ONS and Treasury items", async () => {
  const { runNewsPipeline } = loadPipeline();
  const db = memoryDb();
  const requested = [];
  const recentOns = `<rss version="2.0"><channel><item>
    <title>GDP monthly estimate, UK: July 2026</title>
    <link>https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026</link>
    <guid>https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026</guid>
    <pubDate>Fri, 11 Sep 2026 06:00:00 +0000</pubDate>
  </item></channel></rss>`;
  const recentTreasury = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <id>tag:www.gov.uk,2005:/government/speeches/example</id>
    <updated>2026-09-10T16:02:00+01:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/government/speeches/example"/>
    <title>Economic Secretary to the Treasury speech</title>
    <summary>Official speech summary.</summary>
  </entry></feed>`;
  const recentFed = `<rss><channel><item>
    <title>Federal Reserve issues FOMC statement</title>
    <link>https://www.federalreserve.gov/newsevents/pressreleases/monetary20260913a.htm</link>
    <guid>fed-recent</guid>
    <pubDate>Sun, 13 Sep 2026 12:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const fetcher = async (url) => {
    const href = String(url);
    requested.push(href);
    if (/bankofengland/i.test(href)) {
      return jsonResponse(403, "<html><title>Access Denied</title></html>", "Forbidden");
    }
    if (href.includes("ons.gov.uk")) return jsonResponse(200, recentOns);
    if (href.includes("gov.uk")) return jsonResponse(200, recentTreasury);
    if (href.includes("federalreserve.gov")) return jsonResponse(200, recentFed);
    return jsonResponse(200, `<rss><channel><title>empty</title></channel></rss>`);
  };
  const summary = await runNewsPipeline(db, new Date("2026-09-14T13:00:00Z"), "manual", fetcher);
  assert.equal(summary.status, "succeeded");
  assert.equal(summary.errorCount, 0);
  assert.ok(!requested.some((url) => /bankofengland/i.test(url)));
  assert.ok(requested.some((url) => url.includes("ons.gov.uk/releasecalendar")));
  assert.ok(requested.some((url) => url.includes("hm-treasury.atom")));
  const ons = summary.sources.find((source) => source.source === "ons-release-calendar");
  const treasury = summary.sources.find((source) => source.source === "hm-treasury-news");
  assert.equal(ons?.status, "ok");
  assert.equal(ons?.seen, 1);
  assert.equal(ons?.added, 1);
  assert.equal(treasury?.status, "ok");
  assert.equal(treasury?.seen, 1);
  assert.equal(treasury?.added, 1);
  assert.ok(summary.itemsSeen >= 2);
  assert.ok(summary.candidatesAdded >= 2);
  assert.ok(db.candidates.some((item) => item.url.includes("ons.gov.uk")));
  assert.ok(db.candidates.some((item) => item.url.includes("gov.uk/government/speeches")));
});
