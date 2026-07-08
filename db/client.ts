// SQLite connection helpers (ADR-0004: app reads pre-computed tables read-only,
// the ingest/grading batch is the sole writer).
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type ReadDb = ReturnType<typeof getReadDb>;

const DEFAULT_DB_PATH = "./data/nutrirank.sqlite";

function dbPath(): string {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
}

// App read path (Next.js request handlers, RSC). Read-only connection so the
// serving path can never accidentally mutate pre-computed tables; requires
// the DB file to already exist (created by db:migrate / the ingest batch).
export function getReadDb() {
  const sqlite = new Database(dbPath(), { readonly: true, fileMustExist: true });
  // Wait briefly instead of erroring if the on-demand search-cache writer holds a
  // lock (search-ingest.ts is a documented exception to the read-only serving path).
  sqlite.pragma("busy_timeout = 3000");
  return drizzle(sqlite, { schema });
}

// Like getReadDb but returns null when the DB file does not exist yet (the ingest
// batch has not run). Lets screens render a "데이터 준비 중" empty state instead of
// crashing before the first pipeline run.
//
// The connection is memoized: a read-only WAL connection is reused across
// requests (avoids leaking a handle per RSC render), and it still sees each new
// committed snapshot because the ingest batch swaps data in-place on the same
// file. null is not cached, so the first successful ingest is picked up without a
// restart.
let cachedReadDb: ReadDb | null = null;

export function tryGetReadDb(): ReadDb | null {
  if (cachedReadDb) return cachedReadDb;
  if (!existsSync(dbPath())) return null;
  cachedReadDb = getReadDb();
  return cachedReadDb;
}

// Batch write path (db:migrate, scripts/ingest). WAL mode keeps concurrent
// app reads from blocking on the writer per ADR-0004.
export function getWriteDb() {
  // better-sqlite3 doesn't create parent dirs; ensure ./data exists on first run.
  mkdirSync(dirname(dbPath()), { recursive: true });
  const sqlite = new Database(dbPath(), { readonly: false, fileMustExist: false });
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 3000");
  // better-sqlite3 leaves FK enforcement OFF by default; enable it so the
  // schema's references (product_nutrient→product, category_ranking→category,
  // etc.) actually reject orphan rows on the sole writer path (ADR-0004).
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
