import { requireChatGPTUser, isAdminEmail } from "../chatgpt-auth";
import { redirect } from "next/navigation";
import AdminSettings from "./settings";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isAdminEmail(user.email)) redirect("/");
  return <AdminSettings userName={user.displayName} tokenAuth={user.source === "token"} />;
}
