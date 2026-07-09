// Batch ingest CLI (.omc/plans/data-pipeline-spec.md §3). Wires the real
// data.go.kr 15100066 adapter to the write DB and runs the 12-step pipeline.
// Run with: pnpm ingest (tsx scripts/ingest/index.ts).
//
// Requires env (never hardcode — §11 AC): DATA_GO_KR_SERVICE_KEY and
// DATA_GO_KR_15100066_ENDPOINT (the odcloud `.../v1/uddi:<UUID>` base, available
// after 15100066 활용신청 approval).
import { fileURLToPath } from "node:url";
import { getWriteDb } from "@/db/client";
import { DataGoKr15100066Adapter } from "./adapters/datagokr-15100066";
import { runIngest } from "./orchestrator";

async function main() {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const endpoint = process.env.DATA_GO_KR_15100066_ENDPOINT;
  if (!serviceKey) {
    throw new Error("DATA_GO_KR_SERVICE_KEY is required (set it in .env.local).");
  }
  if (!endpoint) {
    throw new Error(
      "DATA_GO_KR_15100066_ENDPOINT is required — set the odcloud uddi endpoint after 15100066 활용신청 approval.",
    );
  }

  const now = new Date();
  const ingestedAt = now.toISOString();
  const snapshotDate = ingestedAt.slice(0, 10);

  // numOfRows: 1000 is slow for this API; 200 is a safe default. INGEST_MAX_PAGES
  // bounds a partial/sample snapshot (e.g. for a first live verification); unset =
  // full dataset.
  const perPage = Number.parseInt(process.env.INGEST_PER_PAGE ?? "200", 10)
  const maxPagesRaw = process.env.INGEST_MAX_PAGES
  const maxPages = maxPagesRaw ? Number.parseInt(maxPagesRaw, 10) : undefined

  // Surface the effective mode so a full run vs a bounded sample is unmistakable
  // (a leftover INGEST_MAX_PAGES in the shell is the usual "why only 1 page?" cause).
  console.error(
    `[ingest] config: perPage=${perPage} maxPages=${maxPages ?? "none(전량)"}` +
      `${maxPages != null ? " ← 부분 샘플(전량 아님). 전량이면 INGEST_MAX_PAGES 를 해제하세요." : ""}`,
  )

  const db = getWriteDb();
  const adapter = new DataGoKr15100066Adapter({ serviceKey, endpoint });
  const report = await runIngest({ adapter, db, ingestedAt, snapshotDate, perPage, maxPages });

  // Print the quality report (no secrets); truncate the unmapped list.
  console.log(JSON.stringify({ ...report, unmapped: report.unmapped.slice(0, 20) }, null, 2));
  if (!report.swapped) {
    console.error("Ingest gate BLOCKED the swap; live tables unchanged. Reasons:", report.gate.reasons);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
