import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load() {
  const code = ts.transpileModule(readFileSync(new URL("../lib/auth/session.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = {
    exports: {},
    module: { exports: {} },
    require(id) {
      if (id === "node:crypto" || id === "crypto") return { createHmac, timingSafeEqual };
      throw new Error(`unexpected require: ${id}`);
    },
    Buffer,
    Error,
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

const { signToken, verifyToken, signSessionId, readSessionId, isExpired } = load();

test("round-trips a signed cookie payload", () => {
  const secret = "unit-test-secret";
  const token = signToken("session-abc", secret);
  assert.equal(verifyToken(token, secret), "session-abc");
  assert.equal(readSessionId(signSessionId("0123456789abcdef", secret), secret), "0123456789abcdef");
});

test("rejects tampered tokens and the wrong secret", () => {
  const secret = "unit-test-secret";
  const token = signToken("session-abc", secret);
  assert.equal(verifyToken(`${token}x`, secret), null);
  assert.equal(verifyToken(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a"), secret), null);
  assert.equal(verifyToken(token, "other-secret"), null);
  assert.equal(verifyToken("", secret), null);
  assert.equal(verifyToken(token, ""), null);
  assert.throws(() => signToken("x", ""));
});

test("treats missing or past expiry as expired", () => {
  assert.equal(isExpired("2020-01-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z")), true);
  assert.equal(isExpired("2030-01-01T00:00:00.000Z", new Date("2026-01-01T00:00:00.000Z")), false);
  assert.equal(isExpired("not-a-date"), true);
});
