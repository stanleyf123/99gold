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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setNotifyReady(true);
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const selected = markets.find((item) => item.id === marketId) ?? markets[0];

  const save = () => {
    if (!selected) return;
    const created = createPriceAlert(selected.id, Number.parseFloat(target), selected.value);
    if (!created) return;
    persist([...alerts, created].slice(-MAX_SAVED_ALERTS));
  };

  const remove = (id: number) => {
    persist(alerts.filter((item) => item.id !== id));
  };

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const next = await Notification.requestPermission();
    setPermission(next);
  };

  const quoteFor = useCallback((id: AlertMarketId) => markets.find((item) => item.id === id), [markets]);
  const marketKey = markets.map((item) => `${item.id}:${item.value}`).join("|");

  useEffect(() => {
    if (alerts.length === 0) return;
    let changed = false;
    const next = alerts.map((alert) => {
      const market = markets.find((item) => item.id === alert.market);
      if (!market || !Number.isFinite(market.value) || market.value <= 0) return alert;
      const reset = resetNotificationIfUncrossed(alert, market.value);
      if (reset !== alert) changed = true;
      if (!shouldFireAlert(reset, market.value)) return reset;
      notifyBrowser(locale, market, reset.target);
      changed = true;
      return { ...reset, lastNotifiedAt: new Date().toISOString() };
    });
    if (changed) persist(next);
  }, [alerts, locale, marketKey, markets]);

  const permissionHint = useMemo(() => {
    if (!notifyReady) {
      return t(locale, "可選擇開啟瀏覽器通知；LINE／Email 推播需後端，目前未提供。", "Optional browser notifications. LINE/email push needs a backend and is not available yet.", "任意でブラウザ通知。LINE／メール配信にはバックエンドが必要で、現在はありません。");
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
    return t(locale, "可選擇開啟瀏覽器通知；LINE／Email 推播需後端，目前未提供。", "Optional browser notifications. LINE/email push needs a backend and is not available yet.", "任意でブラウザ通知。LINE／メール配信にはバックエンドが必要で、現在はありません。");
  }, [locale, notifyReady, permission]);

  return (
    <section className={`alertCenter${compact ? " compactAlerts" : ""}`} id="price-alerts">
      <div className="alertIntro">
        <p className="eyebrow">PERSONAL WATCHLIST</p>
        <h2>{t(locale, "我的到價提醒", "My price alerts", "価格アラート")}</h2>
        <p>{t(locale, "設定台灣理論金價或 COMEX 參考目標，保存在這台裝置。可開啟瀏覽器通知；這是理論參考，不是店家牌價。", "Save Taiwan theoretical qian or COMEX targets on this device. Browser notifications are optional. Theoretical reference, not a shop quote.", "台湾の理論銭またはCOMEX参考の目標をこの端末に保存。ブラウザ通知は任意。理論参考値であり店頭価格ではありません。")}</p>
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
          return (
            <article key={item.id}>
              <div>
                <span>{market?.label ?? item.market}</span>
                <small>{t(locale, "目前", "Now", "現在")} {market && Number.isFinite(market.value) ? market.value.toLocaleString("en-US") : "—"} {market?.unit}</small>
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
        {t(locale, "提醒存在這台裝置的瀏覽器。LINE／Email 需要後端與金鑰，本版未接。數字為理論參考，非店家成交價。", "Alerts live in this browser. LINE/email would need a backend and secrets, and are not wired. Figures are theoretical, not executable shop prices.", "アラートはこのブラウザ内。LINE／メールにはバックエンドと秘密情報が必要で未接続。数値は理論参考であり店頭約定価格ではありません。")}
      </p>
    </section>
  );
}
