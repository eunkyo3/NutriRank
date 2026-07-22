# 전량 데이터 적재 오버나이트 러너 (Windows PowerShell)
# 사용: 저장소 어디에 클론했든 `.\run-ingest.ps1`. .env(.local)에서 서비스키를
# 읽어 환경변수를 세팅하고 전량 적재한다.
$ErrorActionPreference = "Stop"
# 클론 경로에 의존하지 않도록 스크립트 자신의 위치를 기준으로 삼는다(예전엔
# D:\NutriRank 가 하드코딩돼 다른 PC에서 그대로 못 돌렸다).
Set-Location $PSScriptRoot

# 서비스키 로드. CLI(scripts/ingest/index.ts)와 같은 우선순위 — .env.local 우선.
$envFile = @(".env.local", ".env") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $envFile) {
  throw ".env.local 또는 .env 가 없습니다. .env.example 를 복사해 DATA_GO_KR_SERVICE_KEY 를 채우세요."
}
$keyMatch = Select-String -Path $envFile -Pattern '^DATA_GO_KR_SERVICE_KEY=(.+)$'
if (-not $keyMatch) {
  throw "$envFile 에 DATA_GO_KR_SERVICE_KEY 가 없습니다. .env.example 를 참고하세요."
}
$env:DATA_GO_KR_SERVICE_KEY = $keyMatch.Matches[0].Groups[1].Value.Trim()
$env:DATA_GO_KR_15100066_ENDPOINT = "https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api"
$env:DATABASE_PATH = ".\data\nutrirank.sqlite"
$env:INGEST_PER_PAGE = "1000"          # 호출 최소화(591회) → 일일한도 내
Remove-Item Env:\INGEST_MAX_PAGES -ErrorAction SilentlyContinue  # 제한 해제 = 전량

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm 을 찾을 수 없습니다. 'corepack enable' 로 활성화하세요(packageManager: pnpm@9.15.0)."
}

# 스키마가 없으면 적재는 마지막 스왑 단계에서야 죽는다 — 11.5시간을 버리지 않도록
# 여기서 먼저 막는다. 갓 클론한 저장소에는 data/ 가 없다(gitignore).
if (-not (Test-Path $env:DATABASE_PATH)) {
  throw "$env:DATABASE_PATH 가 없습니다. 먼저 'pnpm db:migrate' 와 'pnpm db:seed' 를 실행하세요."
}

# 실제 적용된 값을 찍어 "왜 소량만?"(INGEST_MAX_PAGES 잔존)을 즉시 확인 가능하게.
$maxp = if ($env:INGEST_MAX_PAGES) { $env:INGEST_MAX_PAGES } else { "(none=전량)" }
# 자리를 비운 사이의 실행이라 콘솔만으로는 사유를 못 본다. ingest*.log 는 gitignore 대상.
Start-Transcript -Path (Join-Path $PSScriptRoot "ingest-run.log") -Append | Out-Null
try {
  "[{0}] 전량 적재 시작 — INGEST_PER_PAGE={1} INGEST_MAX_PAGES={2}" -f (Get-Date), $env:INGEST_PER_PAGE, $maxp
  # ingest 는 진행 상황을 stderr(console.error)로 흘린다. Stop 인 채로 두면 stderr 를
  # 캡처하는 터미널에서 그 한 줄이 NativeCommandError 가 돼 11.5시간짜리 실행이
  # 종료 코드도 못 남기고 죽는다. 종료 판정은 어차피 $LASTEXITCODE 로 한다.
  $ErrorActionPreference = "Continue"
  pnpm ingest
  $code = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  "[{0}] 적재 종료 exit=$code  (0=성공/스왑됨, 1=게이트 차단 또는 오류)" -f (Get-Date)
} finally {
  Stop-Transcript | Out-Null
}
exit $code
