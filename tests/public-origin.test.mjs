import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(env = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL("../lib/public-origin.ts", import.meta.url), "utf8"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    URL,
    process: { env },
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const UPSTREAM = "http://127.0.0.1:3000/api/admin/session";
const SITE = "https://99gold.net";

test("redirect Location host is the SITE_URL host when env is set", () => {
  const { publicAbsoluteUrl } = load({ SITE_URL: SITE });
  const location = publicAbsoluteUrl("/admin", UPSTREAM);
  assert.equal(location.host, new URL(SITE).host);
  assert.equal(location.origin, SITE);
  assert.equal(location.href, "https://99gold.net/admin");
  assert.notEqual(location.hostname, "127.0.0.1");
  assert.notEqual(location.hostname, "localhost");
});

test("trims trailing slash on SITE_URL before building redirects", () => {
  const { publicOrigin, publicAbsoluteUrl } = load();
  assert.equal(publicOrigin(UPSTREAM, "https://99gold.net/"), SITE);
  assert.equal(publicOrigin(UPSTREAM, "https://99gold.net///"), SITE);
  const failure = publicAbsoluteUrl("/admin/login", UPSTREAM, "https://99gold.net/");
  failure.searchParams.set("return_to", "/admin");
  failure.searchParams.set("error", "1");
  assert.equal(failure.origin, SITE);
  assert.equal(failure.pathname, "/admin/login");
  assert.equal(failure.searchParams.get("error"), "1");
});

test("falls back to request.url origin when SITE_URL is missing", () => {
  const { publicOrigin, publicAbsoluteUrl } = load();
  assert.equal(publicOrigin(UPSTREAM, ""), "http://127.0.0.1:3000");
  assert.equal(publicOrigin(UPSTREAM, "   "), "http://127.0.0.1:3000");
  assert.equal(publicOrigin(UPSTREAM, undefined), "http://127.0.0.1:3000");
  assert.equal(publicAbsoluteUrl("/admin", "http://localhost:3000/api/admin/session", "").href, "http://localhost:3000/admin");
});

test("reads process.env.SITE_URL by default", () => {
  const { publicOrigin } = load({ SITE_URL: "https://99gold.net/" });
  assert.equal(publicOrigin(UPSTREAM), SITE);
});

test("admin session route builds redirects from SITE_URL helper, not request.url", () => {
  const source = readFileSync(new URL("../app/api/admin/session/route.ts", import.meta.url), "utf8");
  assert.match(source, /publicAbsoluteUrl/);
  assert.doesNotMatch(source, /new URL\([^,]+,\s*request\.url\)/);
});
