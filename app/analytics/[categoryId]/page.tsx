// 집계 분석 대시보드 — mvp-scope-screens.md §4.4. 분포·평균·상관·추세.
// 상관은 성분–점수(당류 vs 건강점수), NULL 제외. 추세는 category_agg_snapshot 이력.
import { notFound } from 'next/navigation'
import { tryGetReadDb } from '@/db/client'
import { getCategory, getCategoryAnalytics } from '@/db/queries'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { formatNutrient, HEALTH_GRADES } from '@/lib/display'
import { pearson } from '@/lib/stats'
import { DataPendingNotice, EmptyResult } from '@/app/_components/ui'

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
                  <div className="h-4 rounded bg-gray-700" style={{ width: `${(c / maxCount) * 100}%` }} />
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
          <p className="mt-2 text-sm text-gray-600">
            피어슨 상관계수 <span className="font-semibold tabular-nums">{correlation.toFixed(3)}</span>{' '}
            <span className="text-gray-400">(표본 {analytics.correlationPoints.length}개, 미측정 제외)</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500">상관을 계산할 표본이 부족합니다(미측정 제외 2개 미만).</p>
        )}
      </section>

      {/* 추세 */}
      <section>
        <h2 className="text-lg font-semibold">추세 (스냅샷 이력)</h2>
        {analytics.trend.length >= 2 ? (
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
        ) : (
          <p className="mt-2 text-sm text-gray-500">추세를 그리려면 2개 이상의 스냅샷이 필요합니다(현재 {analytics.trend.length}개).</p>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
