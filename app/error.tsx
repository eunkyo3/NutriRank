'use client'

// Route error boundary — mvp-scope-screens.md §4.1 (에러 상태 명시). Catches
// unexpected server/render errors (e.g. a DB read failure) and shows a friendly
// state with a retry instead of a raw stack.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
      <p className="font-medium">문제가 발생했습니다</p>
      <p className="mt-1 text-red-600">데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
      <button
        onClick={reset}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        type="button"
      >
        다시 시도
      </button>
    </div>
  )
}
