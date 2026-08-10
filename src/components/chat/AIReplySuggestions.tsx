"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addMessage } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn, nowDateValue, nowTimeValue } from "@/lib/utils";

interface Suggestion {
  style: string;
  content: string;
  reason: string;
}

interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

/** 常用的方向，點一下就填進指示欄，省得每次自己打。 */
const GUIDANCE_PRESETS = [
  "輕鬆幽默一點",
  "認真誠懇一點",
  "簡短一點就好",
  "多問一句延續話題",
  "試著約出來見面",
  "保持一點距離感",
];

export function AIReplySuggestions({
  conversationId,
  contactName,
  hasMessages,
}: {
  conversationId: string;
  contactName: string;
  hasMessages: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isAdopting, startAdopting] = useTransition();

  const [guidance, setGuidance] = useState("");
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [cost, setCost] = useState<CostInfo | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [adoptedIndex, setAdoptedIndex] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setNeedsApiKey(false);
    try {
      const res = await fetch("/api/suggest-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          guidance: guidance.trim() || undefined,
          count,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        if (typeof payload.error === "string" && payload.error.includes("API Key")) {
          setNeedsApiKey(true);
        }
        throw new Error(payload.error || "產生建議失敗");
      }

      setSuggestions(payload.suggestions);
      setCost(payload.cost ?? null);
      setAdoptedIndex(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "產生建議失敗");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已複製，可以直接貼到聊天室了");
    } catch {
      toast.error("複製失敗，請手動選取文字");
    }
  }

  function adopt(suggestion: Suggestion, index: number) {
    startAdopting(async () => {
      const result = await addMessage(conversationId, {
        sender: "me",
        message_type: "text",
        content: suggestion.content,
        occurred_date: nowDateValue(),
        occurred_time: nowTimeValue(),
        note: null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setAdoptedIndex(index);
      toast.success("已加入這段對話，記得實際送出後再回來看效果");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          AI 建議怎麼回
        </h2>
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        讀完你和 {contactName} 的對話後，給你幾個走向不同的回法。
      </p>

      {!hasMessages ? (
        <p className="rounded-lg bg-white/70 px-3 py-4 text-center text-sm text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
          先記錄幾句對話，AI 才有東西可以參考。
        </p>
      ) : (
        <>
          <div className="mb-3">
            <label
              htmlFor="ai-guidance"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
            >
              想要什麼樣的回覆？（可留空）
            </label>
            <Input
              id="ai-guidance"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="例如：想約她這週末去看展，但不要太直接"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GUIDANCE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setGuidance((prev) =>
                      prev.trim() === preset ? "" : preset,
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    guidance.trim() === preset
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-zinc-300 bg-white text-zinc-600 hover:border-violet-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              要幾個選項
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} 個
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              onClick={generate}
              loading={loading}
              className="ml-auto"
            >
              {suggestions ? "換一批建議" : "✨ 產生建議回覆"}
            </Button>
          </div>

          {needsApiKey && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
              <p className="text-amber-900 dark:text-amber-200">
                這個功能需要你自己的 AI API Key。
              </p>
              <Link href="/settings/api-keys" className="mt-2 inline-block">
                <Button size="sm">前往設定</Button>
              </Link>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="flex flex-col gap-3">
              {suggestions.map((suggestion, index) => (
                <article
                  key={`${suggestion.style}-${index}`}
                  className={cn(
                    "rounded-xl border bg-white p-3 dark:bg-zinc-900",
                    adoptedIndex === index
                      ? "border-emerald-400 dark:border-emerald-600"
                      : "border-zinc-200 dark:border-zinc-700",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/60 dark:text-violet-200">
                      {suggestion.style}
                    </span>
                    {adoptedIndex === index && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ✓ 已加入對話
                      </span>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
                    {suggestion.content}
                  </p>

                  {suggestion.reason && (
                    <p className="mt-2 border-l-2 border-zinc-200 pl-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      {suggestion.reason}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copy(suggestion.content)}
                    >
                      複製
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={isAdopting}
                      onClick={() => adopt(suggestion, index)}
                    >
                      採用並加入對話
                    </Button>
                  </div>
                </article>
              ))}

              {cost && (
                <p className="text-right text-[11px] text-zinc-400 dark:text-zinc-500">
                  這次用了 {cost.inputTokens + cost.outputTokens} tokens，約
                  US${cost.totalCost.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
