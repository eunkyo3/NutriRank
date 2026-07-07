// 홈 — mvp-scope-screens.md §3 (라우트 맵), §11 (홈 화면 기본안: 카테고리+검색 진입).
// 카테고리는 시드(폐쇄 목록 6종)를 단일 출처로 사용해 순위 링크 id 불일치를 방지한다.
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'
import { productTypeLabel } from '@/lib/display'

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
          {CONSUMER_CATEGORY_SEED.map((category) => (
            <li key={category.id}>
              <a
                href={`/rankings/${category.id}`}
                className="block rounded border border-gray-200 px-4 py-3 text-center hover:bg-gray-50"
              >
                <span className="font-medium">{category.name}</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {productTypeLabel(category.productType)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
