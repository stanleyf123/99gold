import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("../lib/news-excerpt.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {}, module: { exports: {} } };
vm.runInNewContext(code, context);
const { newsExcerpt } = context.exports;

test("strips markup and treats blank summaries as missing", () => {
  assert.equal(newsExcerpt(null), null);
  assert.equal(newsExcerpt("   "), null);
  assert.equal(newsExcerpt("<p>  </p>"), null);
  assert.equal(newsExcerpt("<b>Official</b> CPI note."), "Official CPI note.");
});

test("clamps long excerpts on a word boundary", () => {
  const long = "Gold prices moved after the inflation print. ".repeat(12);
  const excerpt = newsExcerpt(long, 80);
  assert.ok(excerpt.endsWith("…"));
  assert.ok(excerpt.length <= 80);
  assert.doesNotMatch(excerpt, /</);
});
