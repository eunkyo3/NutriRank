// Root layout — mvp-scope-screens.md §3 (라우트 맵), §5 (공통 컴포넌트)
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NutriRank',
}

const navLinks = [
  { href: '/', label: '홈' },
  { href: '/search', label: '검색' },
  { href: '/rankings/carbonated', label: '순위' },
  { href: '/analytics/carbonated', label: '분석' },
  { href: '/guide', label: '도움말' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
            <span className="font-bold">NutriRank</span>
            <ul className="flex gap-4 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        {/* 출처표시(공공데이터포털 이용허락) — 데이터가 쓰이는 화면에 출처를 노출한다. */}
        <footer className="border-t border-gray-200 text-xs text-gray-500">
          <div className="mx-auto max-w-4xl space-y-1 px-4 py-6">
            <p>
              출처: 식품의약품안전처「전국통합식품영양성분정보(가공식품) 표준데이터」·{' '}
              <a
                href="https://www.data.go.kr/data/15100066/standard.do"
                className="underline hover:text-gray-700"
                target="_blank"
                rel="noreferrer"
              >
                공공데이터포털
              </a>
            </p>
            <p>
              건강 등급은 원천 데이터에 2023 Nutri-Score 알고리즘을 적용한 2차 산출값이며, 식약처의 공식 평가가 아닙니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
