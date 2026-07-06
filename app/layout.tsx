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
      </body>
    </html>
  )
}
