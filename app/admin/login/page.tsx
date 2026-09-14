import { redirect } from "next/navigation";
import { getAdminToken, getChatGPTUser, safeRelativeReturnPath } from "../../chatgpt-auth";
import "../admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; error?: string }>;
}) {
  const user = await getChatGPTUser();
  if (user) redirect("/admin");
  const query = await searchParams;
  const returnTo = safeRelativeReturnPath(query.return_to ?? "/admin");
  const configured = Boolean(getAdminToken());

  return (
    <main className="adminShell adminLogin">
      <section className="adminMain">
        <header>
          <div>
            <p>99GOLD.NET</p>
            <h1>管理後台登入</h1>
          </div>
        </header>
        {!configured ? (
          <p>伺服器尚未設定 <code>ADMIN_TOKEN</code>。請在 VPS 環境變數中設定後再試。</p>
        ) : (
          <form className="adminLoginForm" action="/api/admin/session" method="post">
            <input type="hidden" name="return_to" value={returnTo} />
            <label>
              管理權杖
              <input type="password" name="token" autoComplete="current-password" required />
            </label>
            {query.error ? <p className="adminLoginError">權杖錯誤，請再試一次。</p> : null}
            <button type="submit">登入</button>
          </form>
        )}
      </section>
    </main>
  );
}
