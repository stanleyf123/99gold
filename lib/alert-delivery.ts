import { connect as tlsConnect } from "node:tls";
import { notificationCopy, type AlertMarketId } from "./price-alerts";

export type AlertDeliveryEnv = {
  ALERT_EMAIL_TO?: string;
  ALERT_EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  LINE_USER_ID?: string;
  LINE_NOTIFY_TOKEN?: string;
  LINE_WEBHOOK_URL?: string;
};

export type AlertMessage = {
  locale: "zh" | "en" | "ja";
  market: AlertMarketId;
  marketLabel: string;
  current: number;
  target: number;
  unit: string;
};

export type DeliveryChannel = "email" | "line";
export type DeliveryResult = {
  channel: DeliveryChannel;
  ok: boolean;
  skipped?: string;
  error?: string;
};

const DEFAULT_FROM = "99GOLD.NET <alerts@99gold.net>";
export const GLOBAL_SEND_GAP_MS = 30_000;

let lastGlobalSendAt = 0;

export function resetDeliveryThrottleForTests() {
  lastGlobalSendAt = 0;
}

export function readDeliveryEnv(source: NodeJS.ProcessEnv | AlertDeliveryEnv = process.env): AlertDeliveryEnv {
  const pick = (key: keyof AlertDeliveryEnv) => {
    const value = source[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  return {
    ALERT_EMAIL_TO: pick("ALERT_EMAIL_TO"),
    ALERT_EMAIL_FROM: pick("ALERT_EMAIL_FROM"),
    RESEND_API_KEY: pick("RESEND_API_KEY"),
    SMTP_HOST: pick("SMTP_HOST"),
    SMTP_PORT: pick("SMTP_PORT"),
    SMTP_USER: pick("SMTP_USER"),
    SMTP_PASS: pick("SMTP_PASS"),
    SMTP_SECURE: pick("SMTP_SECURE"),
    LINE_CHANNEL_ACCESS_TOKEN: pick("LINE_CHANNEL_ACCESS_TOKEN"),
    LINE_USER_ID: pick("LINE_USER_ID"),
    LINE_NOTIFY_TOKEN: pick("LINE_NOTIFY_TOKEN"),
    LINE_WEBHOOK_URL: pick("LINE_WEBHOOK_URL"),
  };
}

export function emailTransportConfigured(env: AlertDeliveryEnv): boolean {
  return Boolean(env.RESEND_API_KEY || env.SMTP_HOST);
}

export function lineTransportConfigured(env: AlertDeliveryEnv): boolean {
  return Boolean(
    (env.LINE_CHANNEL_ACCESS_TOKEN && env.LINE_USER_ID)
    || env.LINE_NOTIFY_TOKEN
    || env.LINE_WEBHOOK_URL,
  );
}

export function emailDestination(env: AlertDeliveryEnv, override?: string | null): string | null {
  const candidate = (override ?? env.ALERT_EMAIL_TO ?? "").trim();
  return isEmailAddress(candidate) ? candidate : null;
}

export function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function publicChannelStatus(
  env: AlertDeliveryEnv = readDeliveryEnv(),
  destinations?: { emailTo?: string | null; lineUserId?: string | null },
) {
  const emailTo = emailDestination(env, destinations?.emailTo);
  const lineUserId = (destinations?.lineUserId ?? env.LINE_USER_ID ?? "").trim();
  const lineEnv = { ...env, LINE_USER_ID: lineUserId || env.LINE_USER_ID };
  return {
    email: {
      configured: Boolean(emailTo && emailTransportConfigured(env)),
      transport: env.RESEND_API_KEY ? "resend" : env.SMTP_HOST ? "smtp" : null,
    },
    line: {
      configured: lineTransportConfigured(lineEnv),
      transport: env.LINE_CHANNEL_ACCESS_TOKEN
        ? "messaging"
        : env.LINE_NOTIFY_TOKEN
          ? "notify"
          : env.LINE_WEBHOOK_URL
            ? "webhook"
            : null,
    },
    browser: true,
  };
}

export function formatAlertText(message: AlertMessage): { title: string; body: string } {
  return notificationCopy(message.locale, message.marketLabel, message.current, message.target, message.unit);
}

function canSendNow(nowMs: number): boolean {
  if (lastGlobalSendAt <= 0) return true;
  return nowMs - lastGlobalSendAt >= GLOBAL_SEND_GAP_MS;
}

function markSent(nowMs: number) {
  lastGlobalSendAt = nowMs;
}

export async function sendAlertEmail(
  message: AlertMessage,
  env: AlertDeliveryEnv,
  options?: { emailTo?: string | null; nowMs?: number; fetchImpl?: typeof fetch },
): Promise<DeliveryResult> {
  const to = emailDestination(env, options?.emailTo);
  if (!to) return { channel: "email", ok: false, skipped: "no-destination" };
  if (!emailTransportConfigured(env)) return { channel: "email", ok: false, skipped: "not-configured" };
  const nowMs = options?.nowMs ?? Date.now();
  if (!canSendNow(nowMs)) return { channel: "email", ok: false, skipped: "global-throttle" };
  const copy = formatAlertText(message);
  const from = env.ALERT_EMAIL_FROM || DEFAULT_FROM;
  try {
    if (env.RESEND_API_KEY) {
      const fetchImpl = options?.fetchImpl ?? fetch;
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: copy.title,
          text: `${copy.body}\n\nhttps://99gold.net/#price-alerts`,
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) {
        return { channel: "email", ok: false, error: `resend-${response.status}` };
      }
      markSent(nowMs);
      return { channel: "email", ok: true };
    }
    await sendSmtp({
      host: env.SMTP_HOST!,
      port: Number(env.SMTP_PORT) || 465,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from,
      to,
      subject: copy.title,
      text: `${copy.body}\n\nhttps://99gold.net/#price-alerts`,
    });
    markSent(nowMs);
    return { channel: "email", ok: true };
  } catch (error) {
    return { channel: "email", ok: false, error: error instanceof Error ? error.message : "email-failed" };
  }
}

export async function sendAlertLine(
  message: AlertMessage,
  env: AlertDeliveryEnv,
  options?: { lineUserId?: string | null; nowMs?: number; fetchImpl?: typeof fetch },
): Promise<DeliveryResult> {
  const lineUserId = (options?.lineUserId ?? env.LINE_USER_ID ?? "").trim();
  const resolved = { ...env, LINE_USER_ID: lineUserId || env.LINE_USER_ID };
  if (!lineTransportConfigured(resolved)) return { channel: "line", ok: false, skipped: "not-configured" };
  const nowMs = options?.nowMs ?? Date.now();
  if (!canSendNow(nowMs)) return { channel: "line", ok: false, skipped: "global-throttle" };
  const copy = formatAlertText(message);
  const text = `${copy.title}\n${copy.body}\nhttps://99gold.net/#price-alerts`;
  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    if (resolved.LINE_CHANNEL_ACCESS_TOKEN && resolved.LINE_USER_ID) {
      const response = await fetchImpl("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolved.LINE_CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: resolved.LINE_USER_ID,
          messages: [{ type: "text", text }],
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return { channel: "line", ok: false, error: `line-messaging-${response.status}` };
      markSent(nowMs);
      return { channel: "line", ok: true };
    }
    if (resolved.LINE_NOTIFY_TOKEN) {
      const body = new URLSearchParams({ message: `\n${text}` });
      const response = await fetchImpl("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolved.LINE_NOTIFY_TOKEN}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return { channel: "line", ok: false, error: `line-notify-${response.status}` };
      markSent(nowMs);
      return { channel: "line", ok: true };
    }
    if (resolved.LINE_WEBHOOK_URL) {
      const response = await fetchImpl(resolved.LINE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title: copy.title, body: copy.body, source: "99gold.net" }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return { channel: "line", ok: false, error: `line-webhook-${response.status}` };
      markSent(nowMs);
      return { channel: "line", ok: true };
    }
    return { channel: "line", ok: false, skipped: "not-configured" };
  } catch (error) {
    return { channel: "line", ok: false, error: error instanceof Error ? error.message : "line-failed" };
  }
}

type SmtpOptions = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  subject: string;
  text: string;
};

function smtpFromAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}

async function sendSmtp(options: SmtpOptions): Promise<void> {
  const port = options.port || 465;
  if (port !== 465 && port !== 587 && port !== 25) {
    throw new Error("unsupported-smtp-port");
  }
  if (port !== 465) {
    throw new Error("smtp-use-port-465-or-resend");
  }
  const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`;
  const payload = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    options.text.replace(/^\./gm, ".."),
    ".",
  ].join("\r\n");

  await new Promise<void>((resolve, reject) => {
    const socket = tlsConnect({
      host: options.host,
      port,
      timeout: 15_000,
      servername: options.host,
    });
    let buffer = "";
    let step: "greet" | "ehlo" | "auth" | "mail" | "rcpt" | "data" | "body" | "quit" = "greet";
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    const send = (line: string) => {
      socket.write(`${line}\r\n`);
    };
    socket.setEncoding("utf8");
    socket.on("error", (error) => fail(error));
    socket.on("timeout", () => fail(new Error("smtp-timeout")));
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const code = Number(line.slice(0, 3));
        const more = line[3] === "-";
        if (!Number.isFinite(code) || more) continue;
        if (code >= 400) {
          fail(new Error(`smtp-${code}`));
          return;
        }
        if (step === "greet") {
          step = "ehlo";
          send(`EHLO 99gold.net`);
        } else if (step === "ehlo") {
          if (options.user && options.pass) {
            step = "auth";
            const token = Buffer.from(`\0${options.user}\0${options.pass}`).toString("base64");
            send(`AUTH PLAIN ${token}`);
          } else {
            step = "mail";
            send(`MAIL FROM:<${smtpFromAddress(options.from)}>`);
          }
        } else if (step === "auth") {
          step = "mail";
          send(`MAIL FROM:<${smtpFromAddress(options.from)}>`);
        } else if (step === "mail") {
          step = "rcpt";
          send(`RCPT TO:<${options.to}>`);
        } else if (step === "rcpt") {
          step = "data";
          send("DATA");
        } else if (step === "data") {
          step = "body";
          socket.write(`${payload}\r\n`);
        } else if (step === "body") {
          step = "quit";
          send("QUIT");
          socket.end();
          resolve();
        }
      }
    });
  });
}
