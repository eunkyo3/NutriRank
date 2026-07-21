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

// Next.js는 .env.local/.env를 자동 로드하지만 tsx로 직접 실행하는 이 CLI는 아니다.
// 그래서 키를 .env에 넣어두고도 "DATA_GO_KR_SERVICE_KEY is required"가 났다.
// 이미 설정된 환경변수가 우선하도록 파일은 뒤에서 채우기만 한다(loadEnvFile은 기존
// 값을 덮어쓰지 않는다). 파일이 없으면 조용히 넘어간다.
function loadDotEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // 파일 없음 — 환경변수를 셸에서 직접 넘기는 경우(run-ingest.ps1, CI)라 정상이다.
    }
  }
}

async function main() {
  loadDotEnv();
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  const endpoint = process.env.DATA_GO_KR_15100066_ENDPOINT;
  if (!serviceKey) {
    throw new Error("DATA_GO_KR_SERVICE_KEY is required — set it in .env.local or .env (both are auto-loaded).");
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
