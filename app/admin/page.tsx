import { requireChatGPTUser } from "../chatgpt-auth";
import AdminSettings from "./settings";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <AdminSettings userName={user.displayName} authSource={user.source} />;
}
