const rows = Array.from({ length: 6 }, (_, index) => index);

export default function AppLoading() {
  return (
    <div role="status" aria-label="正在載入頁面" className="animate-pulse">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-7 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="h-5 w-2/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-4 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
            <div className="mt-2 h-4 w-3/5 rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        ))}
      </div>
      <span className="sr-only">載入中…</span>
    </div>
  );
}
