import { NextResponse } from "next/server";
import { getRawDb } from "../../../../db";
import { publicAbsoluteUrl } from "../../../../lib/public-origin";
import { safeRelativeReturnPath } from "../../../chatgpt-auth";
import { deleteMemberSession } from "../../../../lib/auth/members";
import { MEMBER_SESSION_COOKIE } from "../../../../lib/auth/session";
import { authCookieOptions, readMemberSessionId } from "../../../../lib/auth/server";

export async function POST(request: Request) {
  const sessionId = await readMemberSessionId();
  if (sessionId) {
    try {
      await deleteMemberSession(getRawDb(), sessionId);
    } catch {
      /* still clear the cookie */
    }
  }
  const returnTo = safeRelativeReturnPath(new URL(request.url).searchParams.get("return_to") || "/");
  const response = request.headers.get("accept")?.includes("text/html")
    ? NextResponse.redirect(publicAbsoluteUrl(returnTo, request.url), { status: 303 })
    : NextResponse.json({ ok: true });
  response.cookies.set(MEMBER_SESSION_COOKIE, "", { ...authCookieOptions(0), maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  return POST(request);
}
