/**
 * 對話詳情自己的 loading 邊界（理由同 contacts/[id]/loading.tsx）。
 *
 * 這是全站最重的一頁：要抓對話、人物、訊息、標籤、附件，還要換兩次
 * signed URL，所以更需要點下去就先看到骨架。
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">載入中…</span>

      <div className="mb-4">
        <div className="mb-3 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-6 w-52 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-3 w-36 rounded bg-zinc-100 dark:bg-zinc-800/70" />
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-3 w-11/12 rounded bg-zinc-100 dark:bg-zinc-800/70" />
        <div className="mt-2 h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
      </div>

      <div className="mb-6 h-20 rounded-xl bg-indigo-50 dark:bg-indigo-950/40" />

      {/* 聊天訊息：一左一右的泡泡 */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={i % 2 === 1 ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`h-10 rounded-2xl ${
                i % 2 === 1
                  ? "w-1/2 bg-indigo-200 dark:bg-indigo-900/60"
                  : "w-3/5 bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
