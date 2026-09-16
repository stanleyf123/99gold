import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { emailHasAdminRole, primaryAdminEmail } from "../lib/auth/admin-emails";
import { getOptionalMember } from "../lib/auth/server";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  source: "chatgpt" | "token" | "member";
  memberId?: string;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
export const ADMIN_TOKEN_COOKIE = "admin_token";

export function getAdminEmail() {
  return primaryAdminEmail();
}

export function getAdminToken() {
  return process.env.ADMIN_TOKEN?.trim() || "";
}

export function isAdminEmail(email: string) {
  return emailHasAdminRole(email);
}

function tokensMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function tokenUser(): ChatGPTUser {
  const email = getAdminEmail();
  const fullName = process.env.ADMIN_NAME?.trim() || null;
  return {
    displayName: fullName ?? email,
    email,
    fullName,
    source: "token",
  };
}

function requestToken(requestHeaders: Headers, cookieValue: string | undefined) {
  const bearer = requestHeaders.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim();
  return requestHeaders.get("x-admin-token")?.trim() || cookieValue?.trim() || "";
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (email) {
    const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
    const fullName =
      encodedFullName &&
      requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
        ? safeDecodeURIComponent(encodedFullName)
        : null;

    return {
      displayName: fullName ?? email,
      email,
      fullName,
      source: "chatgpt",
    };
  }

  const expected = getAdminToken();
  if (!expected) return null;
  const cookieStore = await cookies();
  const provided = requestToken(requestHeaders, cookieStore.get(ADMIN_TOKEN_COOKIE)?.value);
  if (!provided || !tokensMatch(provided, expected)) return null;
  return tokenUser();
}

export async function getAdminUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (user) {
    if (user.source === "token") return user;
    return isAdminEmail(user.email) ? user : null;
  }

  const member = await getOptionalMember();
  if (!member) return null;
  if (member.role !== "admin" && !emailHasAdminRole(member.email)) return null;
  return {
    displayName: member.displayName,
    email: member.email ?? "",
    fullName: member.displayName,
    source: "member",
    memberId: member.id,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getAdminUser();
  if (user) return user;

  const safeReturnTo = safeRelativeReturnPath(returnTo);
  // Relative Location so the browser resolves against the public page URL.
  // Absolute redirects must use SITE_URL via lib/public-origin (request.url is
  // the upstream origin behind nginx, e.g. http://127.0.0.1:3000).
  redirect(`/admin/login?return_to=${encodeURIComponent(safeReturnTo)}`);
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  const bare = pathname.replace(/^\/(en|ja)(?=\/|$)/, "") || "/";
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH ||
    pathname === "/admin/login" ||
    bare === "/login" ||
    bare.startsWith("/api/auth")
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
