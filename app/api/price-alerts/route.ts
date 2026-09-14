import { NextResponse } from "next/server";
import { getRawDb } from "../../../db";
import { getGlobalQuotesOrNull } from "../../../lib/quotes";
import {
  dispatchDueAlerts,
  listAlertSubscriptions,
  parseSubscriptionsPayload,
  quoteSnapshotFromGlobal,
  readAlertDestinations,
  replaceAlertSubscriptions,
} from "../../../lib/alert-subscriptions";
import { publicChannelStatus, readDeliveryEnv } from "../../../lib/alert-delivery";
import { MAX_SAVED_ALERTS } from "../../../lib/price-alerts";

const PUT_WINDOW_MS = 10 * 60 * 1000;
const PUT_MAX = 20;
const putHits = new Map<string, number[]>();

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
}

function allowPut(key: string, now = Date.now()): boolean {
  const recent = (putHits.get(key) ?? []).filter((at) => now - at < PUT_WINDOW_MS);
  if (recent.length >= PUT_MAX) {
    putHits.set(key, recent);
    return false;
  }
  recent.push(now);
  putHits.set(key, recent);
  return true;
}

export async function GET() {
  const env = readDeliveryEnv();
  try {
    const db = getRawDb();
    const destinations = await readAlertDestinations(db);
    const channels = publicChannelStatus(env, destinations);
    const subscriptions = await listAlertSubscriptions(db);
    return NextResponse.json({
      channels,
      cooldownHours: 6,
      maxAlerts: MAX_SAVED_ALERTS,
      savedCount: subscriptions.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      channels: publicChannelStatus(env),
      cooldownHours: 6,
      maxAlerts: MAX_SAVED_ALERTS,
      savedCount: 0,
    }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: Request) {
  if (!allowPut(clientKey(request))) {
    return NextResponse.json({ error: "請稍後再同步提醒" }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }
  const payload = body && typeof body === "object" ? body as { alerts?: unknown } : {};
  const rows = parseSubscriptionsPayload(payload.alerts ?? body);
  try {
    const saved = await replaceAlertSubscriptions(getRawDb(), rows);
    return NextResponse.json({ ok: true, savedCount: saved.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "無法儲存到價提醒" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST() {
  try {
    const quotes = await getGlobalQuotesOrNull();
    const snapshot = quoteSnapshotFromGlobal(quotes);
    const result = await dispatchDueAlerts(getRawDb(), snapshot);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "無法發送提醒" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
