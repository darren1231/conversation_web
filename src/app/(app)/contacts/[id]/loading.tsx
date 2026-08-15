/**
 * 人物詳情自己的 loading 邊界。
 *
 * (app)/loading.tsx 是列表頁和詳情頁「共用」的同一個 Suspense 邊界，React 在
 * 已經掛載的邊界上做 transition 時會保留舊畫面而不退回 fallback —— 所以從
 * 人物列表點進某一位人物時，上面那層骨架不會出現。這裡放一個屬於這個 segment
 * 的邊界，點進來時才會立刻看到骨架。
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">載入中…</span>

      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1">
          <div className="h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-2 h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800/70" />
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 h-20 rounded-xl bg-indigo-50 dark:bg-indigo-950/40" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="h-4 w-2/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
