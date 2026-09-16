import type { Metadata } from "next";
import { requestLocale } from "../../lib/request-locale";
import { oauthEnvStatus, oauthLoginPath } from "../../lib/auth/oauth";
import { getOptionalMember } from "../../lib/auth/server";
import { localizedHref } from "../../lib/locale-path";
import { redirect } from "next/navigation";
import { safeRelativeReturnPath } from "../chatgpt-auth";
import "../member.css";

export const dynamic = "force-dynamic";

const copy = {
  title: { zh: "會員登入｜玖久黃金報價網", en: "Sign in | 99GOLD.NET", ja: "ログイン｜99GOLD.NET" },
  heading: { zh: "會員登入", en: "Member sign in", ja: "会員ログイン" },
  intro: {
    zh: "使用 Google 或 LINE 登入會員中心。不會把存取權杖存在瀏覽器 localStorage。",
    en: "Sign in with Google or LINE. Access tokens are never stored in localStorage.",
    ja: "Google または LINE でログインします。アクセストークンは localStorage に保存しません。",
  },
  google: { zh: "使用 Google 登入", en: "Continue with Google", ja: "Google でログイン" },
  line: { zh: "使用 LINE 登入", en: "Continue with LINE", ja: "LINE でログイン" },
  googleMissing: {
    zh: "尚未設定 Google 登入（需要 GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET 與 AUTH_SECRET）。",
    en: "Google login is not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET).",
    ja: "Google ログインは未設定です（GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、AUTH_SECRET）。",
  },
  lineMissing: {
    zh: "尚未設定 LINE 登入（需要 LINE_CHANNEL_ID、LINE_CHANNEL_SECRET 與 AUTH_SECRET）。",
    en: "LINE login is not configured (LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, and AUTH_SECRET).",
    ja: "LINE ログインは未設定です（LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、AUTH_SECRET）。",
  },
  secretMissing: {
    zh: "尚未設定 AUTH_SECRET，無法建立會員工作階段。公開頁面仍可瀏覽。",
    en: "AUTH_SECRET is missing, so member sessions cannot be created. Public pages still work.",
    ja: "AUTH_SECRET が未設定のため会員セッションを作成できません。公開ページは利用できます。",
  },
  errors: {
    config: {
      zh: "伺服器尚未完成 OAuth 設定。",
      en: "OAuth is not configured on this server.",
      ja: "このサーバーでは OAuth が設定されていません。",
    },
    denied: {
      zh: "你取消了授權。",
      en: "You cancelled the sign-in.",
      ja: "ログインをキャンセルしました。",
    },
    disabled: {
      zh: "此帳號已被停用，請聯絡管理者。",
      en: "This account is disabled. Contact an administrator.",
      ja: "このアカウントは停止されています。管理者に連絡してください。",
    },
    provider_taken: {
      zh: "這個登入方式已綁定其他會員。",
      en: "That login is already linked to another member.",
      ja: "このログインは別の会員に連携済みです。",
    },
    email_taken: {
      zh: "這個 Email 已屬於其他會員。",
      en: "That email already belongs to another member.",
      ja: "このメールアドレスは別の会員が使用しています。",
    },
    oauth: {
      zh: "登入失敗，請再試一次。",
      en: "Sign-in failed. Please try again.",
      ja: "ログインに失敗しました。もう一度お試しください。",
    },
  } as Record<string, { zh: string; en: string; ja: string }>,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  return {
    title: copy.title[locale],
    robots: { index: false, follow: false },
  };
}

function firstString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await requestLocale();
  const member = await getOptionalMember();
  const query = (await searchParams) ?? {};
  const returnTo = safeRelativeReturnPath(firstString(query.return_to) || localizedHref("/account", locale));
  if (member) redirect(returnTo);

  const status = oauthEnvStatus();
  const errorKey = firstString(query.error) ?? "";
  const errorCopy = errorKey ? copy.errors[errorKey] : null;

  const hrefFor = (provider: "google" | "line") => {
    const params = new URLSearchParams({
      return_to: returnTo,
      locale,
    });
    return `${oauthLoginPath(provider)}?${params}`;
  };

  return (
    <main className="memberPage">
      <section className="memberCard">
        <p>99GOLD.NET</p>
        <h1>{copy.heading[locale]}</h1>
        <p>{copy.intro[locale]}</p>
        {errorCopy ? <p className="memberError">{errorCopy[locale]}</p> : null}
        {!status.authSecret ? <p className="memberHint">{copy.secretMissing[locale]}</p> : null}
        <div className="oauthButtons">
          {status.googleReady ? (
            <a className="oauthBtn google" href={hrefFor("google")}>{copy.google[locale]}</a>
          ) : (
            <p className="memberHint">{copy.googleMissing[locale]}</p>
          )}
          {status.lineReady ? (
            <a className="oauthBtn line" href={hrefFor("line")}>{copy.line[locale]}</a>
          ) : (
            <p className="memberHint">{copy.lineMissing[locale]}</p>
          )}
        </div>
      </section>
    </main>
  );
}
