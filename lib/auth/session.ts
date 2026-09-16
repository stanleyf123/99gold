import { createHmac, timingSafeEqual } from "node:crypto";

export const MEMBER_SESSION_COOKIE = "member_session";
export const OAUTH_FLOW_COOKIE = "oauth_flow";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const OAUTH_FLOW_MAX_AGE_SECONDS = 60 * 10;

function tokensMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function hmac(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Sign an opaque value for httpOnly cookies. Does not encrypt; integrity only. */
export function signToken(value: string, secret: string): string {
  if (!secret) throw new Error("AUTH_SECRET missing");
  const body = Buffer.from(value, "utf8").toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

export function verifyToken(token: string, secret: string): string | null {
  if (!secret || !token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const body = token.slice(0, separator);
  const mac = token.slice(separator + 1);
  if (!body || !mac) return null;
  if (!tokensMatch(mac, hmac(body, secret))) return null;
  try {
    return Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function signSessionId(sessionId: string, secret: string) {
  return signToken(sessionId, secret);
}

export function readSessionId(token: string, secret: string) {
  const value = verifyToken(token, secret);
  if (!value || value.includes("\n") || value.length < 16) return null;
  return value;
}

export function sessionExpiresAt(now = new Date(), maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  return new Date(now.getTime() + maxAgeSeconds * 1000).toISOString();
}

export function isExpired(expiresAt: string, now = new Date()) {
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return true;
  return expires.getTime() <= now.getTime();
}
