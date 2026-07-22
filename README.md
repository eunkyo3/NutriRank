# NutriRank

영양성분표를 해석하지 않고도 음료·간식의 건강성을 **건강 등급(A~E)**과 **카테고리 순위**로 한눈에 확인하게 해 주는 서비스입니다.

식약처 공개 데이터를 적재·정규화하고 건강 점수·등급·순위를 미리 계산해 두어, 사용자는 특정 상품이 같은 카테고리 안에서 얼마나 건강한지를 즉시 볼 수 있습니다.

## 핵심 개념

| 용어 | 의미 |
|---|---|
| **건강 등급** | 제품의 영양 건강성을 A~E로 나타낸 절대 지표 (모든 제품에 동일 기준) |
| **건강 점수** | 등급의 바탕이 되는 연속 수치. 등급과 순위가 공유하는 단일 평가 축 |
| **카테고리 순위** | 같은 소비자 카테고리 제품들을 건강 점수로 정렬한 순서 |
| **제품유형** | 음료(기준량 100ml) / 고형식품(기준량 100g) — 등급 산출 방식이 갈림 |

전체 도메인 용어집은 [`CONTEXT.md`](./CONTEXT.md)를 참고하세요.

## 소비자 카테고리 (9종)

| 제품유형 | 카테고리 |
|---|---|
| 음료 (100ml 기준) | 탄산음료 · 주스 · 커피음료 · 차음료 |
| 고형식품 (100g 기준) | 스낵/칩 · 초콜릿 · 비스킷 · 캔디/젤리 · 아이스크림/빙과 |

제품유형은 **카테고리가 결정**합니다(원천의 기준량 표기가 아니라). 표기로 역산하면 100g으로 적힌
주스에 고형식품 컷오프가 걸려 같은 점수에 다른 등급이 나옵니다 — 배경은 [ADR-0007](./docs/adr/0007-category-is-authoritative-for-product-type.md).

빵·케이크·떡(식사 대용), 껌(삼키지 않음), 농축음료·베이스(희석 전제), 조미료·유지류(100g을 그대로
먹지 않음)는 100g 기준 등급이 실제 섭취량과 동떨어져 오해를 부르므로 범위에서 제외합니다.

## 주요 기능

- **검색** — 제품명 유사어 검색(FTS5 trigram) + 카테고리·제품유형·등급 필터. 미수록 제품은 온디맨드로 API에서 가져와 등급까지 산출
- **제품 상세** — 건강 등급, 카테고리 내 순위·백분위, 등급 근거(기여 성분), 영양성분표(미측정 `—`와 실제 0 구분)
- **카테고리 순위** — 건강 점수 순 목록. 등급 필터와 "덜 건강한 순" 정렬 지원
- **카테고리 비교** — 9개 카테고리를 평균 점수·D·E 비율·평균 성분으로 나란히 대조
- **집계 분석 대시보드** — 카테고리 단위 등급 분포, 평균, 당류↔건강 점수 산점도·상관계수, 스냅샷 이력
- **도움말** — 등급 산정 방식과 화면 보는 법

## 기술 스택

- **Next.js 15** (App Router) · **TypeScript** (strict)
- **SQLite** + **Drizzle ORM** + **better-sqlite3** (WAL — 앱은 읽기 전용, 배치는 단일 라이터)
- 사전계산 배치 파이프라인 (조회 시 실시간 계산 없음)
- **Tailwind CSS** · **Recharts** (산점도·비교 차트, 클라이언트 컴포넌트)
- **Vitest** (단위) + **Playwright** (e2e)
- **Docker** (호스트 비종속 단일 이미지 + 볼륨 SQLite)
- 패키지 매니저: **pnpm**

아키텍처 결정 배경은 [`docs/adr/`](./docs/adr/)의 ADR 문서들을 참고하세요.

## 데이터 출처

식품의약품안전처 「전국통합식품영양성분정보(가공식품) 표준데이터」
(공공데이터포털 데이터셋 [15100066](https://www.data.go.kr/data/15100066/standard.do))

### 출처 표시 (라이선스: 공공데이터포털 이용허락 — 출처표시)

> 본 저작물은 **식품의약품안전처**에서 작성하여 **공공데이터포털([www.data.go.kr](https://www.data.go.kr))** 을 통해 개방한
> **「전국통합식품영양성분정보(가공식품) 표준데이터」**([15100066](https://www.data.go.kr/data/15100066/standard.do))를 이용하였으며,
> 해당 저작물은 공공데이터포털에서 무료로 내려받으실 수 있습니다.

> 건강 등급(A~E)은 위 원천 데이터를 바탕으로 NutriRank가 **2023 Nutri-Score 알고리즘**을 적용해 **산출한 2차 가공 결과**이며,
> 식품의약품안전처의 공식 평가나 인증이 아닙니다.

## 등급 기준 배경 (Nutri-Score & 식약처)

> 조사일 2026-07-08. 요약이며, 상세 임계값·출처는 각주 링크 참조.

### 1) 사용하는 알고리즘: 2023 Nutri-Score가 최신 버전

NutriRank가 쓰는 **2023 Nutri-Score**(2022년 일반식품 개정 + 2023년 음료 개정)는
현재 **유럽 공식 최신판**입니다. 이후 새 알고리즘 개정은 없으며, 2024~2026년은
이 개정판의 **시행·전환** 기간입니다(독일·벨기에·스위스·네덜란드 2024-01-01,
프랑스 2025-03, 기존 제품 전환기 ~2025년 말 → 사실상 2026년 완전 의무화).
당·소금 강화, 단백질·식이섬유는 고함량부터 가점, 물만 A, 감미료 음료 감점 등
개정 핵심이 본 구현에 반영돼 있습니다.
(출처: [Nutri-Score 공식 블로그](https://nutriscore.blog/), [Nature Food 2024](https://www.nature.com/articles/s43016-024-00920-3), [Eurofins](https://www.eurofins.de/food-analysis/food-news/food-testing-news/nutri-score-update/))

### 2) 식약처 공식 기준과의 차이

**식약처에는 Nutri-Score 같은 종합 A~E 건강등급 제도가 없습니다.** 앞면표시(FOP)
문자등급·신호등도 공식 도입되어 있지 않습니다. 가장 근접한 공식 기준은
「어린이 식생활안전관리 특별법」의 **고열량·저영양 식품 기준**(식약처 고시 제2023-59호)인데,
등급이 아니라 **해당/비해당 이진 판정**이고 대상도 어린이 기호식품에 한정됩니다.

| 항목 | 2023 Nutri-Score (NutriRank) | 식약처 고열량·저영양 |
|---|---|---|
| 산출 | 감점−가점 → A~E 5등급 | 임계값 초과 시 해당(이진) |
| 단위 | **100g/100ml당** | **1회 섭취참고량당**(30g 미만 30g 환산) |
| 나트륨 | salt(g) 환산해 합산·상쇄 | 나트륨(mg) 독립 임계(600/면류 1,000mg) |
| 가점 | 과채·단백질·식이섬유로 상향 | 과채 가점 없음, 단백질은 문턱 조건 |
| 대상 | 전 가공식품 | 어린이 기호식품 |

**갈리는 예:** 소용량 고당 과자는 100g 환산 시 Nutri-Score가 나빠지지만(D/E),
식약처는 1회량 기준이라 "비해당"이 될 수 있어 정반대 판정이 나올 수 있습니다.
그래서 NutriRank 등급을 식약처 판정으로 오인하면 안 됩니다.
(출처: [식약처 고시 제2023-59호](https://www.mfds.go.kr/brd/m_211/view.do?seq=14789), [식품안전나라 고열량·저영양](https://www.foodsafetykorea.go.kr/hilow/content/view.do?contentKey=1))

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

> **RHEL 계열(Rocky·Alma·CentOS) 주의:** 배포판 `nodejs` 패키지에 corepack이 들어 있지 않아
> `corepack enable`이 `command not found`로 실패합니다. `npm`도 별도 패키지입니다.
> 기본 모듈 스트림은 Node 16이므로 22로 바꾼 뒤 pnpm을 직접 설치하세요.
>
> ```bash
> dnf module reset nodejs -y && dnf module enable nodejs:22 -y
> dnf install -y nodejs npm
> npm install -g pnpm@9.15.0
> ```
>
> `pnpm install`이 `better-sqlite3` 빌드에서 막히면 `dnf group install -y "Development Tools"`와
> `dnf install -y python3`가 필요합니다. x86_64 glibc + Node 22면 보통 prebuilt를 받아 그냥 넘어갑니다.

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
pnpm db:seed       # 소비자 카테고리 + 식품유형 매핑 시드 (멱등 — 재실행 안전)
```

### 개발 서버

```bash
pnpm dev           # http://localhost:3000
```

### 프로덕션 빌드

```bash
pnpm build && pnpm start
```

> **Windows 주의:** `output: 'standalone'`은 `.next/standalone`에 pnpm 스토어 구조를 심링크로
> 재현하는데, 개발자 모드가 꺼져 있고 관리자가 아니면 심링크 생성이 `EPERM`으로 막혀 빌드가
> 실패합니다. `설정 > 시스템 > 개발자용 > 개발자 모드`를 켜고 **재부팅**하면 해결됩니다.
> 당장 로컬 빌드만 확인하려면 `NEXT_DISABLE_STANDALONE=1 pnpm build` 로 우회하세요
> (이 결과물로는 Docker 이미지를 만들 수 없습니다 — Dockerfile이 `.next/standalone`에 의존).

### 데이터 적재 배치

```bash
pnpm ingest        # 공개 데이터 수집 → 정규화 → 적재 → 점수·등급·순위 사전계산
```

전량 적재(약 11.5시간)는 자리를 비운 채 돌리게 되므로 러너 스크립트를 쓰세요. 준비물(`.env`·pnpm·
마이그레이션)이 빠졌으면 **즉시** 중단하고, 진행 로그를 `ingest-run.log`에 남깁니다.

```bash
./run-ingest.sh                        # Linux/macOS — tmux new -s ingest -d './run-ingest.sh'
```
```powershell
.\run-ingest.ps1                       # Windows
```

### 테스트

```bash
pnpm test          # Vitest 단위 테스트
pnpm test:e2e      # Playwright e2e
```

## 데이터 스냅샷 (배포 · 최신 데이터 받기)

전량 적재한 사전계산 DB(`nutrirank.sqlite` — 제품·영양·건강 등급·순위·집계·검색 인덱스까지 포함)를
**GitHub Releases**로 배포합니다. 이 파일 하나만 있으면 API 호출 없이 어디서든 즉시 현재 상태를
재현합니다(SQLite 파일은 OS·아키텍처 무관, 등급 산출은 결정론적).

> 원본이 수십 MB라 **git에 커밋하지 않고** Releases 자산으로 관리합니다(현재 자산 약 45MB, 비압축).

### 버전 관리 규칙
- **릴리스 태그**: 적재 시점 날짜 `data-YYYY-MM-DD` (원천이 월별 갱신되므로)
- **자산 파일명**: `nutrirank-snapshot-YYYY-MM-DD.sqlite` (비압축). 이름에 날짜가 들어가므로
  고정 URL로는 받을 수 없고 `gh release download --pattern "*.sqlite"`로 최신 자산을 가져온다.
- **릴리스 노트**: 적재일 · 총/카테고리별 건수 · gradable 수 · `algorithm_version` · 원천 기준월

| 버전(태그) | 적재일 | 제품 수 | 알고리즘 | 비고 |
|---|---|---|---|---|
| `data-2026-07-10` | 2026-07-10 | 48,215 (gradable 48,199) | `nutriscore-2023-v1` | 최초 전량 미러 |

### 최신 데이터 받아 적용하기

자산 이름에 적재일이 들어가므로(`nutrirank-snapshot-2026-07-10.sqlite`) 고정 URL이 아니라
패턴으로 받습니다. 아래 한 줄은 bash·PowerShell 어디서나 동일하게 동작합니다.

```bash
gh release download --repo eunkyo3/NutriRank --pattern "*.sqlite" \
  --output data/nutrirank.sqlite --clobber
```

> `data/` 디렉터리가 없으면 먼저 만드세요 — bash `mkdir -p data`,
> PowerShell `New-Item -ItemType Directory -Force data`.

`gh` CLI가 없다면 [Releases 페이지](https://github.com/eunkyo3/NutriRank/releases/latest)에서
`.sqlite` 자산을 직접 내려받아 `data/nutrirank.sqlite`로 저장해도 됩니다. 자산은 비압축이라
별도 해제 과정이 없습니다.

그다음 `docker compose up -d`(또는 `pnpm start`) → 앱이 즉시 전량 데이터를 서빙합니다.
> 데이터만 보는 데는 API 키가 필요 없습니다(사전계산 파일만 읽음). 키·엔드포인트는 온디맨드 검색 캐시에만 쓰입니다.

### 새 스냅샷 만들기(관리자용)
```bash
./run-ingest.sh    # 전량 적재 (~11.5h). Windows는 .\run-ingest.ps1, 직접 실행은 pnpm ingest.
# WAL 통합 → 단일 파일로 완결
node -e "const D=require('better-sqlite3');const db=new D('./data/nutrirank.sqlite');db.pragma('wal_checkpoint(TRUNCATE)');db.pragma('journal_mode=DELETE');db.close()"
# 태그 data-YYYY-MM-DD로 릴리스 생성 + 자산 업로드 (자산명에 날짜를 포함시킨다)
cp data/nutrirank.sqlite nutrirank-snapshot-$(date +%F).sqlite
gh release create data-$(date +%F) nutrirank-snapshot-$(date +%F).sqlite \
  --title "데이터 스냅샷 $(date +%F)" --notes "적재일·건수·algorithm_version·원천 기준월"
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

데이터 모델·건강 등급·파이프라인·화면이 모두 구현·검증 완료입니다.

- [x] 프로젝트 스캐폴드 (Next.js · Drizzle · SQLite · Docker)
- [x] 데이터 모델 마이그레이션 + 소비자 카테고리·식품유형 매핑 시드 (`pnpm db:seed`)
- [x] 건강 등급 산출 (2023 Nutri-Score) — 공식 임계값 1차 출처 전사 + 골든 케이스 검증
- [x] 데이터 파이프라인 12단계 — 품질 게이트 통과 시에만 원자적 스왑
- [x] 화면 — 검색 · 상세 · 순위 · 카테고리 비교 · 집계 대시보드 · 도움말
- [x] 제품유형 판정을 카테고리 기준으로 교정 (ADR-0007)
- [x] 소비자 카테고리 6종 → 9종 확장 (차음료 · 캔디/젤리 · 아이스크림/빙과)
- [ ] **확장·교정 반영 전량 재적재** — 아래 참조

### ⚠️ 재적재 대기 중

배포된 스냅샷 `data-2026-07-10`(제품 48,215건)은 **ADR-0007 교정과 카테고리 확장 이전**에 만들어진
것입니다. 이 스냅샷으로 앱을 띄우면:

- 신규 3개 카테고리(차음료·캔디/젤리·아이스크림/빙과)가 **빈 목록**으로 보입니다
- 100g으로 표기된 음료 2,376건에 고형식품 컷오프가 적용된 **옛 등급**이 그대로 남아 있습니다
  (같은 점수에 다른 등급이 나오는 제품이 11,527건 = 순위의 23.9%)

`./run-ingest.sh`(Windows는 `.\run-ingest.ps1`)로 전량 재적재(약 11.5시간)하면 해소되며, 그 뒤 새 스냅샷을 Releases에 올리고
위 스냅샷 표에 행을 추가하세요.

> 핵심 로직(`lib/grading`·`scripts/ingest`)과 화면(`app/*`)은 구현·검증 완료입니다.
> 재적재 전이라도 위 "데이터 스냅샷" 절의 안내대로 `.sqlite`를 받아 `data/`에 두면 API 키 없이 앱이 동작합니다.

## 라이선스

Private (비공개 프로젝트)
