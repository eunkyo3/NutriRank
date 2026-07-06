// output: 'standalone' ships a self-contained server bundle for the Docker runner.
// Next only traces deps reachable from imported route code; no page imports db/client.ts
// yet (scaffold stubs), so the SQLite driver would be pruned from the standalone output.
// outputFileTracingIncludes forces the native driver + ORM into .next/standalone/node_modules
// so `require('better-sqlite3')` works in the runner image (§5 AC#1) and the ingest batch
// can resolve them from /app/node_modules (§5 AC#3). Top-level key in Next 15 (was experimental).
export default {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/better-sqlite3/**',
      './node_modules/drizzle-orm/**',
    ],
  },
};
