import { NavLink } from "@/components/layout/NavLink";
import { LogoutButton } from "@/components/layout/LogoutButton";

const items = [
  { href: "/", label: "首頁" },
  { href: "/contacts", label: "人物" },
  { href: "/conversations", label: "對話" },
  { href: "/search", label: "搜尋" },
  { href: "/settings/api-keys", label: "設置" },
];

export function MobileNav() {
  return (
    // 貼在 Header（h-14）底下：手機上單手拿著時，上排比下排好按，
    // 也不會被瀏覽器自己的底部工具列蓋住。
    <nav className="sticky top-14 z-30 flex items-center justify-around border-b border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {items.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {item.label}
        </NavLink>
      ))}
      <div className="flex flex-1 flex-col items-center">
        <LogoutButton />
      </div>
    </nav>
  );
}
