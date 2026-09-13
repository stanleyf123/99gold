import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("../app/api/quote-timing.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {}, Intl, Date, Number };
vm.runInNewContext(code, context);
const { getGoldMarketStatus } = context.exports;

const statusAt = (now, quote = now) => getGoldMarketStatus(new Date(now), quote);

test("classifies the CME gold weekend boundary in New York time", () => {
  assert.equal(statusAt("2026-09-11T20:59:00Z"), "open");
  assert.equal(statusAt("2026-09-11T21:00:00Z"), "weekend-closed");
  assert.equal(statusAt("2026-09-12T12:00:00Z"), "weekend-closed");
  assert.equal(statusAt("2026-09-13T21:59:00Z"), "weekend-closed");
  assert.equal(statusAt("2026-09-13T22:00:00Z"), "open");
});

test("classifies daily breaks across daylight-saving and standard time", () => {
  assert.equal(statusAt("2026-09-14T21:30:00Z"), "daily-break");
  assert.equal(statusAt("2026-09-14T22:00:00Z"), "open");
  assert.equal(statusAt("2026-12-07T22:30:00Z"), "daily-break");
  assert.equal(statusAt("2026-12-07T23:00:00Z"), "open");
});

test("separates delayed, invalid and future quote timestamps", () => {
  assert.equal(statusAt("2026-09-15T15:00:00Z", "2026-09-15T14:30:00Z"), "delayed");
  assert.equal(statusAt("2026-09-15T15:00:00Z", "not-a-date"), "unavailable");
  assert.equal(statusAt("2026-09-15T15:00:00Z", "2026-09-15T15:06:00Z"), "unavailable");
});
