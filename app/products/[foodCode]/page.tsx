// 제품 상세 — mvp-scope-screens.md §4.2. 등급 배지/근거, 영양성분표(기준량 명시,
// 미측정 '—'로 0과 구별), 순위 위치. 사전계산 테이블만 조회(ADR-0004).
import { notFound } from 'next/navigation'
import { tryGetReadDb } from '@/db/client'
import { getProductDetail } from '@/db/queries'
import {
  formatNutrient,
  productTypeLabel,
  rationaleToPhrase,
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
  const rationale = rationaleToPhrase(grade?.rationale ?? null)
  const refLabel = referenceAmountLabel(product.productType)

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
          <div className="flex items-center gap-4">
            <GradeBadge grade={grade?.healthGrade ?? null} />
            <div>
              <p className="text-sm text-gray-500">건강 점수</p>
              <p className="text-lg font-semibold">{grade?.healthScore}</p>
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
        {gradable && rationale && <p className="mt-3 text-sm text-gray-600">{rationale}</p>}
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

      {/* 순위 위치 */}
      {rank !== null && product.categoryId && (
        <section>
          <h2 className="text-lg font-semibold">카테고리 순위</h2>
          <p className="mt-1 text-sm text-gray-600">
            {categoryName ?? product.categoryId} 중{' '}
            <a href={`/rankings/${product.categoryId}`} className="font-semibold underline">
              {rank} / {categoryTotal}위
            </a>
          </p>
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
