import Link from "next/link";

const SETTINGS_ITEMS = [
  {
    href: "/settings/api-keys",
    icon: "🔑",
    title: "API 配置",
    description: "設定 AI 服務商的 API Key、模型，以及各自的分析風格",
  },
  {
    href: "/settings/api-usage",
    icon: "💰",
    title: "使用統計",
    description: "查看 AI 呼叫次數與累積花費",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        設定
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        管理 AI 相關的設定與用量。
      </p>

      <div className="flex flex-col gap-3">
        {SETTINGS_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {item.title}
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {item.description}
              </span>
            </span>
            <span className="ml-auto shrink-0 text-zinc-400">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
