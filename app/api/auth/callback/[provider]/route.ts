import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRawDb } from "../../../../../db";
import { publicAbsoluteUrl, publicOrigin } from "../../../../../lib/public-origin";
import { safeRelativeReturnPath } from "../../../../chatgpt-auth";
import { emailHasAdminRole } from "../../../../../lib/auth/admin-emails";
import { completeOAuthLogin } from "../../../../../lib/auth/members";
import {
  OAUTH_FLOW_COOKIE,
  verifyToken,
} from "../../../../../lib/auth/session";
import {
  authCookieOptions,
  memberSessionCookie,
  readMemberSessionId,
} from "../../../../../lib/auth/server";
import {
  buildOAuthCallbackUrl,
  fetchOAuthProfile,
  flowIsFresh,
  getAuthSecret,
  isOAuthProvider,
  parseOAuthFlow,
  providerReady,
} from "../../../../../lib/auth/oauth";
import { LOCALE_COOKIE, withLocalePrefix } from "../../../../../lib/locale-path";

function loginRedirect(request: Request, error: string, locale: "zh" | "en" | "ja" = "zh") {
  const url = publicAbsoluteUrl(withLocalePrefix("/login", locale), request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const url = new URL(request.url);
  const flowCookie = (await cookies()).get(OAUTH_FLOW_COOKIE)?.value ?? "";
  const secret = getAuthSecret();

  if (!isOAuthProvider(rawProvider) || !secret || !providerReady(rawProvider)) {
    return loginRedirect(request, "config");
  }

  const providerError = url.searchParams.get("error");
  if (providerError) {
    return loginRedirect(request, providerError === "access_denied" ? "denied" : "oauth");
  }

  const code = url.searchParams.get("code")?.trim() ?? "";
  const state = url.searchParams.get("state")?.trim() ?? "";
  const rawFlow = flowCookie ? verifyToken(flowCookie, secret) : null;
  const flow = rawFlow ? parseOAuthFlow(rawFlow) : null;
  if (!code || !state || !flow || flow.provider !== rawProvider || flow.nonce !== state || !flowIsFresh(flow)) {
    return loginRedirect(request, "oauth", flow?.locale);
  }

  try {
    const redirectUri = buildOAuthCallbackUrl(publicOrigin(request.url), rawProvider);
    const profile = await fetchOAuthProfile({
      provider: rawProvider,
      code,
      redirectUri,
      verifier: flow.verifier,
    });
    const currentUserId = await readMemberSessionId();
    const result = await completeOAuthLogin(getRawDb(), {
      profile,
      currentUserId,
      locale: flow.locale,
    });
    if (!result.ok) {
      return loginRedirect(request, result.error, flow.locale);
    }

    let destinationPath = safeRelativeReturnPath(flow.returnTo);
    const canAdmin = result.user.role === "admin" || emailHasAdminRole(result.user.email);
    if (destinationPath.startsWith("/admin") && !canAdmin) {
      destinationPath = withLocalePrefix("/account", result.user.locale);
    }
    const destination = publicAbsoluteUrl(destinationPath, request.url);
    const response = NextResponse.redirect(destination, { status: 303 });
    const session = memberSessionCookie(result.sessionId, secret);
    response.cookies.set(session.name, session.value, session.options);
    response.cookies.set(OAUTH_FLOW_COOKIE, "", { ...authCookieOptions(0), maxAge: 0 });
    response.cookies.set(LOCALE_COOKIE, result.user.locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return loginRedirect(request, "oauth", flow.locale);
  }
}
