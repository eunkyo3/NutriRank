// output: 'standalone' ships a self-contained server bundle for the Docker runner.
// Next only traces deps reachable from imported route code; no page imports db/client.ts
// yet (scaffold stubs), so the SQLite driver would be pruned from the standalone output.
// outputFileTracingIncludes forces the native driver + ORM into .next/standalone/node_modules
// so `require('better-sqlite3')` works in the runner image (§5 AC#1) and the ingest batch
// can resolve them from /app/node_modules (§5 AC#3). Top-level key in Next 15 (was experimental).
// standalone 출력은 .next/standalone 안에 pnpm 스토어 구조를 심링크로 재현한다.
// Windows에서 개발자 모드가 꺼져 있고 관리자도 아니면 심링크 생성이 EPERM으로 막혀
// 빌드가 통째로 실패한다(컴파일은 통과하고 traced files 복사 단계에서 깨진다).
// Dockerfile이 .next/standalone에 의존하므로 기본값은 켜 둔 채, 로컬에서 빌드가
// 되는지만 확인하고 싶을 때 NEXT_DISABLE_STANDALONE=1로 끌 수 있게 한다.
// 이 값을 켠 빌드 결과물로는 Docker 이미지를 만들 수 없다.
const standalone = process.env.NEXT_DISABLE_STANDALONE !== '1';

export default {
  ...(standalone ? { output: 'standalone' } : {}),
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/better-sqlite3/**',
      './node_modules/drizzle-orm/**',
    ],
  },
};
