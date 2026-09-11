import { requireChatGPTUser } from "../chatgpt-auth";
import { redirect } from "next/navigation";
import AdminSettings from "./settings";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (user.email.toLowerCase() !== "stanleys1225@gmail.com") redirect("/");
  return <AdminSettings userName={user.displayName} />;
}
