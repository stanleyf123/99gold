import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load() {
  const code = ts.transpileModule(readFileSync(new URL("../lib/auth/admin-emails.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    process: { env: {} },
    Set,
    Object,
    Array,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const { parseAdminEmails, emailHasAdminRole, primaryAdminEmail } = load();

test("ADMIN_EMAILS is a comma-separated allowlist plus ADMIN_EMAIL", () => {
  assert.equal(primaryAdminEmail("  Owner@Example.com  "), "owner@example.com");
  assert.equal(
    parseAdminEmails("owner@example.com", "a@x.com, B@X.com, owner@example.com").join(","),
    "owner@example.com,a@x.com,b@x.com",
  );
  assert.equal(emailHasAdminRole("b@x.com", "owner@example.com", "a@x.com,b@x.com"), true);
  assert.equal(emailHasAdminRole("other@x.com", "owner@example.com", "a@x.com"), false);
  assert.equal(emailHasAdminRole("", "owner@example.com", "a@x.com"), false);
});

test("falls back to the default operator email when env is empty", () => {
  const emails = parseAdminEmails("", "", "stanleys1225@gmail.com");
  assert.equal(emails.join(","), "stanleys1225@gmail.com");
  assert.equal(emailHasAdminRole("stanleys1225@gmail.com", "", "", "stanleys1225@gmail.com"), true);
});
