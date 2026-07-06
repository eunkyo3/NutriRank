// 카테고리 순위 스텁 — mvp-scope-screens.md §4.3
// TODO: category_ranking을 건강 점수 오름차순(건강한 순, ADR-0003)으로 렌더, gradable=1만 포함, 카테고리 전환/페이지네이션
export default async function CategoryRankingPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">카테고리 순위: {categoryId}</h1>
      <p className="text-gray-600">
        이 카테고리의 제품이 건강 점수 오름차순(건강한 순)으로 표시됩니다. (스텁)
      </p>
    </div>
  )
}
