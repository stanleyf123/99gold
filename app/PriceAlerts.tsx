"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { type Locale, t } from "./locale";
import {
  MAX_SAVED_ALERTS,
  PRICE_ALERTS_STORAGE_KEY,
  createPriceAlert,
  isAlertMarketId,
  notificationCopy,
  parseStoredAlerts,
  resetNotificationIfUncrossed,
  shouldFireAlert,
  type AlertMarketId,
  type AlertMarketQuote,
  type SavedPriceAlert,
} from "../lib/price-alerts";

const ALERTS_EVENT = "99gold-price-alerts";

function persist(alerts: SavedPriceAlert[]) {
  try {
    window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    window.dispatchEvent(new Event(ALERTS_EVENT));
  } catch {
    /* device storage may be unavailable */
  }
}

function subscribeAlerts(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(ALERTS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ALERTS_EVENT, onChange);
  };
}

function alertsSnapshot() {
  try {
    return window.localStorage.getItem(PRICE_ALERTS_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function alertsServerSnapshot() {
  return "[]";
}

function notifyBrowser(locale: Locale, market: AlertMarketQuote, target: number) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const copy = notificationCopy(locale, market.label, market.value, target, market.unit);
  try {
    new Notification(copy.title, { body: copy.body, tag: `99gold-${market.id}-${target}` });
  } catch {
    /* some browsers block notifications from insecure contexts */
  }
}

type RemoteChannels = {
  email: { configured: boolean };
  line: { configured: boolean };
};

function syncRemote(alerts: SavedPriceAlert[], locale: Locale, channels: RemoteChannels | null) {
  if (!channels?.email.configured && !channels?.line.configured) return;
  const payload = alerts.map((alert) => ({
    id: alert.id,
    market: alert.market,
    target: alert.target,
    direction: alert.direction,
    locale,
    notifyEmail: Boolean(alert.notifyEmail && channels.email.configured),
    notifyLine: Boolean(alert.notifyLine && channels.line.configured),
    createdAt: alert.createdAt,
    lastNotifiedAt: alert.lastNotifiedAt ?? null,
  }));
  void fetch("/api/price-alerts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alerts: payload }),
  }).catch(() => undefined);
}

export default function PriceAlerts({
  locale,
  markets,
  compact = false,
}: {
  locale: Locale;
  markets: AlertMarketQuote[];
  compact?: boolean;
}) {
  const raw = useSyncExternalStore(subscribeAlerts, alertsSnapshot, alertsServerSnapshot);
  const alerts = useMemo(() => parseStoredAlerts(raw), [raw]);
  const [marketId, setMarketId] = useState<AlertMarketId>(markets[0]?.id ?? "qian");
  const [target, setTarget] = useState("18000");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [notifyReady, setNotifyReady] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyLine, setNotifyLine] = useState(false);
  const [channels, setChannels] = useState<RemoteChannels | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setNotifyReady(true);
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let disposed = false;
    fetch("/api/price-alerts", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() as Promise<{ channels?: RemoteChannels }> : Promise.reject()))
      .then((data) => {
        if (!disposed && data.channels) setChannels(data.channels);
      })
      .catch(() => {
        if (!disposed) setChannels({ email: { configured: false }, line: { configured: false } });
      });
    return () => { disposed = true; };
  }, []);

  const selected = markets.find((item) => item.id === marketId) ?? markets[0];

  const save = () => {
    if (!selected) return;
    const created = createPriceAlert(selected.id, Number.parseFloat(target), selected.value);
    if (!created) return;
    const next = [...alerts, {
      ...created,
      notifyEmail: notifyEmail && Boolean(channels?.email.configured),
      notifyLine: notifyLine && Boolean(channels?.line.configured),
    }].slice(-MAX_SAVED_ALERTS);
    persist(next);
    syncRemote(next, locale, channels);
  };

  const remove = (id: number) => {
    const next = alerts.filter((item) => item.id !== id);
    persist(next);
    syncRemote(next, locale, channels);
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const next = await Notification.requestPermission();
    setPermission(next);
  };

  const quoteFor = useCallback((id: AlertMarketId) => markets.find((item) => item.id === id), [markets]);
  const marketKey = markets.map((item) => `${item.id}:${item.value}`).join("|");

  useEffect(() => {
    if (!channels) return;
    if (alerts.some((alert) => alert.notifyEmail || alert.notifyLine)) syncRemote(alerts, locale, channels);
  }, [alerts, channels, locale]);

  useEffect(() => {
    if (alerts.length === 0) return;
    let changed = false;
    let shouldDispatch = false;
    const next = alerts.map((alert) => {
      const market = markets.find((item) => item.id === alert.market);
      if (!market || !Number.isFinite(market.value) || market.value <= 0) return alert;
      const reset = resetNotificationIfUncrossed(alert, market.value);
      if (reset !== alert) changed = true;
      if (!shouldFireAlert(reset, market.value)) return reset;
      notifyBrowser(locale, market, reset.target);
      if (reset.notifyEmail || reset.notifyLine) shouldDispatch = true;
      changed = true;
      return { ...reset, lastNotifiedAt: new Date().toISOString() };
    });
    if (changed) persist(next);
    if (shouldDispatch) {
      void fetch("/api/price-alerts", { method: "POST" }).catch(() => undefined);
    }
  }, [alerts, locale, marketKey, markets]);

  const emailReady = Boolean(channels?.email.configured);
  const lineReady = Boolean(channels?.line.configured);

  const permissionHint = useMemo(() => {
    if (!notifyReady) {
      return t(locale, "可開啟瀏覽器通知。Email／LINE 需在伺服器設定一次金鑰（SMTP／Resend、LINE Messaging）。", "Optional browser notifications. Email/LINE need server tokens configured once (SMTP/Resend, LINE Messaging).", "任意でブラウザ通知。メール／LINEはサーバーでトークンを一度設定します。");
    }
    if (typeof Notification === "undefined") {
      return t(locale, "此瀏覽器不支援系統通知，提醒仍會保存在本機。", "This browser cannot send system notifications; alerts still stay on this device.", "このブラウザは通知非対応ですが、アラートは端末に保存されます。");
    }
    if (permission === "granted") {
      return t(locale, "已允許瀏覽器通知。到價時會提醒一次（6 小時內不重複）。", "Browser notifications are on. Each crossing notifies once (6-hour cooldown).", "ブラウザ通知は許可済み。到達時に1回通知（6時間は再通知しません）。");
    }
    if (permission === "denied") {
      return t(locale, "瀏覽器已封鎖通知。可在網站設定中重新允許，或回到本頁查看。", "Notifications are blocked. Re-enable them in site settings, or check back here.", "通知はブロックされています。サイト設定で許可するか、このページで確認してください。");
    }
    return t(locale, "可選擇開啟瀏覽器通知；Email／LINE 另需伺服器金鑰，設定一次即可。", "Optional browser notifications. Email/LINE also need server tokens, configured once.", "任意でブラウザ通知。メール／LINEはサーバー側のトークンを一度設定すれば利用できます。");
  }, [locale, notifyReady, permission]);

  const remoteHint = !channels
    ? t(locale, "正在確認 Email／LINE 設定…", "Checking Email/LINE configuration…", "メール／LINE設定を確認中…")
    : emailReady || lineReady
      ? t(
        locale,
        `伺服器已設定${emailReady ? " Email" : ""}${lineReady ? " LINE" : ""}。勾選後，到價也會發送到該信箱／LINE（6 小時冷卻，不會洗版）。`,
        `Server has${emailReady ? " Email" : ""}${lineReady ? " LINE" : ""} configured. Tick the box to also send on a cross (6-hour cooldown, no spam).`,
        `サーバーに${emailReady ? "メール" : ""}${lineReady ? " LINE" : ""}が設定済みです。チェックすると到達時にも送信します（6時間クールダウン）。`,
      )
      : t(
        locale,
        "Email／LINE 尚未設定金鑰。管理者把 RESEND_API_KEY 或 SMTP、LINE_CHANNEL_ACCESS_TOKEN 寫進 /etc/99gold.env 一次即可；瀏覽器通知不受影響。",
        "Email/LINE tokens are not configured yet. An admin sets RESEND_API_KEY or SMTP and LINE_CHANNEL_ACCESS_TOKEN once in /etc/99gold.env. Browser alerts still work.",
        "メール／LINEのトークンは未設定です。管理者が /etc/99gold.env に RESEND_API_KEY または SMTP と LINE_CHANNEL_ACCESS_TOKEN を一度書けば有効になります。ブラウザ通知は使えます。",
      );

  return (
    <section className={`alertCenter${compact ? " compactAlerts" : ""}`} id="price-alerts">
      <div className="alertIntro">
        <p className="eyebrow">PERSONAL WATCHLIST</p>
        <h2>{t(locale, "我的到價提醒", "My price alerts", "価格アラート")}</h2>
        <p>{t(locale, "設定台灣理論金價或 COMEX 參考目標，保存在這台裝置。可開啟瀏覽器通知，並在伺服器設定後加 Email／LINE。這是理論參考，不是店家牌價。", "Save Taiwan theoretical qian or COMEX targets on this device. Browser notifications are optional; Email/LINE work after server tokens are set once. Theoretical reference, not a shop quote.", "台湾の理論銭またはCOMEX参考の目標をこの端末に保存。ブラウザ通知は任意。サーバー設定後はメール／LINEも利用できます。理論参考値であり店頭価格ではありません。")}</p>
      </div>
      <div className="alertComposer">
        <label>
          <span>{t(locale, "關注項目", "Watch item", "監視項目")}</span>
          <select value={selected?.id ?? "qian"} onChange={(event) => isAlertMarketId(event.target.value) && setMarketId(event.target.value)}>
            {markets.map((market) => <option value={market.id} key={market.id}>{market.label}</option>)}
          </select>
        </label>
        <label>
          <span>{t(locale, "目標價格", "Target price", "目標価格")}</span>
          <div>
            <input type="number" inputMode="decimal" min="0" value={target} onChange={(event) => setTarget(event.target.value)} />
            <small>{selected?.unit}</small>
          </div>
        </label>
        <button type="button" onClick={save}>{t(locale, "加入提醒", "Add alert", "追加")}</button>
      </div>
      <div className="alertChannelRow">
        <label>
          <input type="checkbox" checked={notifyEmail} disabled={!emailReady} onChange={(event) => setNotifyEmail(event.target.checked)} />
          {t(locale, "Email", "Email", "メール")}
        </label>
        <label>
          <input type="checkbox" checked={notifyLine} disabled={!lineReady} onChange={(event) => setNotifyLine(event.target.checked)} />
          LINE
        </label>
        <p>{remoteHint}</p>
      </div>
      <div className="alertNotifyRow">
        {notifyReady && permission === "default" && typeof Notification !== "undefined" ? (
          <button type="button" className="notifyEnable" onClick={() => void requestPermission()}>
            {t(locale, "開啟瀏覽器通知", "Enable browser notifications", "ブラウザ通知を許可")}
          </button>
        ) : null}
        <p>{permissionHint}</p>
      </div>
      <div className="savedAlerts">
        {alerts.length === 0 ? (
          <div className="alertEmpty">
            <span>{t(locale, "尚未設定", "None yet", "未設定")}</span>
            <p>{t(locale, "輸入目標價後即可建立本機提醒。", "Enter a target price to create a local alert.", "目標価格を入力すると端末アラートを作成できます。")}</p>
          </div>
        ) : alerts.map((item) => {
          const market = quoteFor(item.market) ?? markets[0];
          const gap = market && Number.isFinite(market.value) ? item.target - market.value : Number.NaN;
          const reached = market ? item.direction === "above" ? market.value >= item.target : market.value <= item.target : false;
          const extras = [item.notifyEmail ? "Email" : null, item.notifyLine ? "LINE" : null].filter(Boolean).join(" · ");
          return (
            <article key={item.id}>
              <div>
                <span>{market?.label ?? item.market}</span>
                <small>{t(locale, "目前", "Now", "現在")} {market && Number.isFinite(market.value) ? market.value.toLocaleString("en-US") : "—"} {market?.unit}{extras ? ` · ${extras}` : ""}</small>
              </div>
              <strong>{item.target.toLocaleString("en-US")}</strong>
              <em className={reached ? "watchReached" : "watchUp"}>
                {!Number.isFinite(gap)
                  ? t(locale, "尚無有效行情，無法判定", "No valid quote to compare", "有効な相場がないため判定できません")
                  : reached
                    ? t(locale, "已達目標", "Target reached", "目標到達")
                    : `${t(locale, item.direction === "above" ? "距上破" : "距下破", item.direction === "above" ? "To rise through" : "To fall through", item.direction === "above" ? "上抜けまで" : "下抜けまで")} ${Math.abs(gap).toLocaleString("en-US")}`}
              </em>
              <button type="button" aria-label={t(locale, `移除${market?.label ?? ""}到價提醒`, `Remove ${market?.label ?? ""} alert`, `${market?.label ?? ""}のアラートを削除`)} onClick={() => remove(item.id)}>×</button>
            </article>
          );
        })}
      </div>
      <p className="alertDisclaimer">
        {t(locale, "瀏覽器提醒存在這台裝置。Email／LINE 需伺服器金鑰設定一次，且有 6 小時冷卻以免洗版。數字為理論參考，非店家成交價。", "Browser alerts live on this device. Email/LINE need server tokens once, with a 6-hour cooldown so we never spam. Figures are theoretical, not executable shop prices.", "ブラウザ通知はこの端末内。メール／LINEはサーバーのトークンを一度設定し、6時間のクールダウンで連投しません。数値は理論参考であり店頭約定価格ではありません。")}
      </p>
    </section>
  );
}
