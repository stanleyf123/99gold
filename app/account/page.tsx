import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requestLocale } from "../../lib/request-locale";
import { getOptionalMember } from "../../lib/auth/server";
import { listLinkedProviders } from "../../lib/auth/members";
import { getRawDb } from "../../db";
import { localizedHref } from "../../lib/locale-path";
import { oauthEnvStatus, oauthLoginPath } from "../../lib/auth/oauth";
import AccountView from "./AccountView";
import "../member.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const title = locale === "ja" ? "会員センター｜99GOLD.NET" : locale === "en" ? "Account | 99GOLD.NET" : "會員中心｜玖久黃金報價網";
  return { title, robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  const locale = await requestLocale();
  const member = await getOptionalMember();
  if (!member) {
    redirect(`${localizedHref("/login", locale)}?return_to=${encodeURIComponent(localizedHref("/account", locale))}`);
  }
  const providers = await listLinkedProviders(getRawDb(), member.id).catch(() => []);
  const status = oauthEnvStatus();
  return (
    <AccountView
      member={{
        id: member.id,
        displayName: member.displayName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        locale: member.locale,
        role: member.role,
        providers,
        createdAt: member.createdAt,
      }}
      uiLocale={locale}
      googleReady={status.googleReady}
      lineReady={status.lineReady}
      googleHref={`${oauthLoginPath("google")}?return_to=${encodeURIComponent(localizedHref("/account", locale))}&locale=${locale}`}
      lineHref={`${oauthLoginPath("line")}?return_to=${encodeURIComponent(localizedHref("/account", locale))}&locale=${locale}`}
    />
  );
}
