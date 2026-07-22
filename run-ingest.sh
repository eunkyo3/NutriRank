#!/usr/bin/env bash
# 전량 데이터 적재 오버나이트 러너 (Linux/macOS). Windows 는 run-ingest.ps1.
# 사용: 저장소 어디에 클론했든 ./run-ingest.sh
#
# SSH 가 끊겨도 계속 돌게 하려면 tmux 안에서 띄운다:
#   tmux new -s ingest -d './run-ingest.sh'   # 나중에 tmux attach -t ingest
set -euo pipefail

# 클론 경로에 의존하지 않도록 스크립트 자신의 위치를 기준으로 삼는다.
cd "$(cd "$(dirname "$0")" && pwd)"

# 서비스키는 배치 CLI 가 .env.local → .env 순으로 직접 읽는다(scripts/ingest/index.ts).
# 여기서는 존재 여부만 확인해 11.5시간을 태우기 전에 막는다.
env_file=""
for f in .env.local .env; do
  if [ -f "$f" ]; then env_file="$f"; break; fi
done
if [ -z "$env_file" ]; then
  echo "오류: .env.local 또는 .env 가 없습니다. cp .env.example .env.local 후 인증키를 넣으세요." >&2
  exit 1
fi
if ! grep -qE '^DATA_GO_KR_SERVICE_KEY=.+$' "$env_file"; then
  echo "오류: $env_file 에 DATA_GO_KR_SERVICE_KEY 가 없습니다." >&2
  exit 1
fi
# .env.example 를 복사만 하고 키를 안 채운 경우 — 그대로 두면 API 가 전량 401 을 낸다.
if grep -qE '^DATA_GO_KR_SERVICE_KEY=여기에_발급받은_인증키$' "$env_file"; then
  echo "오류: $env_file 의 DATA_GO_KR_SERVICE_KEY 가 예시값 그대로입니다. 실제 키로 바꾸세요." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "오류: pnpm 을 찾을 수 없습니다. corepack enable 로 활성화하세요(packageManager: pnpm@9.15.0)." >&2
  exit 1
fi

# 스키마가 없으면 적재는 마지막 스왑 단계에서야 죽는다 — 여기서 먼저 막는다.
# 갓 클론한 저장소에는 data/ 가 없다(gitignore).
: "${DATABASE_PATH:=./data/nutrirank.sqlite}"
export DATABASE_PATH
if [ ! -f "$DATABASE_PATH" ]; then
  echo "오류: $DATABASE_PATH 가 없습니다. 먼저 pnpm db:migrate 와 pnpm db:seed 를 실행하세요." >&2
  exit 1
fi

# 기본값 200 으로 두면 호출이 2,955회로 늘어 일일 한도를 넘는다. 1000 이면 591회.
export INGEST_PER_PAGE="${INGEST_PER_PAGE:-1000}"
# 설정돼 있으면 그만큼만 부분 적재된다. 전량이 목적이므로 해제한다.
unset INGEST_MAX_PAGES

log="ingest-run.log"  # ingest*.log 는 이미 gitignore 대상
echo "[$(date '+%F %T')] 전량 적재 시작 — INGEST_PER_PAGE=$INGEST_PER_PAGE DATABASE_PATH=$DATABASE_PATH" | tee -a "$log"

# tee 를 거치므로 pnpm 의 종료 코드는 PIPESTATUS 로 꺼낸다($? 는 tee 것이다).
set +e
pnpm ingest 2>&1 | tee -a "$log"
code=${PIPESTATUS[0]}
set -e

echo "[$(date '+%F %T')] 적재 종료 exit=$code  (0=성공/스왑됨, 1=게이트 차단 또는 오류)" | tee -a "$log"
exit "$code"
