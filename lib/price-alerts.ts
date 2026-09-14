export const PRICE_ALERTS_STORAGE_KEY = "golden-tide-alerts";
export const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
export const MAX_SAVED_ALERTS = 8;

export type AlertMarketId = "spot" | "qian" | "gram";
export type AlertDirection = "above" | "below";

export type SavedPriceAlert = {
  id: number;
  market: AlertMarketId;
  target: number;
  direction: AlertDirection;
  createdAt: string;
  lastNotifiedAt?: string | null;
  notifyEmail?: boolean;
  notifyLine?: boolean;
};

export type AlertMarketQuote = {
  id: AlertMarketId;
  label: string;
  value: number;
  unit: string;
};

export function isAlertMarketId(value: string): value is AlertMarketId {
  return value === "spot" || value === "qian" || value === "gram";
}

export function alertDirectionFromQuote(current: number, target: number): AlertDirection {
  return target >= current ? "above" : "below";
}

export function alertHasCrossed(current: number, target: number, direction: AlertDirection): boolean {
  if (!Number.isFinite(current) || current <= 0 || !Number.isFinite(target) || target <= 0) return false;
  return direction === "above" ? current >= target : current <= target;
}

export function shouldFireAlert(
  alert: SavedPriceAlert,
  current: number,
  nowMs = Date.now(),
): boolean {
  if (!alertHasCrossed(current, alert.target, alert.direction)) return false;
  if (!alert.lastNotifiedAt) return true;
  const last = Date.parse(alert.lastNotifiedAt);
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= NOTIFY_COOLDOWN_MS;
}

export function resetNotificationIfUncrossed(
  alert: SavedPriceAlert,
  current: number,
): SavedPriceAlert {
  if (alertHasCrossed(current, alert.target, alert.direction)) return alert;
  if (!alert.lastNotifiedAt) return alert;
  return { ...alert, lastNotifiedAt: null };
}

export function parseStoredAlerts(raw: string | null | undefined): SavedPriceAlert[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const alerts: SavedPriceAlert[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const target = Number(record.target);
      const market = typeof record.market === "string" && isAlertMarketId(record.market) ? record.market : null;
      const id = Number(record.id);
      if (!market || !Number.isFinite(target) || target <= 0 || !Number.isFinite(id)) continue;
      const direction = record.direction === "below" || record.direction === "above"
        ? record.direction
        : "above";
      alerts.push({
        id,
        market,
        target,
        direction,
        createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date(id).toISOString(),
        lastNotifiedAt: typeof record.lastNotifiedAt === "string" ? record.lastNotifiedAt : null,
        notifyEmail: record.notifyEmail === true,
        notifyLine: record.notifyLine === true,
      });
    }
    return alerts.slice(-MAX_SAVED_ALERTS);
  } catch {
    return [];
  }
}

export function createPriceAlert(
  market: AlertMarketId,
  target: number,
  current: number,
  now = new Date(),
): SavedPriceAlert | null {
  if (!Number.isFinite(target) || target <= 0) return null;
  return {
    id: now.getTime(),
    market,
    target,
    direction: Number.isFinite(current) && current > 0 ? alertDirectionFromQuote(current, target) : "above",
    createdAt: now.toISOString(),
    lastNotifiedAt: null,
    notifyEmail: false,
    notifyLine: false,
  };
}

export function notificationCopy(
  locale: "zh" | "en" | "ja",
  marketLabel: string,
  current: number,
  target: number,
  unit: string,
): { title: string; body: string } {
  const currentText = current.toLocaleString("en-US");
  const targetText = target.toLocaleString("en-US");
  if (locale === "en") {
    return {
      title: "99GOLD.NET price alert",
      body: `${marketLabel} is ${currentText} ${unit} (target ${targetText}). Theoretical reference, not a shop quote.`,
    };
  }
  if (locale === "ja") {
    return {
      title: "99GOLD.NET 価格アラート",
      body: `${marketLabel}は ${currentText} ${unit}（目標 ${targetText}）。理論参考値であり、店頭価格ではありません。`,
    };
  }
  return {
    title: "99GOLD.NET 到價提醒",
    body: `${marketLabel} 目前 ${currentText} ${unit}（目標 ${targetText}）。理論參考，非店家牌價。`,
  };
}
