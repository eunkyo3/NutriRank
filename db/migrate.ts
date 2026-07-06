// Runs pending SQL migrations from db/migrations against DATABASE_PATH.
// Usage: pnpm db:migrate (tsx db/migrate.ts). Safe to run with an empty
// migrations folder — drizzle-kit generate populates it from db/schema.ts.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const DEFAULT_DB_PATH = "./data/nutrirank.sqlite";

function main() {
  const dbPath = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
  // better-sqlite3 doesn't create parent dirs; ensure ./data exists on first run.
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath, { readonly: false, fileMustExist: false });
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite);

  migrate(db, { migrationsFolder: "./db/migrations" });
  console.log(`Migrations applied to ${dbPath}`);

  sqlite.close();
}

main();
