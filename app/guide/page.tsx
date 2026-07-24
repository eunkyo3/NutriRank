// 도움말 / 이용 가이드 — 건강 등급 산정 방식 + 화면 보는 법.
// 정적 콘텐츠(사전계산 테이블도 조회하지 않음). CONTEXT.md 용어집 + grading-spec 요약.
import type { Metadata } from 'next'
import { HEALTH_GRADES } from '@/lib/display'
import { GradeBadge } from '@/app/_components/ui'
import { CONSUMER_CATEGORY_SEED } from '@/db/seed'

export const metadata: Metadata = { title: 'NutriRank — 도움말' }

const GRADE_DESC: Record<string, string> = {
  A: '가장 건강',
  B: '',
  C: '보통',
  D: '',
  E: '가장 덜 건강',
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-bold">도움말 · 이용 가이드</h1>
        <p className="mt-2 text-gray-600">
          NutriRank는 음료·과자의 건강성을 영양성분표 해석 없이 <strong>건강 등급(A~E)</strong>과{' '}
          <strong>카테고리 순위</strong>로 한눈에 보여줍니다. 아래에서 등급이 어떻게 매겨지는지와 각 화면을 어떻게 보면 되는지 안내합니다.
        </p>
      </header>

      {/* 등급 스케일 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">건강 등급이란</h2>
        <p className="text-sm text-gray-600">
          A(가장 건강)부터 E(가장 덜 건강)까지 5단계로, 색과 문자를 함께 표시합니다.
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded border border-gray-200 p-4">
          {HEALTH_GRADES.map((g) => (
            <div key={g} className="flex items-center gap-2">
              <GradeBadge grade={g} />
              {GRADE_DESC[g] && <span className="text-xs text-gray-500">{GRADE_DESC[g]}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 산정 방식 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">등급은 어떻게 산정되나요</h2>
        <p className="text-sm text-gray-600">
          유럽 공식 최신판인 <strong>2023 Nutri-Score</strong> 알고리즘을 식약처 공개 영양데이터에 적용해 계산합니다.
          모든 값은 <strong>100g(고형식품) / 100ml(음료) 기준</strong>입니다.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-gray-200 p-4">
            <p className="text-sm font-medium text-red-700">감점 성분 (많을수록 나쁨)</p>
            <p className="mt-1 text-sm text-gray-600">에너지 · 당류 · 포화지방 · 나트륨</p>
          </div>
          <div className="rounded border border-gray-200 p-4">
            <p className="text-sm font-medium text-green-700">가점 성분 (많을수록 좋음)</p>
            <p className="mt-1 text-sm text-gray-600">단백질 · 식이섬유</p>
          </div>
        </div>
        <div className="rounded bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            <strong>건강 점수 = 감점 합계 − 가점 합계</strong> → 점수가 <strong>낮을수록 건강</strong>합니다. 이 점수를
            공식 구간표에 대입해 A~E 등급이 정해집니다. (음료는 별도 컷오프를 쓰며, 물만 A가 될 수 있습니다.)
          </p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            <strong>등급 근거</strong>: 제품 상세에서 “등급에 크게 기여한 성분: 당류(9점), 나트륨(6점)”처럼 어떤 감점
            성분이 점수를 끌어올렸는지 보여줍니다.
          </li>
          <li>
            <strong>미측정 성분</strong>: 감점 4성분(에너지·당류·포화지방·나트륨) 중 하나라도 측정값이 없으면, 임의로 0을
            넣지 않고 <strong>“등급 산출 불가”</strong>로 표시합니다(등급이 부당하게 좋아지는 것을 막기 위함).
          </li>
          <li>
            과일·채소 함량 데이터가 없어 해당 가점은 반영되지 않습니다. 이 때문에 주스류가 실제보다 다소 불리하게 나올 수 있습니다.
          </li>
        </ul>
      </section>

      {/* 등급 쏠림 — "왜 다 E인가요?" 는 이 서비스에서 가장 자주 나오는 질문이다. */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">왜 D·E 등급이 이렇게 많나요?</h2>
        <p className="text-sm text-gray-600">
          실제로 수록 제품의 약 <strong>76%가 D·E</strong>입니다. 오류가 아니라 당연한 결과입니다. Nutri-Score는{' '}
          <strong>모든 가공식품에 같은 절대 기준</strong>을 적용하는데, NutriRank가 다루는 범위는 과자와 음료뿐입니다.
          이 식품군은 설탕·포화지방·나트륨이 많아 애초에 낮은 등급대에 몰립니다. 채소·통곡물까지 포함한 전체 식품에서라면
          A·B가 훨씬 많이 나옵니다.
        </p>
        <div className="rounded bg-gray-50 p-4 text-sm text-gray-700">
          <p>
            그래서 NutriRank는 절대 등급 하나로 끝내지 않고 <strong>같은 카테고리 안에서의 순위</strong>를 함께 보여줍니다.
            “과자를 먹을지 말지”가 아니라 <strong>“어차피 과자를 고른다면 그중 무엇이 나은지”</strong>에 답하기 위해서입니다.
            같은 E등급 안에서도 점수 차이는 크고, 순위는 그 차이를 드러냅니다.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          카테고리마다 쏠림 정도도 다릅니다. <a href="/analytics" className="underline">카테고리 비교</a>에서 어느 묶음이
          더 나쁜지, 그 원인이 당류인지 나트륨인지 확인할 수 있습니다.
        </p>
      </section>

      {/* 미측정 vs 0 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">‘—’ 표시와 ‘0’의 차이</h2>
        <p className="text-sm text-gray-600">
          영양성분표에서 <strong>‘—’ 는 측정되지 않음(미측정)</strong>, <strong>‘0’ 은 실제로 0</strong>임을 뜻합니다.
          둘을 구분해 표시하므로, ‘—’ 를 0으로 오해하지 마세요.
        </p>
      </section>

      {/* 화면 보는 법 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">각 화면 보는 법</h2>
        <div className="space-y-3">
          <GuideRow title="🔎 검색" href="/search">
            제품명으로 찾습니다(부분·유사어 검색 지원). 카테고리·제품유형·건강 등급으로 필터할 수 있고, 없는 제품을
            정확한 이름으로 검색하면 공식 데이터에서 자동으로 가져와 등급까지 매겨 보여줍니다.
          </GuideRow>
          <GuideRow title="📄 제품 상세">
            건강 등급·점수, 등급 근거(기여 성분), 영양성분표(기준량 명시, 미측정은 ‘—’), 그리고 같은 카테고리 안에서의
            순위 위치를 확인합니다.
          </GuideRow>
          <GuideRow title="🏆 카테고리 순위" href="/rankings/carbonated">
            같은 카테고리 제품을 <strong>건강한 순(점수 오름차순)</strong>으로 나열합니다. 위쪽일수록 건강하며, 상단에
            A·B 등급이 모입니다. 등급 칩으로 특정 등급만 추리거나, <strong>덜 건강한 순</strong>으로 뒤집어 최하위부터
            볼 수도 있습니다.
          </GuideRow>
          <GuideRow title="🆚 카테고리 비교" href="/analytics">
            {CONSUMER_CATEGORY_SEED.length}개 카테고리를 평균 건강 점수·D·E 비율·평균 성분으로 나란히 대조합니다. 어느 카테고리가 더 나쁜지, 그 원인이
            무엇인지 한 화면에서 봅니다.
          </GuideRow>
          <GuideRow title="📊 집계 대시보드" href="/analytics/carbonated">
            카테고리 하나를 깊게 봅니다. 등급 분포, 평균(점수·당류·나트륨·포화지방), 당류↔건강 점수 산점도와 상관계수,
            스냅샷 이력을 제공합니다.
          </GuideRow>
        </div>
      </section>

      {/* 면책 / 출처 */}
      <section className="space-y-2 rounded border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-base font-semibold text-amber-900">알아두세요 (면책)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
          <li>
            식약처에는 이와 대응하는 공식 A~E 건강등급 제도가 없습니다. 본 등급은 원천 데이터에 2023 Nutri-Score를 적용한{' '}
            <strong>2차 산출값</strong>이며, 식품의약품안전처의 공식 평가·인증이 아닙니다.
          </li>
          <li>
            데이터 출처: 식품의약품안전처「전국통합식품영양성분정보(가공식품) 표준데이터」(공공데이터포털 15100066).
          </li>
          <li>
            대상 범위: 음료(탄산·주스·커피·차)와 간식(스낵/칩·초콜릿·비스킷·캔디/젤리·아이스크림). 빵·떡·케이크처럼
            식사 대용 성격인 식품군과 조미료·유지류처럼 100g을 그대로 먹지 않는 식품군은 제외됩니다 — 100g 기준
            등급이 실제 섭취량과 동떨어져 오해를 부르기 때문입니다.
          </li>
        </ul>
      </section>
    </div>
  )
}

function GuideRow({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  const heading = href ? (
    <a href={href} className="font-medium hover:underline">
      {title}
    </a>
  ) : (
    <span className="font-medium">{title}</span>
  )
  return (
    <div className="rounded border border-gray-200 p-4">
      <p>{heading}</p>
      <p className="mt-1 text-sm text-gray-600">{children}</p>
    </div>
  )
}
