// 홈 — mvp-scope-screens.md §3 (라우트 맵), §11 (홈 화면 기본안: 카테고리+검색 진입).
// 카테고리는 시드(폐쇄 목록 6종)를 단일 출처로 사용해 순위 링크 id 불일치를 방지한다.
// 적재 규모와 전체 등급 구성을 먼저 보여줘, 이 서비스가 무엇을 근거로 판정하는지와
// "과자·음료는 애초에 D·E에 몰린다"는 사실을 첫 화면에서 드러낸다.
import { tryGetReadDb } from '@/db/client'
import { getOverviewStats } from '@/db/queries'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { GradeDistributionBar } from '@/app/_components/ui'
import { gradeBarClass, HEALTH_GRADES, productTypeLabel } from '@/lib/display'

// DB를 읽는 화면이므로 빌드 시점 프리렌더를 금지한다. Docker 빌드 단계에는 /data
// 볼륨이 없어 tryGetReadDb()가 null이고, 정적으로 굳으면 "데이터 준비 중" 화면이
// 이미지에 박제된다. 동적 라우트 세그먼트가 있는 다른 화면들은 자동으로 ƒ지만
// 여기는 세그먼트가 없어 명시가 필요하다.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  const db = tryGetReadDb()
  const stats = db ? getOverviewStats(db) : null
  const distCounts = Object.fromEntries((stats?.distribution ?? []).map((d) => [d.grade, d.count]))
  const worstShare =
    stats && stats.gradableCount > 0
      ? (((distCounts.D ?? 0) + (distCounts.E ?? 0)) / stats.gradableCount) * 100
      : null

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">
          영양성분표를 읽지 않아도
          <br />
          <span className="text-gray-500">건강한 과자·음료를 고를 수 있게</span>
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          식약처 공개 데이터에 2023 Nutri-Score를 적용해 제품마다 <strong>A~E 건강 등급</strong>을 매기고,
          같은 카테고리 안에서 <strong>몇 위인지</strong>까지 보여줍니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="/search"
            className="inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            제품 검색하기
          </a>
          <a
            href="/guide"
            className="inline-block rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            등급은 어떻게 매기나요?
          </a>
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="수록 제품" value={stats.totalProducts.toLocaleString()} unit="개" />
          <Stat label="등급 산출 완료" value={stats.gradableCount.toLocaleString()} unit="개" />
          <Stat label="소비자 카테고리" value={String(CONSUMER_CATEGORY_SEED.length)} unit="종" />
        </section>
      )}

      {stats && stats.gradableCount > 0 && (
        <section>
          <h2 className="text-lg font-semibold">전체 등급 분포</h2>
          <GradeDistributionBar counts={distCounts} className="mt-3 h-4" />
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
            {HEALTH_GRADES.map((g) => (
              <li key={g} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${gradeBarClass(g)}`} />
                <span className="font-medium">{g}</span>
                <span className="tabular-nums text-gray-400">
                  {(distCounts[g] ?? 0).toLocaleString()}개
                </span>
              </li>
            ))}
          </ul>
          {worstShare !== null && (
            <p className="mt-3 text-sm text-gray-500">
              전체의 <strong className="text-gray-700">{worstShare.toFixed(1)}%</strong>가 D·E 등급입니다.
              과자·음료는 원래 이 구간에 몰리기 때문에, NutriRank는 절대 등급만이 아니라{' '}
              <strong className="text-gray-700">같은 카테고리 안에서의 순위</strong>로 더 나은 선택지를 찾게 합니다.
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">카테고리별 순위</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {CONSUMER_CATEGORY_SEED.map((category) => {
            const counts = stats?.byCategory[category.id] ?? {}
            const total = HEALTH_GRADES.reduce((s, g) => s + (counts[g] ?? 0), 0)
            return (
              <li key={category.id}>
                <a
                  href={`/rankings/${category.id}`}
                  className="block rounded border border-gray-200 px-4 py-3 hover:border-gray-400 hover:bg-gray-50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-xs text-gray-400">
                      {productTypeLabel(category.productType)}
                      {total > 0 && ` · ${total.toLocaleString()}개`}
                    </span>
                  </div>
                  <GradeDistributionBar counts={counts} className="mt-2" />
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <dl className="rounded border border-gray-200 p-4">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-gray-400">{unit}</span>
      </dd>
    </dl>
  )
}
