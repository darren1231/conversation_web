import { Card } from "@/components/ui/Card";

/**
 * 卡片清單串流進來之前的佔位。高度刻意貼近真實卡片，補上時不會跳版。
 */
export function CardGridSkeleton({
  count = 4,
  avatar = false,
}: {
  count?: number;
  avatar?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">載入中…</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex items-center gap-3">
          {avatar && (
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
          )}
          <div className="min-w-0 flex-1">
            <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        </Card>
      ))}
    </div>
  );
}
