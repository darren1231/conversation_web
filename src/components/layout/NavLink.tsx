"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * 導覽用的連結，按下去到新頁面畫出來之間會自己顯示「正在載入」。
 *
 * 這些頁面都要即時讀使用者資料，沒辦法預先靜態產生，所以點擊到換頁之間一定
 * 有一小段伺服器往返。少了這個回饋，使用者會覺得按鈕沒反應而重複點擊 ——
 * 這正是「每按一個按鈕都有點鈍」的體感來源。
 */
export function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("relative", className)}>
      {children}
      <PendingBar />
    </Link>
  );
}

function PendingBar() {
  const { pending } = useLinkStatus();

  // 固定尺寸、只切換透明度，避免載入指示器本身造成版面跳動。
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-1 bottom-0.5 h-0.5 overflow-hidden rounded-full transition-opacity duration-150",
        pending ? "opacity-100" : "opacity-0",
      )}
    >
      <span className="block h-full w-full animate-pulse rounded-full bg-indigo-500" />
    </span>
  );
}
