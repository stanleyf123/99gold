import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const code = ts.transpileModule(
  readFileSync(new URL("../app/api/bank-of-taiwan-fx.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {}, module: { exports: {} }, Date, Number, RegExp, String, Array, Math };
vm.runInNewContext(code, context);
const { parseBankOfTaiwanUsdSpotRate, BANK_OF_TAIWAN_RATE_URL } = context.exports;

const sampleHtml = `
<html><body>
<span class="time">2026/09/14 14:05</span>
<table>
<tr><td>歐元 (EUR)</td><td data-table="本行即期買入">33.1</td><td data-table="本行即期賣出">33.9</td></tr>
<tr><td>美金 (USD)</td><td data-table="本行即期買入">31.105</td><td data-table="本行即期賣出">31.215</td></tr>
</table>
</body></html>`;

test("exports the official BOT rate URL", () => {
  assert.equal(BANK_OF_TAIWAN_RATE_URL, "https://rate.bot.com.tw/xrt?Lang=zh-TW");
});

test("parses USD spot buy/sell and Taipei quote time as UTC ISO", () => {
  const rate = parseBankOfTaiwanUsdSpotRate(sampleHtml);
  assert.ok(rate);
  assert.equal(rate.currency, "USD");
  assert.equal(rate.bankBuysUsd, 31.105);
  assert.equal(rate.bankSellsUsd, 31.215);
  assert.equal(rate.quotedAt, "2026-09-14T06:05:00.000Z");
  assert.equal(rate.sourceUrl, BANK_OF_TAIWAN_RATE_URL);
});

test("rejects missing USD row or inverted buy/sell", () => {
  assert.equal(parseBankOfTaiwanUsdSpotRate(""), null);
  assert.equal(parseBankOfTaiwanUsdSpotRate("<span class=\"time\">2026/09/14 14:05</span>"), null);
  const inverted = sampleHtml.replace("31.215", "30.000");
  assert.equal(parseBankOfTaiwanUsdSpotRate(inverted), null);
});
