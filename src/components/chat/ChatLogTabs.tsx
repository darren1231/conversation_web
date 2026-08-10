"use client";

import { useState } from "react";
import { AlternatingChatLogger } from "@/components/chat/AlternatingChatLogger";
import { ImageImportPanel } from "@/components/chat/ImageImportPanel";
import { cn } from "@/lib/utils";

type Mode = "manual" | "image";

const TABS: { id: Mode; label: string; hint: string }[] = [
  {
    id: "manual",
    label: "✏️ 一句一句打",
    hint: "對方一句、我一句，送出後自動換人",
  },
  {
    id: "image",
    label: "📸 上傳截圖",
    hint: "用 AI 讀出截圖裡的對話，再確認",
  },
];

export function ChatLogTabs({
  contactName,
  contactId,
  conversationId,
}: {
  contactName: string;
  contactId?: string;
  conversationId?: string;
}) {
  const [mode, setMode] = useState<Mode>("manual");
  const active = TABS.find((t) => t.id === mode)!;

  return (
    <div>
      <div className="mb-1 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              mode === tab.id
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mb-4 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {active.hint}
      </p>

      {mode === "manual" ? (
        <AlternatingChatLogger
          contactName={contactName}
          contactId={contactId}
          conversationId={conversationId}
        />
      ) : (
        <ImageImportPanel
          contactName={contactName}
          contactId={contactId}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
