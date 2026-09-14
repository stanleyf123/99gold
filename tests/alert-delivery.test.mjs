import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

function load(path, requireMap = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require: (id) => {
      if (requireMap[id]) return requireMap[id];
      if (id.startsWith("node:")) return nodeRequire(id);
      throw new Error(`unexpected require: ${id}`);
    },
    Intl,
    Date,
    Number,
    Math,
    String,
    Array,
    JSON,
    Buffer,
    URL,
    URLSearchParams,
    console,
    AbortSignal,
    setTimeout,
    process,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const priceAlerts = load("../lib/price-alerts.ts");
const delivery = load("../lib/alert-delivery.ts", { "./price-alerts": priceAlerts });

const {
  emailTransportConfigured,
  lineTransportConfigured,
  publicChannelStatus,
  sendAlertEmail,
  sendAlertLine,
  resetDeliveryThrottleForTests,
  isEmailAddress,
  GLOBAL_SEND_GAP_MS,
} = delivery;

const message = {
  locale: "zh",
  market: "qian",
  marketLabel: "台灣理論金價",
  current: 17200,
  target: 17000,
  unit: "TWD／錢",
};

test("email and LINE stay disabled until env hooks exist", () => {
  assert.equal(emailTransportConfigured({}), false);
  assert.equal(lineTransportConfigured({}), false);
  const status = publicChannelStatus({ ALERT_EMAIL_TO: "owner@99gold.net" });
  assert.equal(status.email.configured, false);
  assert.equal(status.browser, true);
  assert.equal(isEmailAddress("owner@99gold.net"), true);
  assert.equal(isEmailAddress("not-an-email"), false);
});

test("sends Resend and LINE Messaging when keys are present, then cools down", async () => {
  resetDeliveryThrottleForTests();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), body: String(init.body), headers: init.headers });
    return { ok: true, status: 200 };
  };
  const env = {
    ALERT_EMAIL_TO: "owner@99gold.net",
    ALERT_EMAIL_FROM: "alerts@99gold.net",
    RESEND_API_KEY: "re_test",
    LINE_CHANNEL_ACCESS_TOKEN: "token",
    LINE_USER_ID: "U123",
  };
  const email = await sendAlertEmail(message, env, { nowMs: 1_000, fetchImpl });
  assert.equal(email.ok, true);
  assert.match(calls[0].url, /resend.com\/emails/);
  assert.match(calls[0].body, /台灣理論金價/);
  const throttled = await sendAlertLine(message, env, { nowMs: 1_000 + 1_000, fetchImpl });
  assert.equal(throttled.skipped, "global-throttle");
  resetDeliveryThrottleForTests();
  const line = await sendAlertLine(message, env, { nowMs: 1_000 + GLOBAL_SEND_GAP_MS, fetchImpl });
  assert.equal(line.ok, true);
  assert.match(calls.at(-1).url, /api.line.me\/v2\/bot\/message\/push/);
  assert.equal(publicChannelStatus(env).email.configured, true);
  assert.equal(publicChannelStatus(env).line.configured, true);
});

test("LINE Notify and webhook remain valid hooks without inventing paid infra", async () => {
  resetDeliveryThrottleForTests();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), body: String(init.body) });
    return { ok: true, status: 200 };
  };
  const notify = await sendAlertLine(message, { LINE_NOTIFY_TOKEN: "legacy" }, { nowMs: 50_000, fetchImpl });
  assert.equal(notify.ok, true);
  assert.match(calls[0].url, /notify-api.line.me/);
  resetDeliveryThrottleForTests();
  const hook = await sendAlertLine(message, { LINE_WEBHOOK_URL: "https://example.com/hook" }, { nowMs: 90_000, fetchImpl });
  assert.equal(hook.ok, true);
  assert.equal(calls[1].url, "https://example.com/hook");
});
