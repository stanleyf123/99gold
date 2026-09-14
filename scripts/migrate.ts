import { getSqlite, sqlitePath } from "../db";

getSqlite();
console.log(JSON.stringify({ event: "sqlite_migrated", path: sqlitePath() }));
