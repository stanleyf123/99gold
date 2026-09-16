import { NextResponse } from "next/server";
import { getRawDb } from "../../../../db";
import { currentSourceHealth } from "../../../../lib/news/source-config";
import { getAdminUser } from "../../../chatgpt-auth";
import { reviewNewsCandidate, runNewsPipeline } from "../../../../lib/news/pipeline";

async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) return { error: NextResponse.json({ error: "請先登入管理後台" }, { status: 401 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const db = getRawDb();
    const [candidates, sources, runs] = await Promise.all([
      db.prepare(`SELECT id, title, summary, canonical_url, source_name, category,
        source_published_at, first_seen_at, status, scheduled_for, published_at,
        translation_provider, reviewed_by, title_zh, title_en, title_ja
        FROM news_candidates
        ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
        source_published_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT source_id, last_attempt_at, last_success_at, last_error, consecutive_errors
        FROM news_source_state ORDER BY source_id`).all<{
          source_id: string;
          last_attempt_at: string | null;
          last_success_at: string | null;
          last_error: string | null;
          consecutive_errors: number;
        }>(),
      db.prepare(`SELECT id, trigger, scheduled_for, finished_at, status, sources_checked,
        items_seen, candidates_added, duplicates_skipped, published_count, error_count
        FROM news_runs ORDER BY started_at DESC LIMIT 20`).all(),
    ]);
    return NextResponse.json({
      candidates: candidates.results,
      sources: currentSourceHealth(sources.results),
      runs: runs.results,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ candidates: [], sources: [], runs: [], error: "新聞排程資料尚未就緒" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const result = await runNewsPipeline(getRawDb(), new Date(), "manual");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "新聞來源檢查失敗" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json() as { id?: string; action?: "approve" | "reject"; scheduledFor?: string };
  const id = body.id?.trim();
  if (!id || !body.action) return NextResponse.json({ error: "缺少候選新聞或操作" }, { status: 400 });

  try {
    const scheduledFor = body.action === "approve" && body.scheduledFor ? new Date(body.scheduledFor) : undefined;
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return NextResponse.json({ error: "排程時間格式錯誤" }, { status: 400 });
    }
    const result = await reviewNewsCandidate(getRawDb(), {
      id,
      action: body.action,
      scheduledFor,
      reviewedBy: auth.user.email,
    });
    if (!result) return NextResponse.json({ error: "候選新聞不存在或已發布" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error && error.message === "invalid-schedule" ? "排程時間格式錯誤" : "審核失敗";
    return NextResponse.json({ error: message }, { status: message === "排程時間格式錯誤" ? 400 : 503 });
  }
}
