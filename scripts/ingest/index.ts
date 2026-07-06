// Batch ingest pipeline stub per .omc/plans/data-pipeline-spec.md §3 (E2E steps).
// Run with: pnpm ingest (tsx scripts/ingest/index.ts).
async function main() {
  console.log("NutriRank ingest pipeline (stub) — see .omc/plans/data-pipeline-spec.md §3");

  // TODO [1 fetch]  API 페이지네이션 전량 수집 → 원본 스냅샷(raw) (§4)
  // TODO [2 parse]  레코드별 정규화(기준량→제품유형, 성분 NULL 보존, 숫자 파싱) (§5)
  // TODO [3 map]    식약처 세분류→소비자 카테고리 매핑(세분류 앵커 + 소분류 폴백) (§6)
  // TODO [4 filter] v1 범위(음료+과자) = 매핑된 카테고리만 유지, 미매핑 제외 (§6)
  // TODO [5 dedup]  식품코드 기준 중복 제거, 최신 데이터생성일자 1건 유지 (§6)
  // TODO [6 stage]  *_staging 테이블에 적재 (§7)
  // TODO [7 gate]   품질 게이트(총건수·gradable율·결측률 임계 검증) (§8)
  // TODO [8 swap]   트랜잭션 원자적 교체 → 운영 테이블 (§7)
  // TODO [9 grade]  grading-spec 산출(lib/grading) → grade_result 채움 (§7)
  // TODO [10 rank]  카테고리별 건강 점수 오름차순 → category_ranking 채움 (§7)
  // TODO [11 report] 데이터 품질 리포트 생성 (§8)
  // TODO [12 agg]   카테고리별 집계 스냅샷(category_agg_snapshot) 적재 → 대시보드 추세용 (§3)
}

main();
