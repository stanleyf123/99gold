import { NextResponse } from "next/server";
import { publicAbsoluteUrl, publicOrigin } from "../../../../../lib/public-origin";
import { safeRelativeReturnPath } from "../../../../chatgpt-auth";
import {
  OAUTH_FLOW_COOKIE,
  OAUTH_FLOW_MAX_AGE_SECONDS,
  signToken,
} from "../../../../../lib/auth/session";
import { authCookieOptions } from "../../../../../lib/auth/server";
import {
  authorizeUrlForProvider,
  buildOAuthCallbackUrl,
  generateOAuthNonce,
  generatePkce,
  getAuthSecret,
  isOAuthProvider,
  oauthEnvStatus,
  providerClientId,
  providerReady,
  type OAuthFlow,
} from "../../../../../lib/auth/oauth";
import { isPathLocale } from "../../../../../lib/locale-path";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: rawProvider } = await context.params;
  const url = new URL(request.url);
  const origin = publicOrigin(request.url);
  const loginUrl = publicAbsoluteUrl("/login", request.url);

  if (!isOAuthProvider(rawProvider)) {
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const status = oauthEnvStatus();
  if (!status.authSecret || !providerReady(rawProvider)) {
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const returnTo = safeRelativeReturnPath(url.searchParams.get("return_to") || "/account");
  const localeParam = url.searchParams.get("locale");
  const locale = isPathLocale(localeParam) ? localeParam : "zh";
  const nonce = generateOAuthNonce();
  const pkce = generatePkce();
  const flow: OAuthFlow = {
    nonce,
    provider: rawProvider,
    returnTo,
    verifier: pkce.verifier,
    locale,
    issuedAt: Date.now(),
  };
  const redirectUri = buildOAuthCallbackUrl(origin, rawProvider);
  const authorize = authorizeUrlForProvider(rawProvider, {
    clientId: providerClientId(rawProvider),
    redirectUri,
    state: nonce,
    codeChallenge: pkce.challenge,
  });

  const response = NextResponse.redirect(authorize, { status: 302 });
  response.cookies.set(OAUTH_FLOW_COOKIE, signToken(JSON.stringify(flow), getAuthSecret()), {
    ...authCookieOptions(OAUTH_FLOW_MAX_AGE_SECONDS),
  });
  return response;
}
