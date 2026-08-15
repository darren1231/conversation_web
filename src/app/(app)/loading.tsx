/**
 * 每一頁都要即時讀 Supabase，屬於動態路由。動態路由如果沒有 loading 邊界，
 * Next.js 就沒有東西可以預先抓 —— 點下連結後畫面會整個停在舊頁面，直到伺服器
 * 把新頁面算完才換過去，按起來就是「鈍」。
 *
 * 有了這個檔案，換頁時骨架會立刻出現（連帶讓 <Link> 的 prefetch 有內容可抓），
 * 真正的內容算好再串流補上。
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">載入中…</span>

      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="h-4 w-2/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
            <div className="mt-2 h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
