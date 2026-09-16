import { NextResponse } from "next/server";
import { getOptionalMember, toPublicMember } from "../../../../lib/auth/server";
import { listLinkedProviders } from "../../../../lib/auth/members";
import { getRawDb } from "../../../../db";

export async function GET() {
  const member = await getOptionalMember();
  if (!member) {
    return NextResponse.json({ member: null }, { headers: { "Cache-Control": "no-store" } });
  }
  const providers = await listLinkedProviders(getRawDb(), member.id).catch(() => []);
  return NextResponse.json({
    member: { ...toPublicMember(member), email: member.email, locale: member.locale, providers },
  }, { headers: { "Cache-Control": "no-store" } });
}
