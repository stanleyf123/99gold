import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(
  readFileSync(new URL("../lib/price-alerts.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText;
const context = { exports: {}, module: { exports: {} }, Date, Number, Math, String, Array, JSON };
vm.runInNewContext(code, context);
const {
  alertDirectionFromQuote,
  alertHasCrossed,
  shouldFireAlert,
  resetNotificationIfUncrossed,
  parseStoredAlerts,
  createPriceAlert,
  notificationCopy,
  NOTIFY_COOLDOWN_MS,
} = context.exports;

test("infers above/below from the live quote when the alert is created", () => {
  assert.equal(alertDirectionFromQuote(16500, 17000), "above");
  assert.equal(alertDirectionFromQuote(16500, 16000), "below");
  const alert = createPriceAlert("qian", 17000, 16500, new Date("2026-09-14T00:00:00Z"));
  assert.equal(alert.market, "qian");
  assert.equal(alert.direction, "above");
});

test("fires once when the live quote crosses the target, then cools down", () => {
  const alert = { id: 1, market: "spot", target: 4300, direction: "above", createdAt: "2026-09-14T00:00:00Z", lastNotifiedAt: null };
  assert.equal(alertHasCrossed(4299, 4300, "above"), false);
  assert.equal(alertHasCrossed(4300, 4300, "above"), true);
  assert.equal(shouldFireAlert(alert, 4300, Date.parse("2026-09-14T01:00:00Z")), true);
  const notified = { ...alert, lastNotifiedAt: "2026-09-14T01:00:00Z" };
  assert.equal(shouldFireAlert(notified, 4305, Date.parse("2026-09-14T02:00:00Z")), false);
  assert.equal(shouldFireAlert(notified, 4305, Date.parse("2026-09-14T01:00:00Z") + NOTIFY_COOLDOWN_MS), true);
});

test("below-target alerts recross after the quote moves away", () => {
  const alert = { id: 2, market: "qian", target: 16000, direction: "below", createdAt: "2026-09-14T00:00:00Z", lastNotifiedAt: "2026-09-14T01:00:00Z" };
  assert.equal(alertHasCrossed(15900, 16000, "below"), true);
  const reset = resetNotificationIfUncrossed(alert, 16100);
  assert.equal(reset.lastNotifiedAt, null);
  assert.equal(shouldFireAlert(reset, 15900), true);
});

test("loads legacy localStorage alerts without a direction field", () => {
  const alerts = parseStoredAlerts(JSON.stringify([{ id: 9, market: "gram", target: "4416" }]));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].market, "gram");
  assert.equal(alerts[0].target, 4416);
  assert.equal(alerts[0].direction, "above");
  assert.equal(parseStoredAlerts("not-json").length, 0);
  assert.equal(notificationCopy("zh", "台灣理論金價", 16500, 17000, "TWD／錢").title, "99GOLD.NET 到價提醒");
});
