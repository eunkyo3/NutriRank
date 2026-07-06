// 제품 상세 스텁 — mvp-scope-screens.md §4.2
// TODO: 등급 배지/등급 근거, 영양성분표(기준량 명시), 순위 위치. 미측정 성분은 '—'로 표기(0과 구별, CONTEXT 미측정).
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ foodCode: string }>
}) {
  const { foodCode } = await params

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">제품 상세: {foodCode}</h1>
      <section>
        <h2 className="text-lg font-semibold">등급 배지 / 건강 점수</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">등급 근거</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">영양성분표</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">카테고리 순위 위치</h2>
        <p className="text-gray-600">(스텁)</p>
      </section>
    </div>
  )
}
