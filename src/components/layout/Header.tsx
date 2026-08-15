import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavLink } from "@/components/layout/NavLink";
import { SearchBar } from "@/components/search/SearchBar";
import { UserMenu } from "@/components/layout/UserMenu";

/**
 * Header 本身刻意是同步的：它掛在 (app) layout 上，而 layout 只要 await 任何
 * 執行期資料，底下每一頁的 loading 骨架就沒有機會顯示 —— 換頁會整個卡住等
 * layout 算完。所以唯一需要連線的部分（使用者名稱）被切到 HeaderUser，包在
 * 自己的 Suspense 裡串流進來，其餘導覽列立刻出現。
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href="/"
          className="shrink-0 text-sm font-bold text-zinc-900 dark:text-zinc-50"
        >
          對話成長日誌
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink
            href="/contacts"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            人物
          </NavLink>
          <NavLink
            href="/conversations"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            對話
          </NavLink>
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2">
          <div className="w-full max-w-xs">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            <Suspense fallback={<UserMenuPlaceholder />}>
              <HeaderUser />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}

async function HeaderUser() {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <UserMenu displayName={profile?.display_name || user.email || "使用者"} />
  );
}

/** 跟 UserMenu 收合狀態同寬同高，串流補上時不會把旁邊的東西推位。 */
function UserMenuPlaceholder() {
  return (
    <div className="flex items-center gap-2 px-2 py-1" aria-hidden>
      <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}
