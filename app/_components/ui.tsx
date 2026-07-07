// Shared presentational components for the MVP screens
// (.omc/plans/mvp-scope-screens.md §5). Server components — pure rendering.
import { gradeBadgeClass } from '@/lib/display'
import type { HealthGrade } from '@/lib/grading/types'

// Grade badge (A~E) with color + letter (accessibility, §5). Null grade (ungradable)
// renders a neutral "미산출" badge.
export function GradeBadge({ grade }: { grade: string | null }) {
  if (grade === null) {
    return (
      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded bg-gray-300 px-2 text-sm font-bold text-gray-700">
        미산출
      </span>
    )
  }
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-2 text-sm font-bold ${gradeBadgeClass(
        grade as HealthGrade,
      )}`}
      title={`건강 등급 ${grade}`}
    >
      {grade}
    </span>
  )
}

// Shown when the pre-computed DB does not exist yet (ingest batch not run).
export function DataPendingNotice() {
  return (
    <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
      <p className="font-medium text-gray-700">데이터 준비 중</p>
      <p className="mt-1">
        아직 데이터가 적재되지 않았습니다. 데이터 파이프라인(<code>pnpm ingest</code>)을 실행하면 이 화면에 결과가 표시됩니다.
      </p>
    </div>
  )
}

export function EmptyResult({ message }: { message: string }) {
  return (
    <div className="rounded border border-gray-200 p-6 text-center text-sm text-gray-500">{message}</div>
  )
}
