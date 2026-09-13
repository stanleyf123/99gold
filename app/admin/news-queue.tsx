"use client";

import { useCallback, useEffect, useState } from "react";

type Candidate = {
  id: string;
  title: string;
  summary: string | null;
  canonical_url: string;
  source_name: string;
  category: string;
  source_published_at: string;
  first_seen_at: string;
  status: "pending" | "approved" | "published" | "rejected";
  scheduled_for: string | null;
  published_at: string | null;
};
type SourceState = {
  source_id: string;
  last_attempt_at: string;
  last_success_at: string | null;
  last_error: string | null;
  consecutive_errors: number;
};
type Run = {
  id: string;
  trigger: string;
  finished_at: string | null;
  status: string;
  items_seen: number;
  candidates_added: number;
  duplicates_skipped: number;
  published_count: number;
  error_count: number;
};
type QueueData = { candidates: Candidate[]; sources: SourceState[]; runs: Run[] };

const emptyQueue: QueueData = { candidates: [], sources: [], runs: [] };
const statusNames = { pending: "待審核", approved: "已排程", published: "已發布", rejected: "已拒絕" } as const;

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

export default function NewsQueue() {
  const [data, setData] = useState<QueueData>(emptyQueue);
  const [status, setStatus] = useState("讀取排程狀態中…");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/news", { cache: "no-store" });
      if (!response.ok) throw new Error("排程資料無法讀取");
      setData({ ...emptyQueue, ...(await response.json()) });
      setStatus("新聞排程狀態已同步");
    } catch {
      setStatus("新聞排程資料尚未就緒");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const discover = async () => {
    setBusy(true);
    setStatus("正在檢查官方新聞來源…");
    try {
      const response = await fetch("/api/admin/news", { method: "POST" });
      if (!response.ok) throw new Error("來源檢查失敗");
      const result = await response.json() as { candidatesAdded?: number; publishedCount?: number };
      setStatus(`檢查完成：新增 ${result.candidatesAdded ?? 0} 則候選，發布 ${result.publishedCount ?? 0} 則`);
      await load();
    } catch {
      setStatus("來源檢查失敗，已保留既有內容");
    } finally {
      setBusy(false);
    }
  };

  const review = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    setStatus(action === "approve" ? "正在加入發布排程…" : "正在拒絕候選…");
    try {
      const response = await fetch("/api/admin/news", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) throw new Error("審核失敗");
      setStatus(action === "approve" ? "已核准，將於下一個 30 分鐘週期發布" : "已拒絕候選新聞");
      await load();
    } catch {
      setStatus("審核失敗，請稍後重試");
    } finally {
      setBusy(false);
    }
  };

  const visibleCandidates = data.candidates.filter((candidate) => candidate.status !== "rejected");
  const latestRun = data.runs[0];
  return <section className="newsQueue" id="news-schedule">
    <header>
      <div><p>NEWS OPERATIONS</p><h2>新聞來源與發布排程</h2></div>
      <button type="button" disabled={busy} onClick={() => void discover()}>{busy ? "處理中…" : "立即檢查官方來源"}</button>
    </header>
    <p className="newsQueueStatus">{status}</p>
    <div className="newsScheduleSummary">
      <article><span>自動檢查</span><strong>每 30 分鐘</strong><small>僅限白名單官方 RSS</small></article>
      <article><span>發布方式</span><strong>人工核准</strong><small>核准後由排程發布</small></article>
      <article><span>最近執行</span><strong>{latestRun ? statusNames[latestRun.status as keyof typeof statusNames] ?? latestRun.status : "尚無紀錄"}</strong><small>{latestRun ? formatTime(latestRun.finished_at) : "等待首次排程"}</small></article>
    </div>
    <div className="sourceHealth">
      <h3>來源健康狀態</h3>
      {data.sources.length ? data.sources.map((source) => <article key={source.source_id}>
        <div><strong>{source.source_id}</strong><small>最近成功 {formatTime(source.last_success_at)}</small></div>
        <span className={source.consecutive_errors ? "error" : "healthy"}>{source.consecutive_errors ? `連續失敗 ${source.consecutive_errors} 次` : "正常"}</span>
        {source.last_error && <p>{source.last_error}</p>}
      </article>) : <p>完成第一次來源檢查後顯示。</p>}
    </div>
    <div className="candidateQueue">
      <h3>候選與排程</h3>
      {visibleCandidates.length ? visibleCandidates.map((candidate) => <article key={candidate.id}>
        <div className="candidateMeta"><span className={`candidateStatus ${candidate.status}`}>{statusNames[candidate.status]}</span><span>{candidate.source_name}</span><time>{formatTime(candidate.source_published_at)}</time></div>
        <h4><a href={candidate.canonical_url} target="_blank" rel="noreferrer">{candidate.title} ↗</a></h4>
        {candidate.summary && <p>{candidate.summary}</p>}
        {candidate.status === "pending" && <div className="candidateActions"><button disabled={busy} onClick={() => void review(candidate.id, "approve")}>核准並排程</button><button disabled={busy} className="secondary" onClick={() => void review(candidate.id, "reject")}>拒絕</button></div>}
        {candidate.status === "approved" && <small>預定：{formatTime(candidate.scheduled_for)}</small>}
        {candidate.status === "published" && <small>本站發布：{formatTime(candidate.published_at)}</small>}
      </article>) : <p>目前沒有候選新聞；可立即檢查來源，或等待下一個排程。</p>}
    </div>
  </section>;
}
