function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="載入中">
      <div className="flex items-center justify-between gap-4">
        <SkeletonBlock className="h-7 w-36" />
        <SkeletonBlock className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-2/5" />
                <SkeletonBlock className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
