// 집계 분석 대시보드 — mvp-scope-screens.md §4.4. 분포·평균·상관·추세.
// 상관은 성분–점수(당류 vs 건강점수), NULL 제외. 추세는 category_agg_snapshot 이력.
import { notFound } from 'next/navigation'
import { tryGetReadDb } from '@/db/client'
import { getCategory, getCategoryAnalytics } from '@/db/queries'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { formatNutrient, gradeBarClass, HEALTH_GRADES } from '@/lib/display'
import { pearson } from '@/lib/stats'
import { DataPendingNotice, EmptyResult } from '@/app/_components/ui'
import { CorrelationScatter } from './scatter'

const KNOWN_IDS = new Set<string>(CONSUMER_CATEGORY_SEED.map((c) => c.id))

export default async function CategoryAnalyticsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params
  if (!KNOWN_IDS.has(categoryId)) notFound()

  const db = tryGetReadDb()
  const label =
    (db ? getCategory(db, categoryId)?.name : null) ??
    CONSUMER_CATEGORY_SEED.find((c) => c.id === categoryId)?.name ??
    categoryId

  if (!db) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">집계 분석 대시보드: {label}</h1>
        <DataPendingNotice />
      </div>
    )
  }

  const analytics = getCategoryAnalytics(db, categoryId)
  const latest = analytics.trend[0] ?? null
  const distByGrade = Object.fromEntries(analytics.distribution.map((d) => [d.grade, d.count]))
  const correlation = pearson(analytics.correlationPoints)
  const maxCount = Math.max(1, ...analytics.distribution.map((d) => d.count))

  if (analytics.gradableCount === 0 && analytics.trend.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">집계 분석 대시보드: {label}</h1>
        <EmptyResult message="이 카테고리의 집계 데이터가 아직 없습니다." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">집계 분석 대시보드: {label}</h1>

      {/* 분포 */}
      <section>
        <h2 className="text-lg font-semibold">등급 분포</h2>
        <div className="mt-3 space-y-1">
          {HEALTH_GRADES.map((g) => {
            const c = distByGrade[g] ?? 0
            return (
              <div key={g} className="flex items-center gap-3 text-sm">
                <span className="w-5 font-bold">{g}</span>
                <div className="h-4 flex-1 rounded bg-gray-100">
                  <div
                    className={`h-4 rounded ${gradeBarClass(g)}`}
                    style={{ width: `${(c / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-gray-500">{c}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-gray-400">등급 산출 제품 {analytics.gradableCount}개 기준</p>
      </section>

      {/* 평균 (최신 스냅샷) */}
      <section>
        <h2 className="text-lg font-semibold">
          평균
          {latest && <span className="ml-2 text-sm font-normal text-gray-400">({latest.snapshotDate} 스냅샷 기준)</span>}
        </h2>
        {latest ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="평균 건강 점수" value={formatNutrient(latest.avgHealthScore)} />
            <Stat label="평균 당류" value={formatNutrient(latest.avgSugarsG, 'g')} />
            <Stat label="평균 나트륨" value={formatNutrient(latest.avgSodiumMg, 'mg')} />
            <Stat label="평균 포화지방" value={formatNutrient(latest.avgSatfatG, 'g')} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-gray-500">집계 스냅샷이 아직 없습니다.</p>
        )}
      </section>

      {/* 상관 */}
      <section>
        <h2 className="text-lg font-semibold">상관: 당류 ↔ 건강 점수</h2>
        {correlation !== null ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              피어슨 상관계수 <span className="font-semibold tabular-nums">{correlation.toFixed(3)}</span>{' '}
              <span className="text-gray-400">(표본 {analytics.correlationPoints.length}개, 미측정 제외)</span>
            </p>
            {/* 계수만 두면 청중이 방향을 오독한다. 건강 점수는 낮을수록 건강하므로
                양의 상관은 "당류가 많을수록 덜 건강"을 뜻한다. */}
            <p className="mt-1 text-sm text-gray-500">{correlationReading(correlation)}</p>
            <CorrelationScatter points={analytics.correlationPoints} />
          </>
        ) : (
          <p className="mt-2 text-sm text-gray-500">상관을 계산할 표본이 부족합니다(미측정 제외 2개 미만).</p>
        )}
      </section>

      {/* 추세 */}
      <section>
        <h2 className="text-lg font-semibold">추세 (스냅샷 이력)</h2>
        {analytics.trend.length >= 2 ? (
          <>
            {incomparableSnapshots(analytics.trend) && (
              <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                스냅샷 간 제품 수 차이가 커서 평균을 시계열로 비교할 수 없습니다. 아래 표는 시장의 변화가
                아니라 <strong>적재 진행 상황</strong>을 보여줍니다. 원천 데이터가 월 단위로 갱신되므로
                의미 있는 추세는 서로 다른 갱신월의 스냅샷을 모아야 나타납니다.
              </p>
            )}
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">일자</th>
                  <th className="py-1 text-right">제품수</th>
                  <th className="py-1 text-right">평균 점수</th>
                  <th className="py-1 text-right">평균 당류</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.trend.map((t) => (
                  <tr key={t.snapshotDate}>
                    <td className="py-1">{t.snapshotDate}</td>
                    <td className="py-1 text-right tabular-nums">{t.productCount ?? '—'}</td>
                    <td className="py-1 text-right tabular-nums">{formatNutrient(t.avgHealthScore)}</td>
                    <td className="py-1 text-right tabular-nums">{formatNutrient(t.avgSugarsG, 'g')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="mt-2 text-sm text-gray-500">추세를 그리려면 2개 이상의 스냅샷이 필요합니다(현재 {analytics.trend.length}개).</p>
        )}
      </section>
    </div>
  )
}

// 적재가 진행 중이면 스냅샷마다 표본이 크게 달라져 평균 비교가 성립하지 않는다.
// 최대/최소 제품 수가 2배를 넘으면 시계열로 읽지 말라고 경고한다.
function incomparableSnapshots(trend: { productCount: number | null }[]): boolean {
  const counts = trend.map((t) => t.productCount).filter((c): c is number => c != null && c > 0)
  if (counts.length < 2) return false
  return Math.max(...counts) > Math.min(...counts) * 2
}

// 상관계수를 방향·세기로 풀어 쓴다. 건강 점수는 낮을수록 건강(ADR-0003의 단일 점수 축)
// 이므로 당류와의 양의 상관은 "당류가 많을수록 덜 건강"으로 읽어야 한다.
function correlationReading(r: number): string {
  const strength = Math.abs(r) >= 0.7 ? '강한' : Math.abs(r) >= 0.4 ? '뚜렷한' : Math.abs(r) >= 0.2 ? '약한' : '뚜렷하지 않은'
  if (Math.abs(r) < 0.2) return '당류와 건강 점수 사이에 뚜렷한 선형 관계가 나타나지 않습니다.'
  return r > 0
    ? `당류가 많을수록 건강 점수가 높아지는(= 덜 건강한) ${strength} 경향입니다.`
    : `당류가 많을수록 건강 점수가 낮아지는(= 더 건강한) ${strength} 경향으로, 통상적인 방향과 반대입니다.`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
