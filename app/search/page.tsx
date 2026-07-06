// 검색 결과 스텁 — mvp-scope-screens.md §4.1
// TODO: 제품명 부분일치(q) + 소비자 카테고리 / 제품유형 / 건강 등급(A~E) 필터, 결과 카드(§4.1), 빈 결과/로딩/에러 상태
export default function SearchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">검색 결과</h1>
      <p className="text-gray-600">
        제품명 검색과 소비자 카테고리 / 제품유형 / 건강 등급 필터가 이곳에 표시됩니다. (스텁)
      </p>
    </div>
  )
}
