import { NextResponse } from "next/server";
import { getRawDb } from "../../../../db";
import { getAdminUser } from "../../../chatgpt-auth";
import { emailHasAdminRole } from "../../../../lib/auth/admin-emails";
import { listMembers, setMemberRole, setMemberStatus } from "../../../../lib/auth/members";

async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) return { error: NextResponse.json({ error: "請先登入管理後台" }, { status: 401 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const members = await listMembers(getRawDb());
    return NextResponse.json({ members }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ members: [], error: "會員資料尚未就緒" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await request.json() as {
    id?: string;
    action?: "disable" | "enable" | "promote" | "demote";
  };
  const id = body.id?.trim();
  if (!id || !body.action) return NextResponse.json({ error: "缺少會員或操作" }, { status: 400 });
  if (auth.user.memberId && auth.user.memberId === id) {
    return NextResponse.json({ error: "不能變更自己的角色或停用自己" }, { status: 400 });
  }

  try {
    const db = getRawDb();
    if (body.action === "disable" || body.action === "enable") {
      const member = await setMemberStatus(db, id, body.action === "disable" ? "disabled" : "active");
      if (!member) return NextResponse.json({ error: "找不到會員" }, { status: 404 });
      return NextResponse.json({ member });
    }
    if (body.action === "demote") {
      const current = (await listMembers(db)).find((row) => row.id === id);
      if (current && emailHasAdminRole(current.email)) {
        return NextResponse.json({
          error: "此信箱列於 ADMIN_EMAILS，下次登入仍會是管理者。請先從環境變數移除。",
        }, { status: 400 });
      }
    }
    const member = await setMemberRole(db, id, body.action === "promote" ? "admin" : "member");
    if (!member) return NextResponse.json({ error: "找不到會員" }, { status: 404 });
    return NextResponse.json({ member });
  } catch {
    return NextResponse.json({ error: "無法更新會員" }, { status: 503 });
  }
}
