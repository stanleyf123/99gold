import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));

test("completeOAuthLogin creates, links by email, and blocks disabled members", () => {
  const directory = mkdtempSync(join(tmpdir(), "99gold-members-"));
  const path = join(directory, "99gold.sqlite");
  try {
    const migrate = spawnSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SQLITE_PATH: path },
    });
    assert.equal(migrate.status, 0, migrate.stderr || migrate.stdout);

    const script = `
      import { getRawDb } from "./db/index.ts";
      import { completeOAuthLogin, findUserByEmail, listLinkedProviders, setMemberStatus } from "./lib/auth/members.ts";

      const db = getRawDb();
      const google = await completeOAuthLogin(db, {
        profile: {
          provider: "google",
          providerAccountId: "g-1",
          displayName: "Ada",
          email: "ada@example.com",
          avatarUrl: null,
        },
        currentUserId: null,
        locale: "zh",
        now: new Date("2026-09-16T00:00:00.000Z"),
      });
      if (!google.ok) throw new Error("expected create");
      const linked = await completeOAuthLogin(db, {
        profile: {
          provider: "line",
          providerAccountId: "line-1",
          displayName: "Ada LINE",
          email: "ada@example.com",
          avatarUrl: null,
        },
        currentUserId: null,
        locale: "en",
        now: new Date("2026-09-16T01:00:00.000Z"),
      });
      if (!linked.ok) throw new Error("expected email link: " + linked.error);
      const user = await findUserByEmail(db, "ada@example.com");
      const providers = await listLinkedProviders(db, user.id);
      await setMemberStatus(db, user.id, "disabled");
      const blocked = await completeOAuthLogin(db, {
        profile: {
          provider: "google",
          providerAccountId: "g-1",
          displayName: "Ada",
          email: "ada@example.com",
          avatarUrl: null,
        },
        currentUserId: null,
        locale: "zh",
      });
      console.log(JSON.stringify({
        sameUser: google.user.id === linked.user.id,
        providers,
        blocked: blocked.ok ? "ok" : blocked.error,
        role: user.role,
      }));
    `;

    const run = spawnSync(process.execPath, ["--import", "tsx", "-e", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SQLITE_PATH: path, ADMIN_EMAILS: "" },
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const payload = JSON.parse(run.stdout.trim().split("\n").at(-1));
    assert.equal(payload.sameUser, true);
    assert.deepEqual(payload.providers, ["google", "line"]);
    assert.equal(payload.blocked, "disabled");
    assert.equal(payload.role, "member");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
