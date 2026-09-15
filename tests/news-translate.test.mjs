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
    Number,
    Math,
    URL,
    setTimeout,
    clearTimeout,
    Promise,
    fetch: extras.fetch,
    process: extras.process ?? { env: {} },
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

const translate = moduleFrom("../lib/news/translate.ts");

const englishTitle = "Federal Reserve issues FOMC statement";
const englishSummary = "Official policy decision for gold-relevant rates.";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("localizedBriefFields selects zh/en/ja titles and marks MT translations", () => {
  const row = {
    title: englishTitle,
    summary: englishSummary,
    source_language: "en",
    title_zh: "聯邦準備理事會發布FOMC聲明",
    title_en: englishTitle,
    title_ja: "米連邦準備制度理事会がFOMC声明を発表",
    summary_zh: "與金價相關的官方利率決定。",
    summary_en: englishSummary,
    summary_ja: "金に関係する公式の政策決定。",
    translation_provider: "mymemory",
  };
  const zh = translate.localizedBriefFields(row, "zh");
  assert.equal(zh.title, "聯邦準備理事會發布FOMC聲明");
  assert.equal(zh.summary, "與金價相關的官方利率決定。");
  assert.equal(zh.translated, true);
  assert.equal(zh.translationLabel, "機器翻譯");

  const en = translate.localizedBriefFields(row, "en");
  assert.equal(en.title, englishTitle);
  assert.equal(en.summary, englishSummary);
  assert.equal(en.translated, false);
  assert.equal(en.translationLabel, null);

  const ja = translate.localizedBriefFields(row, "ja");
  assert.equal(ja.title, "米連邦準備制度理事会がFOMC声明を発表");
  assert.equal(ja.translated, true);
  assert.equal(ja.translationLabel, "機械翻訳");
});

test("localizedBriefFields does not claim translation when zh/ja fields are still English", () => {
  const row = {
    title: englishTitle,
    summary: englishSummary,
    source_language: "en",
    title_zh: englishTitle,
    title_en: englishTitle,
    title_ja: englishTitle,
    summary_zh: englishSummary,
    summary_en: englishSummary,
    summary_ja: englishSummary,
    translation_provider: "mymemory",
  };
  const zh = translate.localizedBriefFields(row, "zh");
  assert.equal(zh.title, englishTitle);
  assert.equal(zh.translated, false);
  assert.equal(zh.translationPending, true);
  assert.equal(zh.translationPendingLabel, "原文／翻譯待補");
  const ja = translate.localizedBriefFields(row, "ja");
  assert.equal(ja.translationPending, true);
  assert.equal(ja.translationPendingLabel, "原文／翻訳待ち");
  const en = translate.localizedBriefFields(row, "en");
  assert.equal(en.translationPending, false);
  assert.equal(en.translationPendingLabel, null);
});

test("localizedBriefFields never prefers empty zh/ja fields over the source title", () => {
  const row = {
    title: englishTitle,
    summary: englishSummary,
    source_language: "en",
    title_zh: "   ",
    title_en: "",
    title_ja: null,
    summary_zh: "",
    summary_en: null,
    summary_ja: "   ",
    translation_provider: "mymemory",
  };
  const zh = translate.localizedBriefFields(row, "zh");
  assert.equal(zh.title, englishTitle);
  assert.equal(zh.summary, englishSummary);
  assert.equal(zh.translated, false);
  assert.equal(zh.translationPending, true);
  assert.equal(translate.needsTranslationBackfill(row), true);
  const ja = translate.localizedBriefFields(row, "ja");
  assert.equal(ja.title, englishTitle);
  assert.ok(ja.title.length > 0);
  assert.equal(ja.translationPending, true);
});

test("OpenAI path translates title and summary when OPENAI_API_KEY is set", async () => {
  const seen = [];
  const fetcher = async (url, init) => {
    seen.push({ url: String(url), body: JSON.parse(init.body) });
    return jsonResponse({
      choices: [{
        message: {
          content: JSON.stringify({
            title: {
              zh: "聯邦準備理事會發布FOMC聲明",
              en: englishTitle,
              ja: "米連邦準備制度理事会がFOMC声明を発表",
            },
            summary: {
              zh: "官方政策決定",
              en: englishSummary,
              ja: "公式の政策決定",
            },
          }),
        },
      }],
    });
  };
  const result = await translate.translateOfficialBrief(englishTitle, englishSummary, "en", {
    fetch: fetcher,
    env: { OPENAI_API_KEY: "sk-test" },
    delayMs: 0,
  });
  assert.equal(result.provider, "openai");
  assert.equal(result.translated, true);
  assert.equal(result.titles.en, englishTitle);
  assert.equal(result.titles.zh, "聯邦準備理事會發布FOMC聲明");
  assert.match(result.titles.ja, /連邦/);
  assert.equal(seen.length, 1);
  assert.match(seen[0].url, /api\.openai\.com/);
  assert.equal(seen[0].body.model, "gpt-4o-mini");
});

test("MyMemory is the no-key fallback and keeps English as a cleaned original", async () => {
  translate.resetMyMemoryGate();
  const seen = [];
  const fetcher = async (url) => {
    const href = new URL(url);
    seen.push(href.searchParams.get("langpair"));
    const target = href.searchParams.get("langpair")?.split("|")[1];
    const q = href.searchParams.get("q");
    const translated = target === "zh-TW" ? `中文${q}` : `日本語${q}`;
    return jsonResponse({ responseStatus: 200, responseData: { translatedText: translated } });
  };
  const result = await translate.translateOfficialBrief(`  ${englishTitle}  `, `  ${englishSummary}  `, "en", {
    fetch: fetcher,
    env: {},
    delayMs: 0,
  });
  assert.equal(result.provider, "mymemory");
  assert.equal(result.titles.en, englishTitle);
  assert.equal(result.summaries.en, englishSummary);
  assert.match(result.titles.zh, /^中文/);
  assert.match(result.titles.ja, /^日本語/);
  assert.ok(seen.includes("en|zh-TW"));
  assert.ok(seen.includes("en|ja"));
});

test("failed OpenAI calls fall through to MyMemory", async () => {
  translate.resetMyMemoryGate();
  const fetcher = async (url) => {
    if (String(url).includes("openai.com")) {
      return jsonResponse({ error: "quota" }, 429);
    }
    const target = new URL(url).searchParams.get("langpair")?.split("|")[1];
    const q = new URL(url).searchParams.get("q");
    return jsonResponse({
      responseStatus: 200,
      responseData: { translatedText: target === "zh-TW" ? `繁中${q}` : `和訳${q}` },
    });
  };
  const result = await translate.translateOfficialBrief(englishTitle, englishSummary, "en", {
    fetch: fetcher,
    env: { TRANSLATE_API_KEY: "sk-test" },
    delayMs: 0,
  });
  assert.equal(result.provider, "mymemory");
  assert.match(result.titles.zh, /^繁中/);
  assert.match(result.titles.ja, /^和訳/);
});

test("MyMemory 429 honors Retry-After, retries with jitter, then succeeds", async () => {
  translate.resetMyMemoryGate();
  const sleeps = [];
  let now = 5_000_000;
  let calls = 0;
  const fetcher = async (url) => {
    if (!String(url).includes("mymemory")) return jsonResponse({});
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ responseStatus: 429, responseData: {} }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "1" },
      });
    }
    const target = new URL(url).searchParams.get("langpair")?.split("|")[1];
    const q = new URL(url).searchParams.get("q");
    return jsonResponse({
      responseStatus: 200,
      responseData: { translatedText: target === "zh-TW" ? `中文${q}` : `日本語${q}` },
    });
  };
  const result = await translate.translateOfficialBrief(englishTitle, englishSummary, "en", {
    fetch: fetcher,
    env: {},
    delayMs: 0,
    now: () => now,
    random: () => 0,
    sleep: async (ms) => { sleeps.push(ms); now += ms; },
  });
  assert.equal(result.provider, "mymemory");
  assert.match(result.titles.zh, /^中文/);
  assert.ok(calls >= 5);
  assert.ok(sleeps.some((ms) => ms >= 1000), `backoff sleeps: ${sleeps.join(",")}`);
  assert.equal(translate.parseRetryAfterMs("1"), 1000);
  assert.equal(translate.mymemoryBackoffMs(0, 1000, () => 0), 1000);
  assert.ok(translate.mymemoryBackoffMs(1, null, () => 0) > translate.MYMEMORY_DEFAULT_429_MS);
});

test("MyMemory calls are serialized and long 429 pauses skip later locales without blanking English", async () => {
  translate.resetMyMemoryGate();
  const inflight = [];
  let maxInflight = 0;
  let calls = 0;
  const fetcher = async (url) => {
    calls += 1;
    inflight.push(calls);
    maxInflight = Math.max(maxInflight, inflight.length);
    await Promise.resolve();
    inflight.pop();
    if (calls === 1) {
      const q = new URL(url).searchParams.get("q");
      return jsonResponse({
        responseStatus: 200,
        responseData: { translatedText: `中文${q}` },
      });
    }
    return new Response(JSON.stringify({ responseStatus: 429, responseData: {} }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "120" },
    });
  };
  const result = await translate.translateOfficialBrief(englishTitle, englishSummary, "en", {
    fetch: fetcher,
    env: {},
    delayMs: 0,
    random: () => 0,
    sleep: async () => {},
  });
  assert.equal(maxInflight, 1);
  assert.match(result.titles.zh, /^中文/);
  assert.equal(result.titles.ja, englishTitle);
  assert.equal(result.titles.en, englishTitle);
  assert.equal(result.complete, false);
  assert.equal(result.translated, true);
  assert.ok(translate.isMyMemoryCoolingDown());
  assert.ok(result.titles.zh.length > 0);
  assert.ok(result.titles.ja.length > 0);
});

test("retranslate selection skips cooled-down rows and keeps due English gaps", () => {
  const now = "2026-09-14T13:00:00.000Z";
  const due = translate.selectRetranslateCandidates([
    {
      title: englishTitle,
      summary: englishSummary,
      title_zh: englishTitle,
      title_ja: englishTitle,
      translation_retry_at: null,
    },
    {
      title: englishTitle,
      summary: englishSummary,
      title_zh: "聯邦準備理事會發布FOMC聲明",
      title_ja: "米連邦準備制度理事会がFOMC声明を発表",
    },
    {
      title: englishTitle,
      summary: englishSummary,
      title_zh: "",
      title_ja: englishTitle,
      translation_retry_at: "2026-09-14T20:00:00.000Z",
    },
  ], now, 5);
  assert.equal(due.length, 1);
  assert.equal(due[0].translation_retry_at, null);
  const retryAt = Date.parse(translate.nextTranslationRetryAt(now, { rateLimited: true, attempts: 1 }));
  assert.ok(retryAt > Date.parse(now) + 6 * 60 * 60 * 1000);
});

test("existing zh is kept so a later ja-only retranslate does not hammer zh", async () => {
  translate.resetMyMemoryGate();
  const seen = [];
  const fetcher = async (url) => {
    const href = new URL(url);
    seen.push(href.searchParams.get("langpair"));
    const q = href.searchParams.get("q");
    return jsonResponse({
      responseStatus: 200,
      responseData: { translatedText: `日本語${q}` },
    });
  };
  const result = await translate.translateOfficialBrief(englishTitle, englishSummary, "en", {
    fetch: fetcher,
    env: {},
    delayMs: 0,
    existing: {
      titles: { zh: "聯邦準備理事會發布FOMC聲明", en: englishTitle, ja: englishTitle },
      summaries: { zh: "與金價相關的官方利率決定。", en: englishSummary, ja: englishSummary },
      provider: "mymemory",
    },
  });
  assert.equal(result.titles.zh, "聯邦準備理事會發布FOMC聲明");
  assert.match(result.titles.ja, /^日本語/);
  assert.equal(result.complete, true);
  assert.ok(!seen.includes("en|zh-TW"));
  assert.ok(seen.includes("en|ja"));
});
