// 제품 상세 — mvp-scope-screens.md §4.2. 등급 배지/근거, 영양성분표(기준량 명시,
// 미측정 '—'로 0과 구별), 순위 위치. 사전계산 테이블만 조회(ADR-0004).
import { notFound } from 'next/navigation'
import { tryGetReadDb } from '@/db/client'
import { getProductDetail } from '@/db/queries'
import {
  formatNutrient,
  productTypeLabel,
  rankPercentileLabel,
  rationaleEntries,
  referenceAmountLabel,
  ungradableReasons,
} from '@/lib/display'
import { DataPendingNotice, GradeBadge } from '@/app/_components/ui'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ foodCode: string }>
}) {
  const { foodCode } = await params
  const db = tryGetReadDb()
  if (!db) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">제품 상세</h1>
        <DataPendingNotice />
      </div>
    )
  }

  const detail = getProductDetail(db, foodCode)
  if (!detail) notFound()

  const { product, nutrient, grade, categoryName, rank, categoryTotal } = detail
  const gradable = grade?.gradable === 1
  const rationale = rationaleEntries(grade?.rationale ?? null)
  const negatives = rationale.filter((e) => e.kind === 'negative')
  const positives = rationale.filter((e) => e.kind === 'positive')
  const refLabel = referenceAmountLabel(product.productType, product.referenceRaw)
  const percentile = rank !== null ? rankPercentileLabel(rank, categoryTotal) : null

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-sm text-gray-500">
          {product.manufacturer ?? '제조사 미상'} · {productTypeLabel(product.productType)}
          {categoryName && <> · {categoryName}</>}
        </p>
      </header>

      {/* 등급 블록 */}
      <section className="rounded border border-gray-200 p-4">
        {gradable ? (
          <div className="flex items-start gap-4">
            <GradeBadge grade={grade?.healthGrade ?? null} />
            <div className="min-w-0">
              <p className="text-lg font-semibold">건강 등급 {grade?.healthGrade}</p>
              {/* "-1"만 두면 좋은지 나쁜지 읽히지 않는다. 카테고리 내 백분위를 앞세우고
                  원점수는 방향 설명과 함께 보조로 내린다. */}
              {percentile && product.categoryId && (
                <p className="mt-0.5 text-sm text-gray-600">
                  <a href={`/rankings/${product.categoryId}`} className="hover:underline">
                    {categoryName ?? '카테고리'} {categoryTotal.toLocaleString()}개 중{' '}
                    <strong>{rank}위</strong> · {percentile}
                  </a>
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-400">
                건강 점수 {grade?.healthScore} · 낮을수록 건강합니다
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-medium text-gray-700">등급 산출 불가</p>
            <p className="mt-1 text-sm text-gray-500">
              누락된 성분: {ungradableReasons(grade?.ungradableReason ?? null).join(', ') || '알 수 없음'}
            </p>
          </div>
        )}
        {/* 등급 근거: 감점(점수를 끌어올린 성분, 빨강)과 가점(점수를 낮춘 성분, 초록)을
            색으로 구분한다. 도움말의 감점/가점 색 관례(text-red-700 / text-green-700)를 따른다.
            구 형식(감점만) rationale은 negatives만 채워지므로 가점 줄이 그냥 빠진다. */}
        {gradable && (negatives.length > 0 || positives.length > 0) && (
          <div className="mt-3 space-y-1.5 text-sm">
            {negatives.length > 0 && (
              <p>
                <span className="font-medium text-red-700">등급에 크게 기여한 성분</span>
                <span className="text-gray-600">
                  : {negatives.map((e) => `${e.label}(${e.points}점)`).join(', ')}
                </span>
              </p>
            )}
            {positives.length > 0 && (
              <p>
                <span className="font-medium text-green-700">점수를 낮춘 가점 성분</span>
                <span className="text-gray-600">
                  : {positives.map((e) => `${e.label}(${e.points}점)`).join(', ')}
                </span>
              </p>
            )}
          </div>
        )}
      </section>

      {/* 영양성분표 (기준량 명시, 미측정 '—') */}
      <section>
        <h2 className="text-lg font-semibold">영양성분표 <span className="text-sm font-normal text-gray-500">({refLabel})</span></h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <tbody className="divide-y divide-gray-100">
            <NutrientRow label="에너지" value={formatNutrient(nutrient?.energyKcal, 'kcal')} />
            <NutrientRow label="당류" value={formatNutrient(nutrient?.sugarsG, 'g')} />
            <NutrientRow label="포화지방산" value={formatNutrient(nutrient?.satfatG, 'g')} />
            <NutrientRow label="나트륨" value={formatNutrient(nutrient?.sodiumMg, 'mg')} />
            <NutrientRow label="식이섬유" value={formatNutrient(nutrient?.fiberG, 'g')} />
            <NutrientRow label="단백질" value={formatNutrient(nutrient?.proteinG, 'g')} />
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-400">
          — 는 측정되지 않은 성분(미측정)으로, 실제 0과 구별됩니다.
          {product.servingRef && <> · 1회 섭취참고량: {product.servingRef}</>}
        </p>
      </section>

      {/* 순위는 등급 블록에 통합했다(중복 제거). 여기서는 카테고리 비교로 넘어가는 동선만 둔다. */}
      {product.categoryId && (
        <section className="flex flex-wrap gap-2 text-sm">
          <a
            href={`/rankings/${product.categoryId}`}
            className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            {categoryName ?? '이 카테고리'} 순위 전체 보기
          </a>
          <a
            href={`/analytics/${product.categoryId}`}
            className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            이 카테고리 분석 보기
          </a>
        </section>
      )}
    </div>
  )
}

function NutrientRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="py-2 text-left font-normal text-gray-500">{label}</th>
      <td className="py-2 text-right font-medium tabular-nums">{value}</td>
    </tr>
  )
}
