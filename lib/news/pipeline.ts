import { inspectFeedResponse, newsFeedHeaders } from "./feed-client";
import { canonicalizeUrl, normalizedTitle, parseFeed, sha256 } from "./normalize";
import { newsSources, sourceAcceptsTitle } from "./source-config";
import { AUTO_PIPELINE_REVIEWER, translateOfficialBrief } from "./translate";

type StatementResult = { meta?: { changes?: number } };
type NewsStatement = {
  bind(...values: unknown[]): NewsStatement;
  run(): Promise<StatementResult>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
};
export type NewsDatabase = { prepare(query: string): NewsStatement };
export type NewsRunTrigger = "cron" | "manual";
export type NewsSourceRunDetail = {
  source: string;
  status: string;
  seen?: number;
  added?: number;
  staleSkipped?: number;
  error?: string;
};
export type NewsRunSummary = {
  runId: string;
  status: "succeeded" | "partial" | "failed";
  sourcesChecked: number;
  itemsSeen: number;
  candidatesAdded: number;
  duplicatesSkipped: number;
  publishedCount: number;
  errorCount: number;
  sources: NewsSourceRunDetail[];
};

type SourceState = { etag: string | null; last_modified: string | null };

const MAX_ITEM_AGE_MS = 14 * 24 * 60 * 60_000;
const FUTURE_TOLERANCE_MS = 10 * 60_000;

function errorMessage(error: unknown) {
  const raw = error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : String(error);
  return raw.replace(/\s+/g, " ").slice(0, 500);
}

async function recordSourceSuccess(
  db: NewsDatabase,
  sourceId: string,
  attemptedAt: string,
  etag: string | null,
  lastModified: string | null,
) {
  await db.prepare(`INSERT INTO news_source_state
    (source_id, etag, last_modified, last_attempt_at, last_success_at, last_error, consecutive_errors)
    VALUES (?, ?, ?, ?, ?, NULL, 0)
    ON CONFLICT(source_id) DO UPDATE SET
      etag = COALESCE(excluded.etag, news_source_state.etag),
      last_modified = COALESCE(excluded.last_modified, news_source_state.last_modified),
      last_attempt_at = excluded.last_attempt_at,
      last_success_at = excluded.last_success_at,
      last_error = NULL,
      consecutive_errors = 0`)
    .bind(sourceId, etag, lastModified, attemptedAt, attemptedAt).run();
}

async function recordSourceFailure(db: NewsDatabase, sourceId: string, attemptedAt: string, message: string) {
  await db.prepare(`INSERT INTO news_source_state
    (source_id, etag, last_modified, last_attempt_at, last_success_at, last_error, consecutive_errors)
    VALUES (?, NULL, NULL, ?, NULL, ?, 1)
    ON CONFLICT(source_id) DO UPDATE SET
      last_attempt_at = excluded.last_attempt_at,
      last_error = excluded.last_error,
      consecutive_errors = news_source_state.consecutive_errors + 1`)
    .bind(sourceId, attemptedAt, message).run();
}

type PublishableCandidate = {
  id: string;
  title: string;
  summary: string | null;
  source_language: string;
};

async function autoPublishReadyCandidates(db: NewsDatabase, now: string) {
  const pending = await db.prepare(`SELECT id, title, summary, source_language
    FROM news_candidates
    WHERE status IN ('pending', 'approved')
    ORDER BY source_published_at DESC`).all<PublishableCandidate>();
  const rows = pending?.results ?? [];
  let publishedCount = 0;
  for (const candidate of rows) {
    const translated = await translateOfficialBrief(
      candidate.title,
      candidate.summary,
      candidate.source_language || "en",
    );
    const result = await db.prepare(`UPDATE news_candidates SET
      title_zh = ?, title_en = ?, title_ja = ?,
      summary_zh = ?, summary_en = ?, summary_ja = ?,
      translation_provider = ?, translated_at = ?,
      status = 'published', scheduled_for = ?, reviewed_at = ?,
      reviewed_by = ?, published_at = ?
      WHERE id = ? AND status IN ('pending', 'approved')`)
      .bind(
        translated.titles.zh,
        translated.titles.en,
        translated.titles.ja,
        translated.summaries.zh,
        translated.summaries.en,
        translated.summaries.ja,
        translated.provider,
        now,
        now,
        now,
        AUTO_PIPELINE_REVIEWER,
        now,
        candidate.id,
      ).run();
    publishedCount += result.meta?.changes ?? 0;
  }
  return publishedCount;
}

export async function runNewsPipeline(
  db: NewsDatabase,
  scheduledFor = new Date(),
  trigger: NewsRunTrigger = "cron",
  fetcher: typeof fetch = fetch,
): Promise<NewsRunSummary> {
  const startedAt = new Date().toISOString();
  const scheduledAt = scheduledFor.toISOString();
  const runId = `news-${trigger}-${scheduledFor.getTime()}`;
  await db.prepare(`INSERT OR IGNORE INTO news_runs
    (id, trigger, scheduled_for, started_at, status)
    VALUES (?, ?, ?, ?, 'running')`)
    .bind(runId, trigger, scheduledAt, startedAt).run();

  let itemsSeen = 0;
  let candidatesAdded = 0;
  let duplicatesSkipped = 0;
  let errorCount = 0;
  const sourceDetails: NewsSourceRunDetail[] = [];
  const recentCutoff = new Date(scheduledFor.getTime() - MAX_ITEM_AGE_MS).toISOString();

  for (const source of newsSources) {
    const attemptedAt = new Date().toISOString();
    try {
      const state = await db.prepare("SELECT etag, last_modified FROM news_source_state WHERE source_id = ?")
        .bind(source.id).first<SourceState>();
      const headers = new Headers(newsFeedHeaders({
        etag: state?.etag,
        lastModified: state?.last_modified,
      }));
      const response = await fetcher(source.feedUrl, { headers, redirect: "follow", signal: AbortSignal.timeout(15_000) });
      const xml = response.status === 304 ? "" : await response.text();
      const inspection = inspectFeedResponse(response.status, response.statusText, xml);
      if (inspection.kind === "not-modified") {
        await recordSourceSuccess(db, source.id, attemptedAt, state?.etag ?? null, state?.last_modified ?? null);
        sourceDetails.push({ source: source.id, status: "not-modified", seen: 0, added: 0 });
        continue;
      }
      const feedItems = parseFeed(xml).slice(0, 50);
      let sourceSeen = 0;
      let sourceAdded = 0;
      let staleSkipped = 0;

      for (const item of feedItems) {
        const publishedTime = Date.parse(item.publishedAt);
        if (!Number.isFinite(publishedTime)
          || publishedTime > scheduledFor.getTime() + FUTURE_TOLERANCE_MS
          || !sourceAcceptsTitle(source, item.title)) continue;
        const canonicalUrl = canonicalizeUrl(item.url, source.allowedHosts);
        if (!canonicalUrl) continue;
        sourceSeen += 1;
        itemsSeen += 1;
        if (publishedTime < scheduledFor.getTime() - MAX_ITEM_AGE_MS) {
          staleSkipped += 1;
          continue;
        }
        const titleHash = await sha256(normalizedTitle(item.title));
        const externalId = item.externalId.slice(0, 800);
        const duplicate = await db.prepare(`SELECT id FROM news_candidates
          WHERE canonical_url = ?
             OR (source_id = ? AND external_id = ?)
             OR (title_hash = ? AND first_seen_at >= ?)
          LIMIT 1`)
          .bind(canonicalUrl, source.id, externalId, titleHash, recentCutoff).first<{ id: string }>();
        if (duplicate) {
          duplicatesSkipped += 1;
          continue;
        }
        const candidateHash = await sha256(`${source.id}\n${externalId}\n${canonicalUrl}`);
        const result = await db.prepare(`INSERT OR IGNORE INTO news_candidates
          (id, source_id, external_id, canonical_url, title, title_hash, summary, source_name,
           source_language, category, source_published_at, first_seen_at, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`)
          .bind(
            `${source.id}-${candidateHash.slice(0, 24)}`,
            source.id,
            externalId,
            canonicalUrl,
            item.title.slice(0, 500),
            titleHash,
            item.summary.slice(0, 800),
            source.name,
            source.language,
            source.category,
            item.publishedAt,
            attemptedAt,
          ).run();
        const changes = result.meta?.changes ?? 0;
        candidatesAdded += changes;
        sourceAdded += changes;
        if (!changes) duplicatesSkipped += 1;
      }

      await recordSourceSuccess(
        db,
        source.id,
        attemptedAt,
        response.headers.get("etag"),
        response.headers.get("last-modified"),
      );
      sourceDetails.push({ source: source.id, status: "ok", seen: sourceSeen, added: sourceAdded, staleSkipped });
    } catch (error) {
      errorCount += 1;
      const message = errorMessage(error);
      await recordSourceFailure(db, source.id, attemptedAt, message);
      sourceDetails.push({ source: source.id, status: "error", error: message });
      console.error(JSON.stringify({
        event: "news_pipeline_source_error",
        source: source.id,
        feedUrl: source.feedUrl,
        error: message,
      }));
    }
  }

  const publishedCount = await autoPublishReadyCandidates(db, new Date().toISOString());
  const status: NewsRunSummary["status"] = errorCount === 0 ? "succeeded" : errorCount < newsSources.length ? "partial" : "failed";
  const finishedAt = new Date().toISOString();
  await db.prepare(`UPDATE news_runs SET
    finished_at = ?, status = ?, sources_checked = ?, items_seen = ?, candidates_added = ?,
    duplicates_skipped = ?, published_count = ?, error_count = ?, details = ?
    WHERE id = ?`)
    .bind(
      finishedAt,
      status,
      newsSources.length,
      itemsSeen,
      candidatesAdded,
      duplicatesSkipped,
      publishedCount,
      errorCount,
      JSON.stringify(sourceDetails),
      runId,
    ).run();

  const summary: NewsRunSummary = {
    runId,
    status,
    sourcesChecked: newsSources.length,
    itemsSeen,
    candidatesAdded,
    duplicatesSkipped,
    publishedCount,
    errorCount,
    sources: sourceDetails,
  };
  console.log(JSON.stringify({ event: "news_pipeline_completed", ...summary }));
  return summary;
}
