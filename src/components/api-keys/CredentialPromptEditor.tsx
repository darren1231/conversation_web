"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_ANALYSIS_PROMPT } from "@/lib/ai-providers/default-prompt";

/**
 * 每一組 API 設定各自的分析風格。留空就用程式內建的預設。
 */
export function CredentialPromptEditor({
  credentialId,
  initialPrompt,
}: {
  credentialId: string;
  initialPrompt: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // 沒自訂過就先把預設內容填進去，讓使用者有東西可以改，而不是面對空白框。
  const [value, setValue] = useState(initialPrompt || DEFAULT_ANALYSIS_PROMPT);
  const [isCustom, setIsCustom] = useState(Boolean(initialPrompt));

  async function save(next: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, systemPrompt: next }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "儲存失敗");

      setIsCustom(next.trim().length > 0);
      toast.success("已儲存，下次產生建議就會用這個風格");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>✨ AI 分析風格</span>
        <span
          className={`ml-auto rounded px-2 py-0.5 text-xs ${
            isCustom
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {isCustom ? "已自訂" : "預設"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            這組 API 產生建議時使用的分析角度與回覆偏好。輸出格式由系統固定，
            改這裡不會影響功能運作。
          </p>

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={14}
            spellCheck={false}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => save(value)}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存風格"}
            </button>
            <button
              type="button"
              onClick={() => setValue(DEFAULT_ANALYSIS_PROMPT)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              填回預設內容
            </button>
            {isCustom && (
              <button
                type="button"
                onClick={() => {
                  setValue(DEFAULT_ANALYSIS_PROMPT);
                  save("");
                }}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                改用預設
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
