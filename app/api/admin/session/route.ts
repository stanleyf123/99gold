import { NextResponse } from "next/server";
import {
  ADMIN_TOKEN_COOKIE,
  getAdminToken,
  safeRelativeReturnPath,
} from "../../../chatgpt-auth";
import { timingSafeEqual } from "node:crypto";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: (process.env.SITE_URL ?? "").startsWith("https://"),
};

function tokensMatch(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readToken(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json() as { token?: string; return_to?: string };
    return { token: String(body.token ?? "").trim(), returnTo: String(body.return_to ?? "/admin") };
  }
  const form = await request.formData();
  return {
    token: String(form.get("token") ?? "").trim(),
    returnTo: String(form.get("return_to") ?? "/admin"),
  };
}

export async function POST(request: Request) {
  const expected = getAdminToken();
  if (!expected) {
    return NextResponse.json({ error: "伺服器尚未設定 ADMIN_TOKEN" }, { status: 503 });
  }
  const { token, returnTo } = await readToken(request);
  const destination = new URL(safeRelativeReturnPath(returnTo), request.url);
  if (!token || !tokensMatch(token, expected)) {
    const failure = new URL("/admin/login", request.url);
    failure.searchParams.set("return_to", safeRelativeReturnPath(returnTo));
    failure.searchParams.set("error", "1");
    return NextResponse.redirect(failure, { status: 303 });
  }
  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(ADMIN_TOKEN_COOKIE, expected, cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_TOKEN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
