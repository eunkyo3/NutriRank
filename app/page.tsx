// 홈 — mvp-scope-screens.md §3 (라우트 맵), §11 (홈 화면 기본안: 카테고리+검색 진입)
const categories = [
  { id: 'carbonated', label: '탄산음료' },
  { id: 'juice', label: '주스' },
  { id: 'coffee', label: '커피음료' },
  { id: 'snack-chip', label: '스낵/칩' },
  { id: 'chocolate', label: '초콜릿' },
  { id: 'biscuit', label: '비스킷' },
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">NutriRank</h1>
        <p className="mt-2 text-gray-600">
          영양성분표를 해석하지 않고도 음료·과자의 건강성을 등급과 카테고리 순위로 한눈에 확인하세요.
        </p>
        <a
          href="/search"
          className="mt-4 inline-block rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          제품 검색하기
        </a>
      </section>

      <section>
        <h2 className="text-lg font-semibold">카테고리별 순위</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <a
                href={`/rankings/${category.id}`}
                className="block rounded border border-gray-200 px-4 py-3 text-center hover:bg-gray-50"
              >
                {category.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
