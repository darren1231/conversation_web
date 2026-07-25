import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-zinc-950">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        登入失敗
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        很抱歉，登入過程發生錯誤，請重新嘗試。
      </p>
      <Link href="/login">
        <Button>回到登入頁</Button>
      </Link>
    </div>
  );
}
