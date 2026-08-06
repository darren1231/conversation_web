import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SearchBar } from "@/components/search/SearchBar";
import { UserMenu } from "@/components/layout/UserMenu";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = user?.email ?? "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.display_name || user.email || "使用者";
  }

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
          <Link
            href="/contacts"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            人物
          </Link>
          <Link
            href="/conversations"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            對話
          </Link>
        </nav>

        <div className="ml-auto flex flex-1 items-center justify-end gap-2">
          <div className="w-full max-w-xs">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
          <ThemeToggle />
          {user && (
            <div className="hidden items-center gap-2 sm:flex">
              <UserMenu displayName={displayName} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
