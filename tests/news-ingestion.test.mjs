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
    Math,
    URL,
    TextEncoder,
    Uint8Array,
    crypto,
    setTimeout,
    clearTimeout,
    Promise,
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
const translateLib = moduleFrom("../lib/news/translate.ts");

function loadPipeline(translate = defaultTranslate()) {
  const mocks = {
    "./normalize": normalize,
    "./source-config": sources,
    "./feed-client": feedClient,
    "./translate": translate,
  };
  return moduleFrom("../lib/news/pipeline.ts", {
    require: (id) => {
      if (mocks[id]) return mocks[id];
      throw new Error(`unexpected require: ${id}`);
    },
  });
}

function defaultTranslate() {
  return {
    AUTO_PIPELINE_REVIEWER: "auto-pipeline",
    cleanSourceText: translateLib.cleanSourceText,
    looksLikeTargetLocale: translateLib.looksLikeTargetLocale,
    needsTranslationBackfill: translateLib.needsTranslationBackfill,
    selectRetranslateCandidates: translateLib.selectRetranslateCandidates,
    nextTranslationRetryAt: translateLib.nextTranslationRetryAt,
    isMyMemoryCoolingDown: translateLib.isMyMemoryCoolingDown,
    translateOfficialBrief: async (title, summary) => ({
      titles: { zh: `中文：${title}`, en: title, ja: `日本語：${title}` },
      summaries: {
        zh: summary ? `中文摘要：${summary}` : null,
        en: summary,
        ja: summary ? `日本語要約：${summary}` : null,
      },
      provider: "mymemory",
      translated: true,
      complete: true,
    }),
  };
}

function memoryDb(seed = []) {
  const sourceState = new Map();
  const candidates = [...seed];
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
            const row = {
              id: bound[0],
              url: bound[3],
              title: bound[4],
              summary: bound[6] ?? null,
              source_language: bound[8] ?? "en",
              status: "pending",
              reviewed_by: null,
              translation_provider: null,
              title_zh: null,
              title_en: null,
              title_ja: null,
            };
            if (candidates.some((item) => item.id === row.id || item.url === row.url)) {
              return { meta: { changes: 0 } };
            }
            candidates.push(row);
            return { meta: { changes: 1 } };
          }
          if (q.includes("UPDATE news_candidates") && q.includes("title_zh") && q.includes("reviewed_by")) {
            const id = bound[bound.length - 1];
            const row = candidates.find((item) => item.id === id && (item.status === "pending" || item.status === "approved"));
            if (!row) return { meta: { changes: 0 } };
            row.title_zh = bound[0];
            row.title_en = bound[1];
            row.title_ja = bound[2];
            row.summary_zh = bound[3];
            row.summary_en = bound[4];
            row.summary_ja = bound[5];
            row.translation_provider = bound[6];
            row.translated_at = bound[7];
            if (q.includes("translation_retry_at")) {
              row.translation_retry_at = bound[8];
              row.translation_attempts = bound[9];
              row.scheduled_for = bound[10];
              row.reviewed_by = bound[12];
              row.published_at = bound[13];
            } else {
              row.scheduled_for = bound[8];
              row.reviewed_by = bound[10];
              row.published_at = bound[11];
            }
            row.status = "published";
            return { meta: { changes: 1 } };
          }
          if (q.includes("UPDATE news_candidates") && q.includes("title_zh") && q.includes("AND status = 'published'")) {
            const id = bound[bound.length - 1];
            const row = candidates.find((item) => item.id === id && item.status === "published");
            if (!row) return { meta: { changes: 0 } };
            row.title_zh = bound[0];
            row.title_en = bound[1];
            row.title_ja = bound[2];
            row.summary_zh = bound[3];
            row.summary_en = bound[4];
            row.summary_ja = bound[5];
            row.translation_provider = bound[6];
            row.translated_at = bound[7];
            if (q.includes("translation_retry_at")) {
              row.translation_retry_at = bound[8];
              row.translation_attempts = bound[9];
            }
            return { meta: { changes: 1 } };
          }
          if (q.includes("UPDATE news_candidates") && q.includes("status = 'rejected'")) {
            const id = bound[bound.length - 1];
            const row = candidates.find((item) => item.id === id && (item.status === "pending" || item.status === "approved"));
            if (!row) return { meta: { changes: 0 } };
            row.status = "rejected";
            row.reviewed_by = bound[1];
            row.scheduled_for = null;
            return { meta: { changes: 1 } };
          }
          if (q.includes("UPDATE news_candidates") && q.includes("status = 'approved'")) {
            const id = bound[bound.length - 1];
            const row = candidates.find((item) => item.id === id && (item.status === "pending" || item.status === "approved"));
            if (!row) return { meta: { changes: 0 } };
            row.status = "approved";
            row.scheduled_for = bound[0];
            row.reviewed_by = bound[2];
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
            return candidates.find((item) => item.url === bound[0] || item.id === bound[0]) ?? null;
          }
          return null;
        },
        async all() {
          if (q.includes("FROM news_candidates") && q.includes("pending")) {
            const cutoff = bound[0];
            return {
              results: candidates.filter((item) => {
                if (item.status === "pending") return true;
                if (item.status !== "approved") return false;
                if (!item.scheduled_for || !cutoff) return true;
                return item.scheduled_for <= cutoff;
              }),
            };
          }
          if (q.includes("FROM news_candidates") && q.includes("status = 'published'")) {
            return {
              results: candidates.filter((item) => item.status === "published"),
            };
          }
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
  assert.equal(
    normalize.canonicalizeUrl("https://www.mining.com/gold-price-slips-as-mideast-tensions-stoke-fed-hike-bets/", ["mining.com"]),
    "https://www.mining.com/gold-price-slips-as-mideast-tensions-stoke-fed-hike-bets",
  );
  assert.equal(
    normalize.canonicalizeUrl("https://www.investing.com/news/commodities-news/gold-dips-4900741?utm_source=rss", ["investing.com"]),
    "https://www.investing.com/news/commodities-news/gold-dips-4900741",
  );
  assert.equal(
    normalize.canonicalizeUrl("https://oilprice.com/Energy/Crude-Oil/Saudi-Pipeline-Outage.html", ["oilprice.com"]),
    "https://oilprice.com/Energy/Crude-Oil/Saudi-Pipeline-Outage.html",
  );
  assert.equal(normalize.canonicalizeUrl("https://example.com/fake", ["bls.gov"]), null);
  assert.equal(normalize.canonicalizeUrl("https://news.google.com/rss/articles/CBMiabc?oc=5", ["mining.com"]), null);
});

test("keeps dedicated BLS feeds focused on market-moving releases", () => {
  const bls = sources.newsSources.find((source) => source.id === "bls-cpi");
  assert.equal(sources.sourceAcceptsTitle(bls, "Consumer Price Index — August 2026"), true);
  assert.equal(bls.feedUrl, "https://www.bls.gov/feed/cpi.rss");
});

test("filters ONS labour calendars and low-relevance Treasury/ECB items", () => {
  const ons = sources.newsSources.find((source) => source.id === "ons-release-calendar");
  const treasury = sources.newsSources.find((source) => source.id === "hm-treasury-news");
  const ecb = sources.newsSources.find((source) => source.id === "ecb-press");
  const fed = sources.newsSources.find((source) => source.id === "federal-reserve-monetary");
  assert.equal(sources.sourceAcceptsTitle(ons, "GDP monthly estimate, UK: July 2026"), true);
  assert.equal(sources.sourceAcceptsTitle(ons, "CPI inflation, UK: August 2026"), true);
  assert.equal(sources.sourceAcceptsTitle(ons, "Labour market overview, UK: September 2026"), false);
  assert.equal(sources.sourceAcceptsTitle(ons, "Employment in the UK: September 2026"), false);
  assert.equal(sources.sourceAcceptsTitle(treasury, "Autumn Budget: fiscal plan to ease inflation"), true);
  assert.equal(sources.sourceAcceptsTitle(treasury, "Consultation on cryptoassets and AML supervision"), false);
  assert.equal(sources.sourceAcceptsTitle(treasury, "Economic Secretary to the Treasury speech"), false);
  assert.equal(sources.sourceAcceptsTitle(ecb, "Monetary policy statement by Christine Lagarde"), true);
  assert.equal(sources.sourceAcceptsTitle(ecb, "Christine Lagarde: Introductory statement"), true);
  assert.equal(sources.sourceAcceptsTitle(ecb, "Remarks on digital euro AML and payments"), false);
  assert.equal(sources.sourceAcceptsTitle(fed, "Federal Reserve issues FOMC statement"), true);
  assert.equal(sources.textHasTerm("gold dips as yields rise", "gold"), true);
  assert.equal(sources.textHasTerm("golden globes nominations", "gold"), false);
  assert.equal(sources.textHasTerm("corporate strategy update", "rate"), false);
});

test("allowlists gold, macro, and energy RSS that use https — not Google News or BoE", () => {
  const ids = sources.newsSources.map((source) => source.id);
  for (const id of [
    "federal-reserve-monetary",
    "federal-reserve-speeches",
    "ecb-press",
    "ons-release-calendar",
    "hm-treasury-news",
    "bea-news",
    "census-indicators",
    "mining-com-gold",
    "investing-commodities",
    "oilprice-energy",
  ]) {
    assert.ok(ids.includes(id), `missing source ${id}`);
  }
  assert.equal(ids.includes("bank-of-england-speeches"), false);
  assert.ok(!sources.newsSources.some((source) => /bankofengland/i.test(source.feedUrl)));
  assert.ok(!sources.newsSources.some((source) => /news\.google\.com/i.test(source.feedUrl)));
  assert.ok(!sources.newsSources.some((source) => /kitco/i.test(source.feedUrl)));
  assert.ok(sources.newsSources.length >= 11);
  const ons = sources.newsSources.find((source) => source.id === "ons-release-calendar");
  const treasury = sources.newsSources.find((source) => source.id === "hm-treasury-news");
  const mining = sources.newsSources.find((source) => source.id === "mining-com-gold");
  const investing = sources.newsSources.find((source) => source.id === "investing-commodities");
  const oil = sources.newsSources.find((source) => source.id === "oilprice-energy");
  assert.equal(ons.feedUrl, "https://www.ons.gov.uk/releasecalendar?rss");
  assert.match(treasury.feedUrl, /gov\.uk\/government\/organisations\/hm-treasury\.atom/);
  assert.equal(mining.feedUrl, "https://www.mining.com/commodity/gold/feed/");
  assert.equal(investing.feedUrl, "https://www.investing.com/rss/news_11.rss");
  assert.equal(oil.feedUrl, "https://oilprice.com/rss/energy");
  assert.equal(ons.allowedHosts.join(","), "ons.gov.uk");
  assert.equal(treasury.allowedHosts.join(","), "gov.uk");
  assert.ok(ons.titleTerms.length > 0);
  assert.ok(ons.excludeTerms.length > 0);
  assert.ok(treasury.excludeTerms.length > 0);
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
  assert.equal(db.candidates[0].status, "published");
  assert.equal(db.candidates[0].reviewed_by, "auto-pipeline");
  assert.match(db.candidates[0].title_zh, /中文：/);
  assert.ok(summary.publishedCount >= 1);
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

test("parses mining.com, Investing.com, and Oilprice gold/energy RSS", () => {
  const mining = `<rss version="2.0"><channel>
    <item>
      <title>Gold price slips as Mideast tensions stoke Fed hike bets</title>
      <link>https://www.mining.com/gold-price-slips-as-mideast-tensions-stoke-fed-hike-bets/</link>
      <guid isPermaLink="false">https://www.mining.com/?p=1214001</guid>
      <description><![CDATA[Spot gold eased as oil-driven rate-hike bets weighed on bullion.]]></description>
      <pubDate>Tue, 15 Sep 2026 18:26:02 +0000</pubDate>
    </item>
  </channel></rss>`;
  const [miningItem] = normalize.parseFeed(mining);
  assert.equal(miningItem.title, "Gold price slips as Mideast tensions stoke Fed hike bets");
  assert.equal(miningItem.url, "https://www.mining.com/gold-price-slips-as-mideast-tensions-stoke-fed-hike-bets/");
  assert.equal(miningItem.publishedAt, "2026-09-15T18:26:02.000Z");
  assert.match(miningItem.summary, /bullion/);

  const investing = `<rss version="2.0"><channel>
    <item>
      <title>Gold dips as dollar, yields, and oil rise a day ahead of Fed’s expected rate hike</title>
      <pubDate>2026-09-15 21:04:02</pubDate>
      <link>https://www.investing.com/news/commodities-news/gold-holds-near-4300-as-oil-disruption-lifts-fed-hike-bets-4900741</link>
    </item>
  </channel></rss>`;
  const [investingItem] = normalize.parseFeed(investing);
  assert.match(investingItem.title, /Gold dips/);
  assert.equal(
    investingItem.url,
    "https://www.investing.com/news/commodities-news/gold-holds-near-4300-as-oil-disruption-lifts-fed-hike-bets-4900741",
  );
  assert.equal(investingItem.publishedAt, "2026-09-15T21:04:02.000Z");

  const oil = `<rss version="2.0"><channel>
    <item>
      <title>Saudi Oil Pipeline Repairs Could Take Weeks After Drone Attack</title>
      <link>https://oilprice.com/Latest-Energy-News/World-News/Saudi-Oil-Pipeline-Repairs-Could-Take-Weeks-After-Drone-Attack.html</link>
      <pubDate>Tue, 15 Sep 2026 16:01:48 America/Chicago</pubDate>
      <guid isPermaLink="false">https://oilprice.com/Latest-Energy-News/World-News/Saudi-Oil-Pipeline-Repairs-Could-Take-Weeks-After-Drone-Attack.html</guid>
    </item>
  </channel></rss>`;
  const [oilItem] = normalize.parseFeed(oil);
  assert.match(oilItem.title, /Saudi Oil Pipeline/);
  assert.equal(oilItem.url, "https://oilprice.com/Latest-Energy-News/World-News/Saudi-Oil-Pipeline-Repairs-Could-Take-Weeks-After-Drone-Attack.html");
  assert.ok(Number.isFinite(Date.parse(oilItem.publishedAt)));
  assert.equal(oilItem.publishedAt.slice(0, 10), "2026-09-15");
  assert.ok(Number.isFinite(normalize.parseFeedDate("Tue, 15 Sep 2026 16:01:48 America/Chicago")));
  assert.equal(Number.isFinite(normalize.parseFeedDate("not a date")), false);
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

test("pipeline stays succeeded without BoE and enqueues recent gold-relevant ONS and Treasury items", async () => {
  const { runNewsPipeline } = loadPipeline();
  const db = memoryDb();
  const requested = [];
  const recentOns = `<rss version="2.0"><channel>
    <item>
      <title>GDP monthly estimate, UK: July 2026</title>
      <link>https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026</link>
      <guid>https://www.ons.gov.uk/releases/gdpmonthlyestimateukjuly2026</guid>
      <pubDate>Fri, 11 Sep 2026 06:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Labour market overview, UK: September 2026</title>
      <link>https://www.ons.gov.uk/releases/labourmarketoverviewukseptember2026</link>
      <guid>https://www.ons.gov.uk/releases/labourmarketoverviewukseptember2026</guid>
      <pubDate>Fri, 11 Sep 2026 07:00:00 +0000</pubDate>
    </item>
  </channel></rss>`;
  const recentTreasury = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <id>tag:www.gov.uk,2005:/government/speeches/budget-inflation</id>
    <updated>2026-09-10T16:02:00+01:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/government/speeches/budget-inflation"/>
    <title>Autumn Budget: fiscal plan to ease inflation</title>
    <summary>Official budget summary.</summary>
  </entry><entry>
    <id>tag:www.gov.uk,2005:/government/consultations/crypto-aml</id>
    <updated>2026-09-10T16:02:00+01:00</updated>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/government/consultations/crypto-aml"/>
    <title>Consultation on cryptoassets and AML supervision</title>
    <summary>AML consultation.</summary>
  </entry></feed>`;
  const recentFed = `<rss><channel><item>
    <title>Federal Reserve issues FOMC statement</title>
    <link>https://www.federalreserve.gov/newsevents/pressreleases/monetary20260913a.htm</link>
    <guid>fed-recent</guid>
    <pubDate>Sun, 13 Sep 2026 12:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const recentMining = `<rss version="2.0"><channel><item>
    <title>Gold price slips as Mideast tensions stoke Fed hike bets</title>
    <link>https://www.mining.com/gold-price-slips-as-mideast-tensions-stoke-fed-hike-bets/</link>
    <guid>https://www.mining.com/?p=1214001</guid>
    <pubDate>Tue, 15 Sep 2026 12:00:00 +0000</pubDate>
  </item>
  <item>
    <title>Triton Uranium eyes resource at Atlas project</title>
    <link>https://www.mining.com/triton-uranium-eyes-resource-at-atlas-project/</link>
    <guid>https://www.mining.com/?p=1213999</guid>
    <pubDate>Tue, 15 Sep 2026 11:00:00 +0000</pubDate>
  </item></channel></rss>`;
  const recentInvesting = `<rss version="2.0"><channel><item>
    <title>Gold dips as dollar, yields, and oil rise a day ahead of Fed’s expected rate hike</title>
    <pubDate>2026-09-15 21:04:02</pubDate>
    <link>https://www.investing.com/news/commodities-news/gold-holds-near-4300-4900741</link>
  </item>
  <item>
    <title>Oil falls as US crude inventories rise despite Saudi supply concerns</title>
    <pubDate>2026-09-16 01:00:46</pubDate>
    <link>https://www.investing.com/news/commodities-news/oil-falls-4902799</link>
  </item></channel></rss>`;
  const recentOil = `<rss version="2.0"><channel><item>
    <title>Saudi Oil Pipeline Repairs Could Take Weeks After Drone Attack</title>
    <link>https://oilprice.com/Latest-Energy-News/World-News/Saudi-Oil-Pipeline-Repairs.html</link>
    <pubDate>Tue, 15 Sep 2026 16:01:48 America/Chicago</pubDate>
  </item>
  <item>
    <title>Chinese Solar Panels Drop to 12 Cents a Watt</title>
    <link>https://oilprice.com/Alternative-Energy/Solar-Energy/Chinese-Solar-Panels.html</link>
    <pubDate>Tue, 15 Sep 2026 13:00:00 America/Chicago</pubDate>
  </item></channel></rss>`;
  const fetcher = async (url) => {
    const href = String(url);
    requested.push(href);
    if (/bankofengland|news\.google\.com/i.test(href)) {
      return jsonResponse(403, "<html><title>Access Denied</title></html>", "Forbidden");
    }
    if (href.includes("ons.gov.uk")) return jsonResponse(200, recentOns);
    if (href.includes("gov.uk")) return jsonResponse(200, recentTreasury);
    if (href.includes("federalreserve.gov")) return jsonResponse(200, recentFed);
    if (href.includes("mining.com")) return jsonResponse(200, recentMining);
    if (href.includes("investing.com")) return jsonResponse(200, recentInvesting);
    if (href.includes("oilprice.com")) return jsonResponse(200, recentOil);
    return jsonResponse(200, `<rss><channel><title>empty</title></channel></rss>`);
  };
  const summary = await runNewsPipeline(db, new Date("2026-09-16T13:00:00Z"), "manual", fetcher);
  assert.equal(summary.status, "succeeded");
  assert.equal(summary.errorCount, 0);
  assert.ok(!requested.some((url) => /bankofengland/i.test(url)));
  assert.ok(!requested.some((url) => /news\.google\.com/i.test(url)));
  assert.ok(requested.some((url) => url.includes("ons.gov.uk/releasecalendar")));
  assert.ok(requested.some((url) => url.includes("hm-treasury.atom")));
  assert.ok(requested.some((url) => url.includes("mining.com/commodity/gold")));
  assert.ok(requested.some((url) => url.includes("investing.com/rss/news_11.rss")));
  assert.ok(requested.some((url) => url.includes("oilprice.com/rss/energy")));
  const ons = summary.sources.find((source) => source.source === "ons-release-calendar");
  const treasury = summary.sources.find((source) => source.source === "hm-treasury-news");
  const mining = summary.sources.find((source) => source.source === "mining-com-gold");
  const investing = summary.sources.find((source) => source.source === "investing-commodities");
  const oil = summary.sources.find((source) => source.source === "oilprice-energy");
  assert.equal(ons?.status, "ok");
  assert.equal(ons?.seen, 1);
  assert.equal(ons?.added, 1);
  assert.ok((ons?.filteredSkipped ?? 0) >= 1);
  assert.equal(treasury?.status, "ok");
  assert.equal(treasury?.seen, 1);
  assert.equal(treasury?.added, 1);
  assert.ok((treasury?.filteredSkipped ?? 0) >= 1);
  assert.equal(mining?.added, 1);
  assert.ok((mining?.filteredSkipped ?? 0) >= 1);
  assert.equal(investing?.added, 1);
  assert.ok((investing?.filteredSkipped ?? 0) >= 1);
  assert.equal(oil?.added, 1);
  assert.ok((oil?.filteredSkipped ?? 0) >= 1);
  assert.ok(db.candidates.some((item) => item.url.includes("ons.gov.uk") && item.url.includes("gdp")));
  assert.equal(db.candidates.some((item) => /labourmarket/i.test(item.url)), false);
  assert.ok(db.candidates.some((item) => item.url.includes("budget-inflation")));
  assert.equal(db.candidates.some((item) => item.url.includes("crypto-aml")), false);
  assert.ok(db.candidates.some((item) => item.url.includes("mining.com") && /gold-price/i.test(item.url)));
  assert.equal(db.candidates.some((item) => /uranium/i.test(item.url)), false);
  assert.ok(db.candidates.some((item) => item.url.includes("investing.com") && /gold/i.test(item.url)));
  assert.equal(db.candidates.some((item) => /oil-falls/i.test(item.url)), false);
  assert.ok(db.candidates.some((item) => item.url.includes("oilprice.com") && /Pipeline/i.test(item.url)));
  assert.equal(db.candidates.some((item) => /Solar-Panels/i.test(item.url)), false);
  assert.ok(db.candidates.every((item) => item.status === "published"));
  assert.ok(db.candidates.every((item) => item.reviewed_by === "auto-pipeline"));
});

test("pipeline auto-publishes existing pending rows and never publishes rejected ones", async () => {
  const { runNewsPipeline } = loadPipeline();
  const db = memoryDb([
    {
      id: "old-pending",
      url: "https://www.federalreserve.gov/old.htm",
      title: "Old pending brief",
      summary: "Queued earlier",
      source_language: "en",
      status: "pending",
    },
    {
      id: "approved-row",
      url: "https://www.federalreserve.gov/approved.htm",
      title: "Previously approved brief",
      summary: "Waiting on schedule",
      source_language: "en",
      status: "approved",
      scheduled_for: "2026-09-14T12:00:00.000Z",
    },
    {
      id: "approved-future",
      url: "https://www.federalreserve.gov/later.htm",
      title: "Future scheduled brief",
      summary: "Not due yet",
      source_language: "en",
      status: "approved",
      scheduled_for: "2026-09-14T18:00:00.000Z",
    },
    {
      id: "rejected-1",
      url: "https://www.federalreserve.gov/rejected.htm",
      title: "Rejected brief",
      summary: "Do not publish",
      source_language: "en",
      status: "rejected",
    },
  ]);
  const fetcher = async () => jsonResponse(200, `<rss><channel><title>empty</title></channel></rss>`);
  const summary = await runNewsPipeline(db, new Date("2026-09-14T13:00:00Z"), "manual", fetcher);
  assert.equal(summary.publishedCount, 2);
  assert.equal(db.candidates.find((item) => item.id === "old-pending")?.status, "published");
  assert.equal(db.candidates.find((item) => item.id === "old-pending")?.reviewed_by, "auto-pipeline");
  assert.equal(db.candidates.find((item) => item.id === "old-pending")?.translation_provider, "mymemory");
  assert.equal(db.candidates.find((item) => item.id === "approved-row")?.status, "published");
  assert.equal(db.candidates.find((item) => item.id === "approved-future")?.status, "approved");
  assert.equal(db.candidates.find((item) => item.id === "rejected-1")?.status, "rejected");
  assert.equal(db.candidates.find((item) => item.id === "rejected-1")?.title_zh, undefined);
});

test("admin approve publishes immediately when scheduled_for is due", async () => {
  const { reviewNewsCandidate } = loadPipeline();
  const db = memoryDb([
    {
      id: "due-1",
      url: "https://www.federalreserve.gov/due.htm",
      title: "Due brief",
      summary: "Publish now",
      source_language: "en",
      status: "pending",
    },
  ]);
  const now = new Date("2026-09-14T13:00:00Z");
  const published = await reviewNewsCandidate(db, {
    id: "due-1",
    action: "approve",
    reviewedBy: "admin@99gold.net",
    now,
  });
  assert.equal(published.status, "published");
  assert.equal(published.publishedAt, now.toISOString());
  assert.equal(db.candidates[0].status, "published");
  assert.equal(db.candidates[0].reviewed_by, "admin@99gold.net");
  assert.match(db.candidates[0].title_zh, /中文：/);
  assert.equal(db.candidates[0].published_at, now.toISOString());

  const later = await reviewNewsCandidate(db, {
    id: "due-1",
    action: "approve",
    reviewedBy: "admin@99gold.net",
    now,
  });
  assert.equal(later, null);

  db.candidates.push({
    id: "later-1",
    url: "https://www.federalreserve.gov/later-admin.htm",
    title: "Later brief",
    summary: "Wait",
    source_language: "en",
    status: "pending",
  });
  const scheduled = await reviewNewsCandidate(db, {
    id: "later-1",
    action: "approve",
    scheduledFor: new Date("2026-09-14T18:00:00Z"),
    reviewedBy: "admin@99gold.net",
    now,
  });
  assert.equal(scheduled.status, "approved");
  assert.equal(db.candidates.find((item) => item.id === "later-1")?.status, "approved");
  assert.equal(db.candidates.find((item) => item.id === "later-1")?.published_at, undefined);
});

test("backfill retranlates published briefs that still lack zh/ja titles", async () => {
  const { backfillPublishedTranslations } = loadPipeline();
  const db = memoryDb([
    {
      id: "gap-1",
      url: "https://www.ecb.europa.eu/gap.htm",
      title: "Christine Lagarde: interview",
      summary: "ECB interview",
      source_language: "en",
      status: "published",
      published_at: "2026-09-14T12:00:00.000Z",
      title_zh: "",
      title_en: "Christine Lagarde: interview",
      title_ja: "Christine Lagarde: interview",
    },
    {
      id: "ok-1",
      url: "https://www.federalreserve.gov/ok.htm",
      title: "Federal Reserve issues FOMC statement",
      summary: "Official decision",
      source_language: "en",
      status: "published",
      published_at: "2026-09-14T11:00:00.000Z",
      title_zh: "聯邦準備理事會發布FOMC聲明",
      title_ja: "米連邦準備制度理事会がFOMC声明を発表",
    },
    {
      id: "cooled-1",
      url: "https://www.ecb.europa.eu/cooled.htm",
      title: "Monetary policy statement",
      summary: "Rates",
      source_language: "en",
      status: "published",
      published_at: "2026-09-14T12:30:00.000Z",
      title_zh: "Monetary policy statement",
      title_ja: "Monetary policy statement",
      translation_retry_at: "2026-09-14T20:00:00.000Z",
    },
  ]);
  const count = await backfillPublishedTranslations(db, "2026-09-14T13:00:00.000Z", 3);
  assert.equal(count, 1);
  assert.match(db.candidates.find((item) => item.id === "gap-1")?.title_zh, /中文：/);
  assert.equal(db.candidates.find((item) => item.id === "ok-1")?.title_zh, "聯邦準備理事會發布FOMC聲明");
  assert.equal(db.candidates.find((item) => item.id === "cooled-1")?.title_zh, "Monetary policy statement");
});
