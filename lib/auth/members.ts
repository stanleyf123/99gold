import { randomBytes, randomUUID } from "node:crypto";
import type { AppDatabase } from "../../db";
import { emailHasAdminRole } from "./admin-emails";
import { decideAccountLink, type LinkConflict } from "./link";
import type { OAuthProfile, OAuthProvider } from "./oauth";
import { isExpired, SESSION_MAX_AGE_SECONDS, sessionExpiresAt } from "./session";

export type MemberRole = "member" | "admin";
export type MemberStatus = "active" | "disabled";

export type MemberUser = {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  locale: "zh" | "en" | "ja";
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  lastLoginAt: string;
};

export type MemberListRow = MemberUser & {
  providers: OAuthProvider[];
};

type UserRow = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  locale: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string;
};

function asLocale(value: string | null | undefined): MemberUser["locale"] {
  return value === "en" || value === "ja" ? value : "zh";
}

function asRole(value: string | null | undefined): MemberRole {
  return value === "admin" ? "admin" : "member";
}

function asStatus(value: string | null | undefined): MemberStatus {
  return value === "disabled" ? "disabled" : "active";
}

function mapUser(row: UserRow): MemberUser {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    locale: asLocale(row.locale),
    role: asRole(row.role),
    status: asStatus(row.status),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function newId() {
  return randomUUID();
}

function newSessionId() {
  return randomBytes(32).toString("hex");
}

function refFromUser(user: MemberUser | null) {
  return user ? { userId: user.id, disabled: user.status === "disabled" } : null;
}

export async function findUserById(db: AppDatabase, id: string) {
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function findUserByEmail(db: AppDatabase, email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  const row = await db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .bind(normalized)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function findUserByProvider(
  db: AppDatabase,
  provider: OAuthProvider,
  providerAccountId: string,
) {
  const row = await db.prepare(
    `SELECT u.* FROM oauth_accounts a
     JOIN users u ON u.id = a.user_id
     WHERE a.provider = ? AND a.provider_account_id = ?`,
  ).bind(provider, providerAccountId).first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function listLinkedProviders(db: AppDatabase, userId: string) {
  const result = await db.prepare(
    "SELECT provider FROM oauth_accounts WHERE user_id = ? ORDER BY provider",
  ).bind(userId).all<{ provider: string }>();
  return result.results
    .map((row) => row.provider)
    .filter((provider): provider is OAuthProvider => provider === "google" || provider === "line");
}

export async function findMemberBySession(db: AppDatabase, sessionId: string, now = new Date()) {
  const row = await db.prepare(
    `SELECT u.*, s.expires_at AS session_expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  ).bind(sessionId).first<UserRow & { session_expires_at: string }>();
  if (!row) return null;
  if (isExpired(row.session_expires_at, now)) return null;
  const user = mapUser(row);
  if (user.status !== "active") return null;
  return user;
}

async function insertOauthAccount(
  db: AppDatabase,
  userId: string,
  profile: OAuthProfile,
  createdAt: string,
) {
  await db.prepare(
    "INSERT INTO oauth_accounts (provider, provider_account_id, user_id, created_at) VALUES (?, ?, ?, ?)",
  ).bind(profile.provider, profile.providerAccountId, userId, createdAt).run();
}

async function refreshProfile(
  db: AppDatabase,
  user: MemberUser,
  profile: OAuthProfile,
  nowIso: string,
) {
  const email = user.email || profile.email;
  const role = user.role === "admin" || emailHasAdminRole(email) ? "admin" : "member";
  const displayName = profile.displayName || user.displayName;
  const avatarUrl = profile.avatarUrl || user.avatarUrl;
  await db.prepare(
    `UPDATE users SET display_name = ?, email = ?, avatar_url = ?, role = ?, last_login_at = ?
     WHERE id = ?`,
  ).bind(displayName, email, avatarUrl, role, nowIso, user.id).run();
  return (await findUserById(db, user.id))!;
}

async function createMember(db: AppDatabase, profile: OAuthProfile, locale: MemberUser["locale"], nowIso: string) {
  const id = newId();
  const role = emailHasAdminRole(profile.email) ? "admin" : "member";
  await db.prepare(
    `INSERT INTO users (id, display_name, email, avatar_url, locale, role, status, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).bind(
    id,
    profile.displayName,
    profile.email,
    profile.avatarUrl,
    locale,
    role,
    nowIso,
    nowIso,
  ).run();
  await insertOauthAccount(db, id, profile, nowIso);
  return (await findUserById(db, id))!;
}

export async function createMemberSession(
  db: AppDatabase,
  userId: string,
  now = new Date(),
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS,
) {
  const sessionId = newSessionId();
  const createdAt = now.toISOString();
  await db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?")
    .bind(userId, createdAt)
    .run();
  await db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).bind(sessionId, userId, sessionExpiresAt(now, maxAgeSeconds), createdAt).run();
  return sessionId;
}

export async function deleteMemberSession(db: AppDatabase, sessionId: string) {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export async function deleteMemberSessionsForUser(db: AppDatabase, userId: string) {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export type OauthLoginResult =
  | { ok: true; user: MemberUser; sessionId: string }
  | { ok: false; error: LinkConflict | "oauth_failed" };

export async function completeOAuthLogin(
  db: AppDatabase,
  input: {
    profile: OAuthProfile;
    currentUserId: string | null;
    locale: MemberUser["locale"];
    now?: Date;
  },
): Promise<OauthLoginResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const currentUser = input.currentUserId ? await findUserById(db, input.currentUserId) : null;
  const accountByProvider = await findUserByProvider(db, input.profile.provider, input.profile.providerAccountId);
  const userByEmail = await findUserByEmail(db, input.profile.email);
  const decision = decideAccountLink({
    currentUser: refFromUser(currentUser),
    accountByProvider: refFromUser(accountByProvider),
    userByEmail: refFromUser(userByEmail),
  });

  if (decision.action === "conflict") return { ok: false, error: decision.reason };

  let user: MemberUser;
  if (decision.action === "create") {
    user = await createMember(db, input.profile, input.locale, nowIso);
  } else if (decision.action === "link") {
    const existing = await findUserById(db, decision.userId);
    if (!existing) return { ok: false, error: "oauth_failed" };
    await insertOauthAccount(db, existing.id, input.profile, nowIso);
    user = await refreshProfile(db, existing, input.profile, nowIso);
  } else {
    const existing = await findUserById(db, decision.userId);
    if (!existing) return { ok: false, error: "oauth_failed" };
    user = await refreshProfile(db, existing, input.profile, nowIso);
  }

  if (user.status !== "active") return { ok: false, error: "disabled" };
  const sessionId = await createMemberSession(db, user.id, now);
  return { ok: true, user, sessionId };
}

export async function updateMemberLocale(
  db: AppDatabase,
  userId: string,
  locale: MemberUser["locale"],
) {
  await db.prepare("UPDATE users SET locale = ? WHERE id = ?").bind(locale, userId).run();
  return findUserById(db, userId);
}

export async function listMembers(db: AppDatabase, limit = 200): Promise<MemberListRow[]> {
  const result = await db.prepare(
    `SELECT u.*, GROUP_CONCAT(a.provider, ',') AS providers
     FROM users u
     LEFT JOIN oauth_accounts a ON a.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT ?`,
  ).bind(limit).all<UserRow & { providers: string | null }>();
  return result.results.map((row) => ({
    ...mapUser(row),
    providers: (row.providers ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is OAuthProvider => value === "google" || value === "line"),
  }));
}

export async function setMemberStatus(db: AppDatabase, userId: string, status: MemberStatus) {
  await db.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, userId).run();
  if (status === "disabled") await deleteMemberSessionsForUser(db, userId);
  return findUserById(db, userId);
}

export async function setMemberRole(db: AppDatabase, userId: string, role: MemberRole) {
  await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, userId).run();
  return findUserById(db, userId);
}
