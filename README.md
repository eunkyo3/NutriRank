# NutriRank

영양성분표를 해석하지 않고도 음료·과자의 건강성을 **건강 등급(A~E)**과 **카테고리 순위**로 한눈에 확인하게 해 주는 서비스입니다.

식약처 공개 데이터를 적재·정규화하고 건강 점수·등급·순위를 미리 계산해 두어, 사용자는 특정 상품이 같은 카테고리 안에서 얼마나 건강한지를 즉시 볼 수 있습니다.

## 핵심 개념

| 용어 | 의미 |
|---|---|
| **건강 등급** | 제품의 영양 건강성을 A~E로 나타낸 절대 지표 (모든 제품에 동일 기준) |
| **건강 점수** | 등급의 바탕이 되는 연속 수치. 등급과 순위가 공유하는 단일 평가 축 |
| **카테고리 순위** | 같은 소비자 카테고리 제품들을 건강 점수로 정렬한 순서 |
| **제품유형** | 음료(기준량 100ml) / 고형식품(기준량 100g) — 등급 산출 방식이 갈림 |

전체 도메인 용어집은 [`CONTEXT.md`](./CONTEXT.md)를 참고하세요.

## 주요 기능 (v1 계획)

- **검색** — 제품명 + 카테고리·제품유형·등급 필터
- **제품 상세** — 건강 등급·점수, 등급 근거(기여 영양소), 영양성분표, 카테고리 내 순위
- **카테고리 순위** — 소비자 카테고리별 건강 점수 순 목록
- **집계 분석 대시보드** — 카테고리 단위 분포·평균·상관·추세

## 기술 스택

- **Next.js 15** (App Router) · **TypeScript** (strict)
- **SQLite** + **Drizzle ORM** + **better-sqlite3** (WAL — 앱은 읽기 전용, 배치는 단일 라이터)
- 사전계산 배치 파이프라인 (조회 시 실시간 계산 없음)
- **Tailwind CSS**
- **Vitest** (단위) + **Playwright** (e2e)
- **Docker** (호스트 비종속 단일 이미지 + 볼륨 SQLite)
- 패키지 매니저: **pnpm**

아키텍처 결정 배경은 [`docs/adr/`](./docs/adr/)의 ADR 문서들을 참고하세요.

## 데이터 출처

식품의약품안전처 「전국통합식품영양성분정보(가공식품) 표준데이터」
(공공데이터포털 데이터셋 [15100066](https://www.data.go.kr/data/15100066/standard.do))

## 프로젝트 구조

```
app/              App Router 화면 (검색·상세·순위·대시보드)
db/               Drizzle 스키마·마이그레이션·SQLite 클라이언트
lib/grading/      건강 등급 산출 로직
scripts/ingest/   데이터 수집·정규화·적재 배치
test/             Vitest 단위 + Playwright e2e
docs/adr/         아키텍처 결정 기록(ADR)
CONTEXT.md        도메인 용어집
```

## 시작하기

### 요구사항
- Node.js 22 LTS 권장 (Docker 이미지 기준)
- pnpm (아래 corepack로 활성화)
- Docker (컨테이너 실행 시)

### 설치

```bash
corepack enable
pnpm install
```

> `better-sqlite3`는 네이티브 모듈이라 `package.json`의 `pnpm.onlyBuiltDependencies`에 등록되어 있습니다(pnpm 10의 빌드 스크립트 차단 대응).

### 환경변수

`.env.example`을 `.env.local`로 복사하고 공공데이터포털 인증키를 입력하세요(`.env.local`은 git에서 제외됨):

```bash
cp .env.example .env.local
# DATA_GO_KR_SERVICE_KEY=발급받은_인증키
```

DB 파일 경로는 `DATABASE_PATH`(기본값 `./data/nutrirank.sqlite`)로 지정합니다.

### 데이터베이스

```bash
pnpm db:generate   # 스키마 변경 시 마이그레이션 생성
pnpm db:migrate    # 마이그레이션 적용
pnpm db:seed       # 소비자 카테고리 6종 시드 (멱등 — 재실행 안전)
```

### 개발 서버

```bash
pnpm dev           # http://localhost:3000
```

### 데이터 적재 배치

```bash
pnpm ingest        # 공개 데이터 수집 → 정규화 → 적재 → 점수·등급·순위 사전계산
```

### 테스트

```bash
pnpm test          # Vitest 단위 테스트
pnpm test:e2e      # Playwright e2e
```

## Docker

```bash
docker compose up --build
```

또는 직접:

```bash
docker build -t nutrirank .
docker run -p 3000:3000 -v "$(pwd)/data:/data" -e DATA_GO_KR_SERVICE_KEY=... nutrirank
```

앱은 `/data` 볼륨의 SQLite 파일을 읽기 전용으로 조회하고, 배치가 그 파일에 사전계산 값을 씁니다.

## 개발 현황

현재 **스캐폴드 단계**입니다. 골격(빌드·Docker 배포)은 완성됐고 핵심 로직은 순차 구현 중입니다.

- [x] 프로젝트 스캐폴드 (Next.js · Drizzle · SQLite · Docker)
- [x] 데이터 모델 마이그레이션 + 소비자 카테고리 시드 (`pnpm db:seed`) — 식약처 분류 매핑 시드는 데이터 적재 후 큐레이션 예정
- [x] 건강 등급 산출 (2023 Nutri-Score 변형) — 공식 임계값 1차 출처 전사 + 골든 케이스 검증
- [ ] 데이터 파이프라인 (공개 데이터 수집·적재)
- [ ] 화면 (검색 · 상세 · 순위 · 대시보드)

> `scripts/ingest`, `app/*` 페이지는 현재 스텁이며 위 로드맵에 따라 구현됩니다. `lib/grading`은 구현·검증 완료.

## 라이선스

Private (비공개 프로젝트)
