import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

export type StatementResult = { success: true; meta: { changes: number; last_row_id: number } };
export type SqliteStatement = {
  bind(...values: unknown[]): SqliteStatement;
  run(): Promise<StatementResult>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[]; success: true }>;
  executeSync(): StatementResult;
};
export type AppDatabase = {
  prepare(query: string): SqliteStatement;
  batch(statements: SqliteStatement[]): Promise<StatementResult[]>;
};

type GlobalSqlite = {
  sqlite?: Database.Database;
  rawDb?: AppDatabase;
};

const globalForSqlite = globalThis as typeof globalThis & GlobalSqlite;

export function sqlitePath() {
  return process.env.SQLITE_PATH?.trim() || join(process.cwd(), "data", "99gold.sqlite");
}

function normalizeParams(values: unknown[]) {
  return values.map((value) => (value === undefined ? null : value));
}

class BoundStatement implements SqliteStatement {
  #database: Database.Database;
  #sql: string;
  #params: unknown[] = [];

  constructor(database: Database.Database, sql: string) {
    this.#database = database;
    this.#sql = sql;
  }

  bind(...values: unknown[]) {
    this.#params = normalizeParams(values);
    return this;
  }

  executeSync(): StatementResult {
    const info = this.#database.prepare(this.#sql).run(...this.#params);
    return {
      success: true,
      meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) },
    };
  }

  run() {
    return Promise.resolve(this.executeSync());
  }

  first<T>() {
    const row = this.#database.prepare(this.#sql).get(...this.#params) as T | undefined;
    return Promise.resolve(row ?? null);
  }

  all<T>() {
    const results = this.#database.prepare(this.#sql).all(...this.#params) as T[];
    return Promise.resolve({ results, success: true as const });
  }
}

function wrapDatabase(database: Database.Database): AppDatabase {
  return {
    prepare(query: string) {
      return new BoundStatement(database, query);
    },
    batch(statements: SqliteStatement[]) {
      const run = database.transaction(() => statements.map((statement) => statement.executeSync()));
      return Promise.resolve(run());
    },
  };
}

function splitSqlStatements(sql: string) {
  return sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.replace(/^\uFEFF/, "").trim())
    .filter(Boolean);
}

export function applySqliteMigrations(database: Database.Database, drizzleDirectory = join(process.cwd(), "drizzle")) {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  )`);

  const files = readdirSync(drizzleDirectory)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  for (const file of files) {
    const applied = database.prepare("SELECT id FROM schema_migrations WHERE id = ?").get(file);
    if (applied) continue;
    const sql = readFileSync(join(drizzleDirectory, file), "utf8");
    const apply = database.transaction(() => {
      for (const statement of splitSqlStatements(sql)) {
        database.exec(statement);
      }
      database.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
    });
    apply();
  }
}

function openSqlite() {
  const path = sqlitePath();
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.pragma("foreign_keys = ON");
  applySqliteMigrations(database);
  return database;
}

export function getSqlite() {
  if (!globalForSqlite.sqlite) {
    globalForSqlite.sqlite = openSqlite();
  }
  return globalForSqlite.sqlite;
}

export function getRawDb(): AppDatabase {
  if (!globalForSqlite.rawDb) {
    globalForSqlite.rawDb = wrapDatabase(getSqlite());
  }
  return globalForSqlite.rawDb;
}
