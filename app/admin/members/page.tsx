import { requireChatGPTUser } from "../../chatgpt-auth";
import MembersPanel from "../members-panel";
import "../admin.css";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const user = await requireChatGPTUser("/admin/members");
  return <MembersPanel userName={user.displayName} authSource={user.source} actorMemberId={user.memberId} />;
}
