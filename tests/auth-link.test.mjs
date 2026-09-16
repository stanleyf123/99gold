import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load() {
  const code = ts.transpileModule(readFileSync(new URL("../lib/auth/link.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, module: { exports: {} }, Object, Array };
  vm.runInNewContext(code, context);
  return context.exports;
}

function same(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

const { decideAccountLink } = load();

test("creates a member when nothing matches", () => {
  same(decideAccountLink({
    currentUser: null,
    accountByProvider: null,
    userByEmail: null,
  }), { action: "create" });
});

test("logs into the existing provider account", () => {
  same(decideAccountLink({
    currentUser: null,
    accountByProvider: { userId: "u1", disabled: false },
    userByEmail: { userId: "u2", disabled: false },
  }), { action: "login", userId: "u1" });
});

test("links by email when the provider is new", () => {
  same(decideAccountLink({
    currentUser: null,
    accountByProvider: null,
    userByEmail: { userId: "u-mail", disabled: false },
  }), { action: "link", userId: "u-mail" });
});

test("links a second provider onto the current session", () => {
  same(decideAccountLink({
    currentUser: { userId: "me", disabled: false },
    accountByProvider: null,
    userByEmail: null,
  }), { action: "link", userId: "me" });
});

test("rejects a disabled provider account", () => {
  same(decideAccountLink({
    currentUser: null,
    accountByProvider: { userId: "banned", disabled: true },
    userByEmail: null,
  }), { action: "conflict", reason: "disabled" });
});

test("rejects linking a provider already owned by someone else", () => {
  same(decideAccountLink({
    currentUser: { userId: "me", disabled: false },
    accountByProvider: { userId: "other", disabled: false },
    userByEmail: null,
  }), { action: "conflict", reason: "provider_taken" });
});

test("rejects linking an email that belongs to another member", () => {
  same(decideAccountLink({
    currentUser: { userId: "me", disabled: false },
    accountByProvider: null,
    userByEmail: { userId: "other", disabled: false },
  }), { action: "conflict", reason: "email_taken" });
});
