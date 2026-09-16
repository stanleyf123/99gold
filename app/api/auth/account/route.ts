import { NextResponse } from "next/server";
import { getRawDb } from "../../../../db";
import { getOptionalMember } from "../../../../lib/auth/server";
import { updateMemberLocale } from "../../../../lib/auth/members";
import { isPathLocale, LOCALE_COOKIE } from "../../../../lib/locale-path";

export async function POST(request: Request) {
  const member = await getOptionalMember();
  if (!member) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json() as { locale?: string };
  if (!isPathLocale(body.locale)) {
    return NextResponse.json({ error: "語系無效" }, { status: 400 });
  }
  const updated = await updateMemberLocale(getRawDb(), member.id, body.locale);
  const response = NextResponse.json({ member: updated });
  response.cookies.set(LOCALE_COOKIE, body.locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
