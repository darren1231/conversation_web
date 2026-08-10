"use client";

import { useState, useTransition } from "react";
import { saveAISystemPrompt } from "@/lib/actions/ai-settings";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export function AIPromptForm({
  initialPrompt,
  defaultPrompt,
}: {
  /** 使用者已存的內容；沒設定過為空字串。 */
  initialPrompt: string;
  /** 程式內建的預設，用來顯示與「恢復預設」。 */
  defaultPrompt: string;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialPrompt || defaultPrompt);
  const [usingDefault, setUsingDefault] = useState(!initialPrompt);

  function save() {
    startTransition(async () => {
      const result = await saveAISystemPrompt(value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setUsingDefault(value.trim().length === 0);
      toast.success("已儲存，下次產生建議就會用這個風格");
    });
  }

  function restoreDefault() {
    setValue(defaultPrompt);
    toast.success("已填回預設內容，記得按儲存");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        {usingDefault
          ? "目前使用內建預設風格。"
          : "目前使用你自訂的風格。"}
      </div>

      <div>
        <label
          htmlFor="ai-system-prompt"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
        >
          分析風格
        </label>
        <textarea
          id="ai-system-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={22}
          spellCheck={false}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          這段決定 AI 用什麼角度分析、偏好什麼樣的回覆。輸出格式（哪些欄位、
          幾個選項）由系統另外固定，所以你怎麼改都不會弄壞功能。清空並儲存
          就會回到內建預設。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} loading={isPending}>
          儲存
        </Button>
        <Button type="button" variant="secondary" onClick={restoreDefault}>
          填回預設內容
        </Button>
      </div>
    </div>
  );
}
