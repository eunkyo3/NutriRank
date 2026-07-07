// 카테고리 순위 — mvp-scope-screens.md §4.3. category_ranking을 건강 점수
// 오름차순(건강한 순, ADR-0003)으로 렌더. gradable=1만 포함(쿼리에서 보장).
import { notFound } from 'next/navigation'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { getCategory, getCategoryRankings } from '@/db/queries'
import { tryGetReadDb } from '@/db/client'
import { DataPendingNotice, EmptyResult, GradeBadge } from '@/app/_components/ui'

const KNOWN_IDS = new Set<string>(CONSUMER_CATEGORY_SEED.map((c) => c.id))

const PAGE_SIZE = 50

export default async function CategoryRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { categoryId } = await params
  if (!KNOWN_IDS.has(categoryId)) notFound()

  const pageParam = Number.parseInt((await searchParams).page ?? '1', 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const db = tryGetReadDb()
  const category = db ? getCategory(db, categoryId) : null
  const ranking = db
    ? getCategoryRankings(db, categoryId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
    : null
  const label = category?.name ?? CONSUMER_CATEGORY_SEED.find((c) => c.id === categoryId)?.name ?? categoryId
  const totalPages = ranking ? Math.max(1, Math.ceil(ranking.total / PAGE_SIZE)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">카테고리 순위: {label}</h1>
        <p className="mt-1 text-sm text-gray-500">건강 점수가 낮을수록(건강할수록) 상위입니다.</p>
      </div>

      <CategorySwitcher activeId={categoryId} />

      {!db ? (
        <DataPendingNotice />
      ) : !ranking || ranking.rows.length === 0 ? (
        <EmptyResult message="이 카테고리에 순위 데이터가 아직 없습니다." />
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-500">
            총 {ranking.total}개 제품 · {page} / {totalPages} 페이지
          </p>
          <ol className="divide-y divide-gray-100 rounded border border-gray-200">
            {ranking.rows.map((r) => (
              <li key={r.foodCode} className="flex items-center gap-4 px-4 py-3">
                <span className="w-8 shrink-0 text-right font-mono text-sm text-gray-500">{r.rank}</span>
                <GradeBadge grade={r.healthGrade} />
                <div className="min-w-0 flex-1">
                  <a href={`/products/${encodeURIComponent(r.foodCode)}`} className="truncate font-medium hover:underline">
                    {r.name}
                  </a>
                  {r.manufacturer && <span className="ml-2 text-xs text-gray-400">{r.manufacturer}</span>}
                </div>
                <span className="shrink-0 text-sm text-gray-500">점수 {r.healthScore}</span>
              </li>
            ))}
          </ol>
          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? (
                <a href={`/rankings/${categoryId}?page=${page - 1}`} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                  ← 이전
                </a>
              ) : (
                <span className="rounded border border-gray-100 px-3 py-1 text-gray-300">← 이전</span>
              )}
              <span className="text-gray-500">{page} / {totalPages}</span>
              {page < totalPages ? (
                <a href={`/rankings/${categoryId}?page=${page + 1}`} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                  다음 →
                </a>
              ) : (
                <span className="rounded border border-gray-100 px-3 py-1 text-gray-300">다음 →</span>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  )
}

function CategorySwitcher({ activeId }: { activeId: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {CONSUMER_CATEGORY_SEED.map((c) => (
        <li key={c.id}>
          <a
            href={`/rankings/${c.id}`}
            className={`inline-block rounded-full border px-3 py-1 text-sm ${
              c.id === activeId
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.name}
          </a>
        </li>
      ))}
    </ul>
  )
}
