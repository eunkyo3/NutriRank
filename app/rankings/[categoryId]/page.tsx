// 카테고리 순위 — mvp-scope-screens.md §4.3. category_ranking을 건강 점수
// 오름차순(건강한 순, ADR-0003)으로 렌더. gradable=1만 포함(쿼리에서 보장).
import { notFound } from 'next/navigation'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { getCategory, getCategoryRankings, getCategoryScoreRange } from '@/db/queries'
import { tryGetReadDb } from '@/db/client'
import { DataPendingNotice, EmptyResult, GradeBadge } from '@/app/_components/ui'
import { formatNutrient, HEALTH_GRADES } from '@/lib/display'

const KNOWN_IDS = new Set<string>(CONSUMER_CATEGORY_SEED.map((c) => c.id))

const PAGE_SIZE = 50

export default async function CategoryRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>
  searchParams: Promise<{ page?: string; grade?: string; order?: string }>
}) {
  const { categoryId } = await params
  if (!KNOWN_IDS.has(categoryId)) notFound()

  const sp = await searchParams
  const pageParam = Number.parseInt(sp.page ?? '1', 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const grade = HEALTH_GRADES.includes(sp.grade as (typeof HEALTH_GRADES)[number]) ? sp.grade : undefined
  const order: 'asc' | 'desc' = sp.order === 'desc' ? 'desc' : 'asc'

  const db = tryGetReadDb()
  const category = db ? getCategory(db, categoryId) : null
  const ranking = db
    ? getCategoryRankings(db, categoryId, {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        grade,
        order,
      })
    : null
  const label = category?.name ?? CONSUMER_CATEGORY_SEED.find((c) => c.id === categoryId)?.name ?? categoryId
  const totalPages = ranking ? Math.max(1, Math.ceil(ranking.total / PAGE_SIZE)) : 1
  // 카테고리 전체(필터 무관) 점수 범위 — 같은 카테고리 안에서도 선택에 따라 격차가
  // 크다는 서비스 존재 이유(H3)를 상단 한 줄로 정당화한다.
  const scoreRange = db ? getCategoryScoreRange(db, categoryId) : null

  // 필터를 유지한 채 페이지만 바꾸기 위한 링크 빌더.
  const href = (next: { page?: number; grade?: string | null; order?: string | null }) => {
    const qs = new URLSearchParams()
    const g = next.grade === null ? undefined : (next.grade ?? grade)
    const o = next.order === null ? undefined : (next.order ?? (order === 'desc' ? 'desc' : undefined))
    if (g) qs.set('grade', g)
    if (o) qs.set('order', o)
    if (next.page && next.page > 1) qs.set('page', String(next.page))
    const s = qs.toString()
    return `/rankings/${categoryId}${s ? `?${s}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs italic text-gray-400">이 화면이 답하는 질문 · 같은 카테고리 안에서 선택은 얼마나 중요한가?</p>
        <h1 className="mt-1 text-2xl font-bold">카테고리 순위: {label}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {order === 'desc'
            ? '가장 덜 건강한 제품부터 봅니다. 건강 점수가 높을수록 덜 건강합니다.'
            : '건강 점수가 낮을수록(건강할수록) 상위입니다.'}
        </p>
        {scoreRange && scoreRange.min !== scoreRange.max && (
          <p className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            이 카테고리의 점수 범위는{' '}
            <strong className="tabular-nums">
              {formatNutrient(scoreRange.min)} ~ {formatNutrient(scoreRange.max)}
            </strong>{' '}
            — 무엇을 고르느냐에 따라 이만큼 달라집니다. 같은 카테고리 안에서도 제품 선택만으로 더 건강해질 수 있습니다.
          </p>
        )}
      </div>

      <CategorySwitcher activeId={categoryId} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">등급</span>
        <FilterChip href={href({ grade: null, page: 1 })} active={!grade} label="전체" />
        {HEALTH_GRADES.map((g) => (
          <FilterChip key={g} href={href({ grade: g, page: 1 })} active={grade === g} label={g} />
        ))}
        <span className="ml-2 text-xs text-gray-400">정렬</span>
        <FilterChip href={href({ order: null, page: 1 })} active={order === 'asc'} label="건강한 순" />
        <FilterChip href={href({ order: 'desc', page: 1 })} active={order === 'desc'} label="덜 건강한 순" />
      </div>

      {!db ? (
        <DataPendingNotice />
      ) : !ranking || ranking.rows.length === 0 ? (
        <EmptyResult
          message={
            grade
              ? `이 카테고리에 ${grade}등급 제품이 없습니다.`
              : '이 카테고리에 순위 데이터가 아직 없습니다.'
          }
        />
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
                <a href={href({ page: page - 1 })} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                  ← 이전
                </a>
              ) : (
                <span className="rounded border border-gray-100 px-3 py-1 text-gray-300">← 이전</span>
              )}
              <span className="text-gray-500">{page} / {totalPages}</span>
              {page < totalPages ? (
                <a href={href({ page: page + 1 })} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
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

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`inline-block rounded-full border px-3 py-1 text-sm ${
        active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </a>
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
