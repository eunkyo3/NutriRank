// 집계 분석 대시보드 — mvp-scope-screens.md §4.4. 분포·평균·상관·추세.
// 상관은 성분–점수(당류 vs 건강점수), NULL 제외. 추세는 category_agg_snapshot 이력.
import { notFound } from 'next/navigation'
import { tryGetReadDb } from '@/db/client'
import { getCategory, getCategoryAnalytics, type NutrientKey } from '@/db/queries'
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
  const maxCount = Math.max(1, ...analytics.distribution.map((d) => d.count))

  // 4성분 각각의 피어슨 계수. 계수는 표본이 2개 미만이거나 분산이 0이면 null.
  const nutrientStats = analytics.nutrientCorrelations.map((nc) => ({
    key: nc.key,
    label: NUTRIENT_LABEL[nc.key],
    r: pearson(nc.points),
    n: nc.points.length,
  }))
  // 산점도는 당류 하나만 유지한다.
  const sugarsPoints = analytics.nutrientCorrelations.find((nc) => nc.key === 'sugars')?.points ?? []
  // "등급을 깎는 주범"은 원인 성분 3종(당류·나트륨·포화지방) 중 |r| 최대로 짚는다.
  // 에너지는 다른 성분들의 합산 결과라 대부분 카테고리에서 함께 높게 나오므로
  // 주범 판정에서 제외한다(docs/analysis-questions.md H4와 동일 기준) — 표에는 남긴다.
  const dominant = nutrientStats
    .filter((s): s is typeof s & { r: number } => s.r !== null && s.key !== 'energy')
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0] ?? null

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
      <div>
        <p className="text-xs italic text-gray-400">이 화면이 답하는 질문 · 이 카테고리의 등급을 깎는 주범은 무엇인가?</p>
        <h1 className="mt-1 text-2xl font-bold">집계 분석 대시보드: {label}</h1>
      </div>

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

      {/* 상관 — 4성분 각각과 건강 점수의 피어슨 계수 */}
      <section>
        <h2 className="text-lg font-semibold">성분별 상관: 성분 ↔ 건강 점수</h2>
        {dominant ? (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2">성분</th>
                    <th className="py-2 text-right">피어슨 계수</th>
                    <th className="py-2 text-right">표본수</th>
                    <th className="py-2 pl-4">해석</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nutrientStats.map((s) => (
                    <tr key={s.key}>
                      <td className="py-2 font-medium">{s.label}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {s.r === null ? '—' : s.r.toFixed(3)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-500">{s.n}</td>
                      <td className="py-2 pl-4 text-gray-500">
                        {s.r === null ? '표본 부족(2개 미만)' : correlationStrength(s.r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 계수만 두면 청중이 방향을 오독한다. 건강 점수는 낮을수록 건강하므로
                양의 상관은 "많을수록 덜 건강"을 뜻한다. |r|이 가장 큰 성분을 주범으로 짚는다. */}
            <p className="mt-3 text-sm text-gray-600">
              이 카테고리 등급을 깎는 주범은{' '}
              <strong>{dominant.label}</strong>입니다 —{' '}
              {dominantReading(dominant.label, dominant.r)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              양의 계수는 "많을수록 건강 점수가 높아짐(= 덜 건강)"을 뜻합니다. 미측정(NULL)은 성분별로 제외했습니다.
              에너지는 다른 성분들의 합산 결과라 함께 높게 나오므로, 주범 판정은 원인 성분(당류·나트륨·포화지방) 중에서 고릅니다.
            </p>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600">당류 ↔ 건강 점수 산점도</p>
              <CorrelationScatter points={sugarsPoints} />
            </div>
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

// H4 상관표의 성분 라벨. key는 product_nutrient 컬럼(getCategoryAnalytics)과 일치.
const NUTRIENT_LABEL: Record<NutrientKey, string> = {
  sugars: '당류',
  sodium: '나트륨',
  satfat: '포화지방',
  energy: '에너지',
}

// |r| 세기만 한 낱말로. 표의 '해석' 열에 쓴다.
function correlationStrength(r: number): string {
  const a = Math.abs(r)
  const strength = a >= 0.7 ? '강한' : a >= 0.4 ? '뚜렷한' : a >= 0.2 ? '약한' : '뚜렷하지 않은'
  if (a < 0.2) return '선형 관계 뚜렷하지 않음'
  return r > 0 ? `${strength} 양의 상관(많을수록 덜 건강)` : `${strength} 음의 상관(많을수록 더 건강)`
}

// 주범 문장. 건강 점수는 낮을수록 건강(ADR-0003의 단일 점수 축)이므로 양의 상관은
// "많을수록 덜 건강"으로 읽어야 한다 — 방향 오독을 막는 문구를 강제한다.
function dominantReading(label: string, r: number): string {
  const a = Math.abs(r)
  const strength = a >= 0.7 ? '강하게' : a >= 0.4 ? '뚜렷하게' : a >= 0.2 ? '약하게' : '뚜렷하지 않게'
  if (a < 0.2) return `${label}조차 건강 점수와 뚜렷한 선형 관계를 보이지 않아, 이 카테고리는 특정 성분 하나로 등급이 갈리지 않습니다.`
  return r > 0
    ? `${label}이(가) 많을수록 건강 점수가 ${strength} 높아집니다(= 덜 건강해집니다).`
    : `${label}이(가) 많을수록 건강 점수가 ${strength} 낮아집니다(= 더 건강해지는, 통상과 반대 방향).`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
