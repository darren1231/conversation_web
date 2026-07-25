import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";

const items = [
  { href: "/", label: "首頁" },
  { href: "/contacts", label: "人物" },
  { href: "/conversations", label: "對話" },
  { href: "/search", label: "搜尋" },
];

export function MobileNav() {
  return (
    <nav className="sticky bottom-0 z-40 flex items-center justify-around border-t border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {item.label}
        </Link>
      ))}
      <div className="flex flex-1 flex-col items-center">
        <LogoutButton />
      </div>
    </nav>
  );
}
