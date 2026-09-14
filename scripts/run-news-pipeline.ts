import { getRawDb } from "../db";
import { runNewsPipeline, type NewsRunTrigger } from "../lib/news/pipeline";

const trigger: NewsRunTrigger = process.argv.includes("--manual") ? "manual" : "cron";
const summary = await runNewsPipeline(getRawDb(), new Date(), trigger);
console.log(JSON.stringify({ event: "news_pipeline_cli", ...summary }));
process.exit(summary.status === "failed" ? 1 : 0);
