# Docker 단일 이미지 배포 + better-sqlite3/Drizzle 스택

ADR-0004의 "Next.js 풀스택 + 단일 SQLite + 사전계산 배치"를 구현 스택으로 구체화한다. 배포는 **호스트 비종속 Docker 단일 이미지 + 볼륨 SQLite**로 하고, 앱은 SQLite를 읽기 전용으로, 배치는 쓰기로 연결하며 WAL로 동시성을 확보한다. DB 접근은 **better-sqlite3(동기·고속 읽기) + Drizzle ORM(타입 안전·마이그레이션)**, 언어는 TypeScript(strict)/Next.js App Router, 테스트는 Vitest + Playwright, 스타일은 Tailwind로 정한다. 데이터가 정적이고 조회는 사전계산 값 읽기 중심이라, 동기식 임베디드 SQLite와 얇은 ORM이 가장 단순하고 빠르며, 특정 PaaS에 묶이지 않는 Docker 배포가 운영을 단순하게 하기 때문이다.

## Considered Options

- **배포: Vercel + 읽기전용 SQLite 에셋** — 서버리스 친화적이나 데이터 갱신마다 재배포 필요, 쓰기 배치와 궁합이 약함
- **배포: Turso/libSQL 호스티드** — 분산·서버리스 호환이나 별도 서비스 의존·계정 필요
- **ORM: Prisma** — 성숙하나 무겁고 사전계산 읽기 중심엔 과함
- **ORM 없이 raw better-sqlite3** — 최소 의존이나 스키마 마이그레이션·타입 안전을 직접 관리해야 함

## 미확정 (후속 결정)

패키지 매니저(pnpm 잠정), 배치 스케줄 방식(호스트 cron vs compose 사이드카), ORM 채택 최종 확정은 `.omc/plans/tech-stack.md`의 열린 결정으로 남아 있다.
