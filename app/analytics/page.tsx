// 카테고리 비교 (분석 인덱스). 개별 카테고리 대시보드(/analytics/[categoryId])가
// "이 카테고리 안"을 보여준다면, 여기는 "카테고리끼리" 비교한다 — 어느 묶음이 더
// 나쁜지, 그 원인이 당류인지 나트륨인지까지 한 화면에서 대조한다.
// 사전계산된 category_agg_snapshot만 읽는다(ADR-0004).
import { tryGetReadDb } from '@/db/client'
import { getCategoryComparison } from '@/db/queries'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { DataPendingNotice, EmptyResult, GradeDistributionBar } from '@/app/_components/ui'
import { formatNutrient, productTypeLabel } from '@/lib/display'
import { CategoryComparisonChart } from './comparison-chart'

// 시드 id는 리터럴 유니온이라 그대로 Map을 만들면 DB에서 온 string으로 조회할 수 없다.
const SEED_BY_ID = new Map<string, (typeof CONSUMER_CATEGORY_SEED)[number]>(
  CONSUMER_CATEGORY_SEED.map((c) => [c.id, c]),
)

// 홈과 같은 이유로 프리렌더 금지 — 빌드 시점에 DB가 없으면 빈 화면이 굳는다.
export const dynamic = 'force-dynamic'

export default function CategoryComparisonPage() {
  const db = tryGetReadDb()
  if (!db) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">카테고리 비교</h1>
        <DataPendingNotice />
      </div>
    )
  }

  const rows = getCategoryComparison(db)
    .filter((r) => SEED_BY_ID.has(r.categoryId))
    // 덜 건강한 카테고리를 위로 — 발표에서 결론이 먼저 보이게.
    .sort((a, b) => (b.avgHealthScore ?? -Infinity) - (a.avgHealthScore ?? -Infinity))

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">카테고리 비교</h1>
        <EmptyResult message="집계 스냅샷이 아직 없습니다. 데이터 파이프라인을 실행하면 표시됩니다." />
      </div>
    )
  }

  const label = (id: string) => SEED_BY_ID.get(id)?.name ?? id
  const chartData = rows
    .filter((r) => r.avgHealthScore !== null)
    .map((r) => ({
      name: label(r.categoryId),
      avgHealthScore: r.avgHealthScore as number,
      worstShare: r.worstShare,
    }))

  const worst = rows[0]
  const best = rows[rows.length - 1]
  const snapshotDates = [...new Set(rows.map((r) => r.snapshotDate))].sort()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">카테고리 비교</h1>
        <p className="mt-1 text-sm text-gray-500">
          소비자 카테고리 {rows.length}종을 평균 건강 점수로 비교합니다. 점수는 낮을수록 건강합니다.
        </p>
      </div>

      {worst.avgHealthScore !== null && best.avgHealthScore !== null && (
        <p className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          평균적으로 가장 덜 건강한 카테고리는 <strong>{label(worst.categoryId)}</strong>
          (평균 {formatNutrient(worst.avgHealthScore)}점
          {worst.worstShare !== null && `, D·E ${worst.worstShare.toFixed(1)}%`}), 가장 나은 쪽은{' '}
          <strong>{label(best.categoryId)}</strong>
          (평균 {formatNutrient(best.avgHealthScore)}점
          {best.worstShare !== null && `, D·E ${best.worstShare.toFixed(1)}%`})입니다.
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold">평균 건강 점수</h2>
        <CategoryComparisonChart data={chartData} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">지표별 대조</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">카테고리</th>
                <th className="py-2 text-right">제품수</th>
                <th className="py-2 text-right">평균 점수</th>
                <th className="py-2 text-right">D·E 비율</th>
                <th className="py-2 text-right">평균 당류</th>
                <th className="py-2 text-right">평균 나트륨</th>
                <th className="py-2 text-right">평균 포화지방</th>
                <th className="py-2 pl-4">등급 구성</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.categoryId}>
                  <td className="py-2">
                    <a href={`/analytics/${r.categoryId}`} className="font-medium hover:underline">
                      {label(r.categoryId)}
                    </a>
                    <span className="ml-2 text-xs text-gray-400">
                      {productTypeLabel(SEED_BY_ID.get(r.categoryId)?.productType)}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {r.productCount?.toLocaleString() ?? '—'}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {formatNutrient(r.avgHealthScore)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {r.worstShare === null ? '—' : `${r.worstShare.toFixed(1)}%`}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatNutrient(r.avgSugarsG, 'g')}</td>
                  <td className="py-2 text-right tabular-nums">{formatNutrient(r.avgSodiumMg, 'mg')}</td>
                  <td className="py-2 text-right tabular-nums">{formatNutrient(r.avgSatfatG, 'g')}</td>
                  <td className="py-2 pl-4">
                    <GradeDistributionBar counts={r.distribution} className="w-32" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          기준 스냅샷: {snapshotDates.join(', ')}. 기준량은 음료 100ml·고형식품 100g이라 제품유형이 다른
          카테고리 간 성분 수치는 직접 비교하지 말고 같은 유형끼리 보세요.
        </p>
      </section>
    </div>
  )
}
