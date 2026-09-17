import { getRawDb } from "../db";
import { COVER_BACKFILL_BATCH, backfillPublishedCovers } from "../lib/news/pipeline";

function limitFromArgs(argv: string[]) {
  const paired = argv.find((value) => value.startsWith("--limit="));
  if (paired) return Number(paired.slice("--limit=".length));
  const index = argv.indexOf("--limit");
  if (index >= 0) return Number(argv[index + 1]);
  return COVER_BACKFILL_BATCH;
}

const parsedLimit = limitFromArgs(process.argv);
const limit = Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : COVER_BACKFILL_BATCH);
const filled = await backfillPublishedCovers(getRawDb(), fetch, limit);
console.log(JSON.stringify({ event: "news_cover_backfill", filled, limit }));
process.exit(0);
