import type { AppDatabase } from "../db";
import { parseQuotedNumber, itemById } from "./section-quotes";
import type { GlobalQuotes } from "./quotes";
import {
  MAX_SAVED_ALERTS,
  isAlertMarketId,
  shouldFireAlert,
  type AlertDirection,
  type AlertMarketId,
  type SavedPriceAlert,
} from "./price-alerts";
import {
  publicChannelStatus,
  readDeliveryEnv,
  sendAlertEmail,
  sendAlertLine,
  type AlertDeliveryEnv,
  type AlertMessage,
  type DeliveryResult,
} from "./alert-delivery";

export type StoredAlertSubscription = {
  id: number;
  market: AlertMarketId;
  target: number;
  direction: AlertDirection;
  locale: "zh" | "en" | "ja";
  notifyEmail: boolean;
  notifyLine: boolean;
  createdAt: string;
  updatedAt: string;
  lastNotifiedAt: string | null;
};

type SubscriptionRow = {
  id: number;
  market: string;
  target: number;
  direction: string;
  locale: string;
  notify_email: number;
  notify_line: number;
  created_at: string;
  updated_at: string;
  last_notified_at: string | null;
};

export const ALERT_SETTING_EMAIL = "alertEmailTo";
export const ALERT_SETTING_LINE = "lineUserId";

function asLocale(value: string | null | undefined): "zh" | "en" | "ja" {
  return value === "en" || value === "ja" ? value : "zh";
}

export function parseSubscriptionsPayload(input: unknown, now = new Date()): StoredAlertSubscription[] {
  if (!Array.isArray(input)) return [];
  const rows: StoredAlertSubscription[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = Number(record.id);
    const target = Number(record.target);
    const market = typeof record.market === "string" && isAlertMarketId(record.market) ? record.market : null;
    if (!market || !Number.isFinite(id) || !Number.isFinite(target) || target <= 0) continue;
    const direction = record.direction === "below" ? "below" : "above";
    rows.push({
      id,
      market,
      target,
      direction,
      locale: asLocale(typeof record.locale === "string" ? record.locale : undefined),
      notifyEmail: Boolean(record.notifyEmail ?? record.notify_email),
      notifyLine: Boolean(record.notifyLine ?? record.notify_line),
      createdAt: typeof record.createdAt === "string" ? record.createdAt : now.toISOString(),
      updatedAt: now.toISOString(),
      lastNotifiedAt: typeof record.lastNotifiedAt === "string" ? record.lastNotifiedAt : null,
    });
  }
  return rows.slice(-MAX_SAVED_ALERTS);
}

export function toSavedPriceAlert(row: StoredAlertSubscription): SavedPriceAlert {
  return {
    id: row.id,
    market: row.market,
    target: row.target,
    direction: row.direction,
    createdAt: row.createdAt,
    lastNotifiedAt: row.lastNotifiedAt,
  };
}

export async function readAlertDestinations(db: AppDatabase): Promise<{ emailTo: string | null; lineUserId: string | null }> {
  try {
    const result = await db.prepare(
      "SELECT key, value FROM site_settings WHERE key IN (?, ?)",
    ).bind(ALERT_SETTING_EMAIL, ALERT_SETTING_LINE).all<{ key: string; value: string }>();
    const map = Object.fromEntries(result.results.map((row) => [row.key, row.value]));
    return {
      emailTo: map[ALERT_SETTING_EMAIL]?.trim() || null,
      lineUserId: map[ALERT_SETTING_LINE]?.trim() || null,
    };
  } catch {
    return { emailTo: null, lineUserId: null };
  }
}

export async function listAlertSubscriptions(db: AppDatabase): Promise<StoredAlertSubscription[]> {
  const result = await db.prepare(
    `SELECT id, market, target, direction, locale, notify_email, notify_line, created_at, updated_at, last_notified_at
     FROM price_alert_subscriptions ORDER BY id`,
  ).all<SubscriptionRow>();
  return result.results.flatMap((row) => {
    if (!isAlertMarketId(row.market)) return [];
    return [{
      id: row.id,
      market: row.market,
      target: row.target,
      direction: row.direction === "below" ? "below" : "above",
      locale: asLocale(row.locale),
      notifyEmail: row.notify_email === 1,
      notifyLine: row.notify_line === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastNotifiedAt: row.last_notified_at,
    }];
  });
}

export async function replaceAlertSubscriptions(db: AppDatabase, rows: StoredAlertSubscription[]): Promise<StoredAlertSubscription[]> {
  const now = new Date().toISOString();
  const existing = new Map((await listAlertSubscriptions(db)).map((row) => [row.id, row]));
  await db.prepare("DELETE FROM price_alert_subscriptions").run();
  for (const row of rows.slice(-MAX_SAVED_ALERTS)) {
    const previous = existing.get(row.id);
    await db.prepare(
      `INSERT INTO price_alert_subscriptions
        (id, market, target, direction, locale, notify_email, notify_line, created_at, updated_at, last_notified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      row.id,
      row.market,
      row.target,
      row.direction,
      row.locale,
      row.notifyEmail ? 1 : 0,
      row.notifyLine ? 1 : 0,
      row.createdAt || now,
      now,
      previous?.lastNotifiedAt ?? row.lastNotifiedAt,
    ).run();
  }
  return listAlertSubscriptions(db);
}

export async function markAlertNotified(db: AppDatabase, id: number, at: string): Promise<void> {
  await db.prepare(
    "UPDATE price_alert_subscriptions SET last_notified_at = ?, updated_at = ? WHERE id = ?",
  ).bind(at, at, id).run();
}

export type QuoteSnapshot = Partial<Record<AlertMarketId, { value: number; label: string; unit: string }>>;

export function quoteSnapshotFromGlobal(quotes: GlobalQuotes | null | undefined): QuoteSnapshot {
  if (!quotes) return {};
  const gold = quotes.metals.find((metal) => metal.id === "gold");
  const qian = itemById(quotes.items, "taiwan-qian");
  const gram = itemById(quotes.items, "taiwan-gram");
  const snapshot: QuoteSnapshot = {};
  if (gold && Number.isFinite(gold.price) && gold.price > 0) {
    snapshot.spot = { value: gold.price, label: gold.name, unit: "USD／oz" };
  }
  const qianValue = qian ? parseQuotedNumber(qian.price) : null;
  if (qian && qianValue !== null) snapshot.qian = { value: qianValue, label: qian.label, unit: qian.unit };
  const gramValue = gram ? parseQuotedNumber(gram.price) : null;
  if (gram && gramValue !== null) snapshot.gram = { value: gramValue, label: gram.label, unit: gram.unit };
  return snapshot;
}

export async function dispatchDueAlerts(
  db: AppDatabase,
  quotes: QuoteSnapshot,
  options?: { env?: AlertDeliveryEnv; nowMs?: number; fetchImpl?: typeof fetch },
): Promise<{ fired: number; results: DeliveryResult[] }> {
  const env = options?.env ?? readDeliveryEnv();
  const destinations = await readAlertDestinations(db);
  const nowMs = options?.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const channels = publicChannelStatus(env, destinations);
  const results: DeliveryResult[] = [];
  let fired = 0;
  for (const row of await listAlertSubscriptions(db)) {
    const quote = quotes[row.market];
    if (!quote || !Number.isFinite(quote.value) || quote.value <= 0) continue;
    const alert = toSavedPriceAlert(row);
    if (!shouldFireAlert(alert, quote.value, nowMs)) continue;
    const message: AlertMessage = {
      locale: row.locale,
      market: row.market,
      marketLabel: quote.label,
      current: quote.value,
      target: row.target,
      unit: quote.unit,
    };
    let sent = false;
    if (row.notifyEmail && channels.email.configured) {
      const result = await sendAlertEmail(message, env, {
        emailTo: destinations.emailTo,
        nowMs,
        fetchImpl: options?.fetchImpl,
      });
      results.push(result);
      sent = sent || result.ok;
    }
    if (row.notifyLine && channels.line.configured) {
      const result = await sendAlertLine(message, env, {
        lineUserId: destinations.lineUserId,
        nowMs,
        fetchImpl: options?.fetchImpl,
      });
      results.push(result);
      sent = sent || result.ok;
    }
    if (sent) {
      await markAlertNotified(db, row.id, nowIso);
      fired += 1;
    }
  }
  return { fired, results };
}
