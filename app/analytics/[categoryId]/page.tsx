// 집계 분석 대시보드 스텁 — mvp-scope-screens.md §4.4
// TODO: 분포(등급 A~E 개수, 점수 히스토그램) / 평균(건강 점수·당류·나트륨·포화지방) / 상관(성분-점수, NULL 제외) / 추세(category_agg_snapshot 스냅샷 이력)
export default async function CategoryAnalyticsPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  const { categoryId } = await params

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">집계 분석 대시보드: {categoryId}</h1>
      <section>
        <h2 className="text-lg font-semibold">분포</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">평균</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">상관</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">추세</h2>
        <p className="text-gray-600">(category_agg_snapshot 기반, 스텁)</p>
      </section>
    </div>
  )
}
