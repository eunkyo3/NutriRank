# 전량 데이터 적재 오버나이트 러너 (Windows PowerShell)
# 사용: 아래 "실행" 참고. .env 에서 서비스키를 읽어 환경변수를 세팅하고 전량 적재한다.
$ErrorActionPreference = "Stop"
Set-Location "D:\NutriRank"

# .env 에서 서비스키 로드 (파일에 키가 있어야 함)
$env:DATA_GO_KR_SERVICE_KEY = (Select-String -Path .env -Pattern '^DATA_GO_KR_SERVICE_KEY=(.+)$').Matches[0].Groups[1].Value.Trim()
$env:DATA_GO_KR_15100066_ENDPOINT = "https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api"
$env:DATABASE_PATH = ".\data\nutrirank.sqlite"
$env:INGEST_PER_PAGE = "1000"          # 호출 최소화(591회) → 일일한도 내
Remove-Item Env:\INGEST_MAX_PAGES -ErrorAction SilentlyContinue  # 제한 해제 = 전량

# 실제 적용된 값을 찍어 "왜 소량만?"(INGEST_MAX_PAGES 잔존)을 즉시 확인 가능하게.
$maxp = if ($env:INGEST_MAX_PAGES) { $env:INGEST_MAX_PAGES } else { "(none=전량)" }
"[{0}] 전량 적재 시작 — INGEST_PER_PAGE={1} INGEST_MAX_PAGES={2}" -f (Get-Date), $env:INGEST_PER_PAGE, $maxp
pnpm ingest
$code = $LASTEXITCODE
"[{0}] 적재 종료 exit=$code  (0=성공/스왑됨, 1=게이트 차단 또는 오류)" -f (Get-Date)
exit $code
