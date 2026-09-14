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
    URL,
    setTimeout,
    clearTimeout,
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
