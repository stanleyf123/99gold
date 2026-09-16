import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(env = {}) {
  const code = ts.transpileModule(readFileSync(new URL("../lib/auth/oauth.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require(id) {
      if (id === "node:crypto" || id === "crypto") return { createHash, randomBytes };
      throw new Error(`unexpected require: ${id}`);
    },
    URLSearchParams,
    process: { env },
    Buffer,
    Date,
    JSON,
    fetch: undefined,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

test("builds Auth.js-style callback URLs from SITE origin", () => {
  const {
    oauthCallbackPath,
    buildOAuthCallbackUrl,
    oauthLoginPath,
  } = load();
  assert.equal(oauthCallbackPath("google"), "/api/auth/callback/google");
  assert.equal(oauthCallbackPath("line"), "/api/auth/callback/line");
  assert.equal(buildOAuthCallbackUrl("https://99gold.net", "google"), "https://99gold.net/api/auth/callback/google");
  assert.equal(buildOAuthCallbackUrl("https://99gold.net/", "line"), "https://99gold.net/api/auth/callback/line");
  assert.equal(oauthLoginPath("google"), "/api/auth/login/google");
});

test("builds Google and LINE authorize URLs with PKCE and state", () => {
  const { googleAuthorizeUrl, lineAuthorizeUrl, authorizeUrlForProvider } = load();
  const google = new URL(googleAuthorizeUrl({
    clientId: "g-client",
    redirectUri: "https://99gold.net/api/auth/callback/google",
    state: "nonce-1",
    codeChallenge: "challenge-1",
  }));
  assert.equal(google.origin, "https://accounts.google.com");
  assert.equal(google.searchParams.get("client_id"), "g-client");
  assert.equal(google.searchParams.get("redirect_uri"), "https://99gold.net/api/auth/callback/google");
  assert.equal(google.searchParams.get("state"), "nonce-1");
  assert.equal(google.searchParams.get("code_challenge"), "challenge-1");
  assert.equal(google.searchParams.get("code_challenge_method"), "S256");
  assert.match(google.searchParams.get("scope"), /openid/);

  const line = new URL(lineAuthorizeUrl({
    channelId: "line-channel",
    redirectUri: "https://99gold.net/api/auth/callback/line",
    state: "nonce-2",
    codeChallenge: "challenge-2",
  }));
  assert.equal(line.origin, "https://access.line.me");
  assert.equal(line.searchParams.get("client_id"), "line-channel");
  assert.equal(line.searchParams.get("redirect_uri"), "https://99gold.net/api/auth/callback/line");
  assert.equal(line.searchParams.get("code_challenge_method"), "S256");

  const viaHelper = authorizeUrlForProvider("line", {
    clientId: "line-channel",
    redirectUri: "https://99gold.net/api/auth/callback/line",
    state: "n",
    codeChallenge: "c",
  });
  assert.match(viaHelper, /access\.line\.me/);
});

test("hides providers until client id, secret, and AUTH_SECRET are all set", () => {
  const empty = load({}).oauthEnvStatus();
  assert.equal(empty.googleReady, false);
  assert.equal(empty.lineReady, false);
  assert.equal(empty.authSecret, false);

  const googleOnly = load({
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
  }).oauthEnvStatus({
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
  });
  assert.equal(googleOnly.google, true);
  assert.equal(googleOnly.googleReady, false);

  const ready = load({
    AUTH_SECRET: "auth",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    LINE_CHANNEL_ID: "line",
    LINE_CHANNEL_SECRET: "line-secret",
  });
  const status = ready.oauthEnvStatus({
    AUTH_SECRET: "auth",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    LINE_CHANNEL_ID: "line",
    LINE_CHANNEL_SECRET: "line-secret",
  });
  assert.equal(status.googleReady, true);
  assert.equal(status.lineReady, true);
  assert.equal(ready.providerReady("google", {
    AUTH_SECRET: "auth",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
  }), true);
});

test("login page explains missing OAuth config instead of showing live buttons", () => {
  const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /googleReady/);
  assert.match(login, /GOOGLE_CLIENT_ID/);
  assert.match(login, /LINE_CHANNEL_ID/);
  assert.match(login, /AUTH_SECRET/);
  assert.match(login, /oauthEnvStatus/);
  const loginRoute = readFileSync(new URL("../app/api/auth/login/[provider]/route.ts", import.meta.url), "utf8");
  assert.match(loginRoute, /buildOAuthCallbackUrl/);
  assert.match(loginRoute, /publicOrigin/);
  const callback = readFileSync(new URL("../app/api/auth/callback/[provider]/route.ts", import.meta.url), "utf8");
  assert.match(callback, /buildOAuthCallbackUrl/);
  assert.doesNotMatch(callback, /localStorage/);
});
