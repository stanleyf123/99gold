import { createHash, randomBytes } from "node:crypto";

export const OAUTH_PROVIDERS = ["google", "line"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export type OAuthProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

export type OAuthFlow = {
  nonce: string;
  provider: OAuthProvider;
  returnTo: string;
  verifier: string;
  locale: "zh" | "en" | "ja";
  issuedAt: number;
};

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
const LINE_AUTHORIZE = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN = "https://api.line.me/oauth2/v2.1/token";
const LINE_VERIFY = "https://api.line.me/oauth2/v2.1/verify";
const LINE_PROFILE = "https://api.line.me/v2/profile";

export function isOAuthProvider(value: string | null | undefined): value is OAuthProvider {
  return value === "google" || value === "line";
}

export function getAuthSecret(env = process.env) {
  return env.AUTH_SECRET?.trim() || "";
}

export function oauthCallbackPath(provider: OAuthProvider) {
  return `/api/auth/callback/${provider}`;
}

export function oauthLoginPath(provider: OAuthProvider) {
  return `/api/auth/login/${provider}`;
}

export function buildOAuthCallbackUrl(origin: string, provider: OAuthProvider) {
  return `${origin.replace(/\/+$/, "")}${oauthCallbackPath(provider)}`;
}

export function oauthEnvStatus(env = process.env) {
  const googleId = Boolean(env.GOOGLE_CLIENT_ID?.trim());
  const googleSecret = Boolean(env.GOOGLE_CLIENT_SECRET?.trim());
  const lineId = Boolean(env.LINE_CHANNEL_ID?.trim());
  const lineSecret = Boolean(env.LINE_CHANNEL_SECRET?.trim());
  const authSecret = Boolean(getAuthSecret(env));
  return {
    authSecret,
    google: googleId && googleSecret,
    line: lineId && lineSecret,
    googleReady: authSecret && googleId && googleSecret,
    lineReady: authSecret && lineId && lineSecret,
  };
}

export function providerReady(provider: OAuthProvider, env = process.env) {
  const status = oauthEnvStatus(env);
  return provider === "google" ? status.googleReady : status.lineReady;
}

export function generateOAuthNonce() {
  return randomBytes(16).toString("base64url");
}

export function generatePkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function googleAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTHORIZE}?${params}`;
}

export function lineAuthorizeUrl(input: {
  channelId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.channelId,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: "profile openid email",
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${LINE_AUTHORIZE}?${params}`;
}

export function authorizeUrlForProvider(
  provider: OAuthProvider,
  input: { clientId: string; redirectUri: string; state: string; codeChallenge: string },
) {
  return provider === "google"
    ? googleAuthorizeUrl(input)
    : lineAuthorizeUrl({ ...input, channelId: input.clientId });
}

export function providerClientId(provider: OAuthProvider, env = process.env) {
  return provider === "google"
    ? env.GOOGLE_CLIENT_ID?.trim() || ""
    : env.LINE_CHANNEL_ID?.trim() || "";
}

export function providerClientSecret(provider: OAuthProvider, env = process.env) {
  return provider === "google"
    ? env.GOOGLE_CLIENT_SECRET?.trim() || ""
    : env.LINE_CHANNEL_SECRET?.trim() || "";
}

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

async function exchangeToken(input: {
  tokenUrl: string;
  body: URLSearchParams;
}): Promise<TokenResponse> {
  const response = await fetch(input.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: input.body,
  });
  const data = await readJson(response) as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "oauth_token_failed");
  }
  return data;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function fetchOAuthProfile(input: {
  provider: OAuthProvider;
  code: string;
  redirectUri: string;
  verifier: string;
  env?: NodeJS.ProcessEnv;
}): Promise<OAuthProfile> {
  const env = input.env ?? process.env;
  const clientId = providerClientId(input.provider, env);
  const clientSecret = providerClientSecret(input.provider, env);
  if (!clientId || !clientSecret) throw new Error("oauth_not_configured");

  if (input.provider === "google") {
    const token = await exchangeToken({
      tokenUrl: GOOGLE_TOKEN,
      body: new URLSearchParams({
        code: input.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
        code_verifier: input.verifier,
      }),
    });
    const response = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await readJson(response);
    const sub = asString(profile.sub);
    if (!response.ok || !sub) throw new Error("oauth_profile_failed");
    const email = asString(profile.email).toLowerCase() || null;
    return {
      provider: "google",
      providerAccountId: sub,
      displayName: asString(profile.name) || email || "Google user",
      email,
      avatarUrl: asString(profile.picture) || null,
    };
  }

  const token = await exchangeToken({
    tokenUrl: LINE_TOKEN,
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: input.verifier,
    }),
  });

  let email: string | null = null;
  let displayName = "";
  let avatarUrl: string | null = null;
  let providerAccountId = "";

  if (token.id_token) {
    const verified = await fetch(LINE_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: token.id_token, client_id: clientId }),
    });
    const claims = await readJson(verified);
    if (verified.ok) {
      providerAccountId = asString(claims.sub);
      displayName = asString(claims.name);
      email = asString(claims.email).toLowerCase() || null;
      avatarUrl = asString(claims.picture) || null;
    }
  }

  if (!providerAccountId) {
    const response = await fetch(LINE_PROFILE, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await readJson(response);
    providerAccountId = asString(profile.userId);
    displayName = displayName || asString(profile.displayName);
    avatarUrl = avatarUrl || asString(profile.pictureUrl) || null;
    if (!response.ok || !providerAccountId) throw new Error("oauth_profile_failed");
  }

  return {
    provider: "line",
    providerAccountId,
    displayName: displayName || email || "LINE user",
    email,
    avatarUrl,
  };
}

const OAUTH_FLOW_MAX_AGE_MS = 60 * 10 * 1000;

export function flowIsFresh(flow: OAuthFlow, now = Date.now(), maxAgeMs = OAUTH_FLOW_MAX_AGE_MS) {
  return now - flow.issuedAt >= 0 && now - flow.issuedAt <= maxAgeMs;
}

export function parseOAuthFlow(value: string): OAuthFlow | null {
  try {
    const parsed = JSON.parse(value) as Partial<OAuthFlow>;
    if (!isOAuthProvider(parsed.provider)) return null;
    if (!parsed.nonce || !parsed.verifier || typeof parsed.issuedAt !== "number") return null;
    const locale = parsed.locale === "en" || parsed.locale === "ja" ? parsed.locale : "zh";
    const returnTo = typeof parsed.returnTo === "string" ? parsed.returnTo : "/account";
    return {
      nonce: parsed.nonce,
      provider: parsed.provider,
      returnTo,
      verifier: parsed.verifier,
      locale,
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return null;
  }
}
