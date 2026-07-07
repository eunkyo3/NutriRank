// 검색 결과 — mvp-scope-screens.md §4.1. 제품명 부분일치(q) + 소비자 카테고리 /
// 제품유형 / 건강 등급 필터. 결과 카드에 등급 배지·카테고리. 사전계산 테이블만 조회.
import { tryGetReadDb } from '@/db/client'
import { searchProducts, type ProductCard } from '@/db/queries'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { HEALTH_GRADES } from '@/lib/display'
import { DataPendingNotice, EmptyResult, GradeBadge } from '@/app/_components/ui'

type SearchParams = { q?: string; category?: string; type?: string; grade?: string }

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = first(sp.q)?.trim() || undefined
  const category = first(sp.category) || undefined
  const type = first(sp.type)
  const grade = first(sp.grade) || undefined
  const productType = type === 'beverage' || type === 'solid' ? type : undefined

  const db = tryGetReadDb()
  const hasQuery = Boolean(q || category || productType || grade)
  const results: ProductCard[] | null = db && hasQuery ? searchProducts(db, { q, categoryId: category, productType, grade }) : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">검색</h1>

      {/* 필터 폼 (GET) */}
      <form className="grid gap-3 rounded border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4">
          <span className="text-gray-500">제품명</span>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="예: 콜라"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <Select name="category" label="카테고리" value={category} options={CONSUMER_CATEGORY_SEED.map((c) => ({ value: c.id, label: c.name }))} />
        <Select name="type" label="제품유형" value={type} options={[{ value: 'beverage', label: '음료' }, { value: 'solid', label: '고형식품' }]} />
        <Select name="grade" label="건강 등급" value={grade} options={HEALTH_GRADES.map((g) => ({ value: g, label: g }))} />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 lg:self-end">
          검색
        </button>
      </form>

      {!db ? (
        <DataPendingNotice />
      ) : !hasQuery ? (
        <EmptyResult message="검색어나 필터를 입력하세요." />
      ) : results && results.length === 0 ? (
        <EmptyResult message="조건에 맞는 제품이 없습니다." />
      ) : (
        <ul className="space-y-2">
          {results?.map((p) => (
            <li key={p.foodCode}>
              <a
                href={`/products/${encodeURIComponent(p.foodCode)}`}
                className="flex items-center gap-4 rounded border border-gray-200 px-4 py-3 hover:bg-gray-50"
              >
                <GradeBadge grade={p.gradable ? p.healthGrade : null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {p.manufacturer ?? '제조사 미상'}
                    {p.categoryName && <> · {p.categoryName}</>}
                  </p>
                </div>
                {!p.gradable && <span className="shrink-0 text-xs text-gray-400">등급 미산출</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string
  label: string
  value: string | undefined
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <select name={name} defaultValue={value ?? ''} className="rounded border border-gray-300 px-3 py-2">
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
