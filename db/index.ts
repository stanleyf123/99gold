import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { getRawDb, getSqlite, sqlitePath } from "./sqlite";

export { getRawDb, getSqlite, sqlitePath };
export type { AppDatabase, SqliteStatement } from "./sqlite";

export function getDb() {
  return drizzle(getSqlite(), { schema });
}
