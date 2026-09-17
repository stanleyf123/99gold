import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

const root = fileURLToPath(new URL("..", import.meta.url));

test("db:migrate applies drizzle SQL to a fresh SQLite file", () => {
  const directory = mkdtempSync(join(tmpdir(), "99gold-sqlite-"));
  const path = join(directory, "99gold.sqlite");
  try {
    const first = spawnSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SQLITE_PATH: path },
    });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const second = spawnSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, SQLITE_PATH: path },
    });
    assert.equal(second.status, 0, second.stderr || second.stdout);

    const database = new Database(path);
    const tables = database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all().map((row) => row.name);
    assert.ok(tables.includes("news_articles"));
    assert.ok(tables.includes("news_candidates"));
    assert.ok(tables.includes("news_runs"));
    assert.ok(tables.includes("news_source_state"));
    assert.ok(tables.includes("site_settings"));
    assert.ok(tables.includes("users"));
    assert.ok(tables.includes("oauth_accounts"));
    assert.ok(tables.includes("sessions"));
    assert.equal(tables.includes("price_alert_subscriptions"), false);
    const applied = database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get();
    assert.equal(applied.count, 11);
    const candidateColumns = database.prepare("PRAGMA table_info(news_candidates)").all().map((row) => row.name);
    assert.ok(candidateColumns.includes("title_zh"));
    assert.ok(candidateColumns.includes("title_ja"));
    assert.ok(candidateColumns.includes("translation_provider"));
    assert.ok(candidateColumns.includes("translation_retry_at"));
    assert.ok(candidateColumns.includes("translation_attempts"));
    assert.ok(candidateColumns.includes("image_url"));
    database.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
