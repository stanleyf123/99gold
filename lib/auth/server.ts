import { cookies } from "next/headers";
import { getRawDb } from "../../db";
import { getAuthSecret } from "./oauth";
import { findMemberBySession, type MemberUser } from "./members";
import type { PublicMember } from "./types";
import {
  MEMBER_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  readSessionId,
  signSessionId,
} from "./session";

export type { PublicMember } from "./types";

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
  };
}

export function toPublicMember(user: MemberUser): PublicMember {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

export async function readMemberSessionId() {
  const secret = getAuthSecret();
  if (!secret) return null;
  try {
    const raw = (await cookies()).get(MEMBER_SESSION_COOKIE)?.value;
    if (!raw) return null;
    return readSessionId(raw, secret);
  } catch {
    return null;
  }
}

export async function getOptionalMember(): Promise<MemberUser | null> {
  const sessionId = await readMemberSessionId();
  if (!sessionId) return null;
  try {
    return await findMemberBySession(getRawDb(), sessionId);
  } catch {
    return null;
  }
}

export function memberSessionCookie(sessionId: string, secret: string) {
  return {
    name: MEMBER_SESSION_COOKIE,
    value: signSessionId(sessionId, secret),
    options: authCookieOptions(SESSION_MAX_AGE_SECONDS),
  };
}
