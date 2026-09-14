import { getRawDb } from "../db";
import { getGlobalQuotesOrNull } from "../lib/quotes";
import { dispatchDueAlerts, quoteSnapshotFromGlobal } from "../lib/alert-subscriptions";

const trigger = process.argv.includes("--manual") ? "manual" : "cron";

async function main() {
  const quotes = await getGlobalQuotesOrNull();
  const snapshot = quoteSnapshotFromGlobal(quotes);
  const result = await dispatchDueAlerts(getRawDb(), snapshot);
  console.log(JSON.stringify({
    event: "price_alerts_dispatch",
    trigger,
    fired: result.fired,
    sent: result.results.filter((item) => item.ok).length,
    skipped: result.results.filter((item) => item.skipped).map((item) => item.skipped),
    errors: result.results.filter((item) => item.error).map((item) => item.error),
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    event: "price_alerts_dispatch_failed",
    trigger,
    error: error instanceof Error ? error.message : "unknown",
  }));
  process.exitCode = 1;
});
