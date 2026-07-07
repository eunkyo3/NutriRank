// SQLite connection helpers (ADR-0004: app reads pre-computed tables read-only,
// the ingest/grading batch is the sole writer).
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DEFAULT_DB_PATH = "./data/nutrirank.sqlite";

function dbPath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
}

// App read path (Next.js request handlers, RSC). Read-only connection so the
// serving path can never accidentally mutate pre-computed tables; requires
// the DB file to already exist (created by db:migrate / the ingest batch).
export function getReadDb() {
  const sqlite = new Database(dbPath(), { readonly: true, fileMustExist: true });
  return drizzle(sqlite, { schema });
}

// Batch write path (db:migrate, scripts/ingest). WAL mode keeps concurrent
// app reads from blocking on the writer per ADR-0004.
export function getWriteDb() {
  // better-sqlite3 doesn't create parent dirs; ensure ./data exists on first run.
  mkdirSync(dirname(dbPath()), { recursive: true });
  const sqlite = new Database(dbPath(), { readonly: false, fileMustExist: false });
  sqlite.pragma("journal_mode = WAL");
  // better-sqlite3 leaves FK enforcement OFF by default; enable it so the
  // schema's references (product_nutrient→product, category_ranking→category,
  // etc.) actually reject orphan rows on the sole writer path (ADR-0004).
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
