"use client";

import { useState, useTransition } from "react";
import { parseBatchChatText, type ParsedLine } from "@/lib/chatParser";
import { batchAddMessages } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export function BatchPasteDialog({
  conversationId,
  onSaved,
  onClose,
}: {
  conversationId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ParsedLine[] | null>(null);

  function handlePreview() {
    const parsed = parseBatchChatText(raw);
    if (parsed.length === 0) {
      toast.error("沒有偵測到可解析的對話內容");
      return;
    }
    setPreview(parsed);
  }

  function toggleSender(index: number) {
    setPreview((prev) =>
      prev
        ? prev.map((item, i) =>
            i === index
              ? { ...item, sender: item.sender === "me" ? "them" : "me" }
              : item,
          )
        : prev,
    );
  }

  function updateContent(index: number, content: string) {
    setPreview((prev) =>
      prev ? prev.map((item, i) => (i === index ? { ...item, content } : item)) : prev,
    );
  }

  function removeLine(index: number) {
    setPreview((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleConfirm() {
    if (!preview || preview.length === 0) return;
    startTransition(async () => {
      const result = await batchAddMessages(
        conversationId,
        preview.map((item) => ({
          sender: item.sender,
          message_type: "text",
          content: item.content,
        })),
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`已新增 ${result.data?.count ?? preview.length} 則訊息`);
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 className="font-bold text-zinc-900 dark:text-zinc-50">
            批次貼上對話
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!preview ? (
            <>
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-300">
                貼上格式類似：
              </p>
              <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
{`Joy：你今天有去運動嗎？
我：有啊，今天去跑步。
Joy：你很常跑步嗎？`}
              </pre>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                系統會將「我」判斷為我的訊息，其他名稱一律判斷為對方的訊息。
              </p>
              <Textarea
                rows={10}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="在此貼上對話內容"
              />
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
                預覽（共 {preview.length} 則），可點擊調整發言者、編輯內容或移除：
              </p>
              <div className="flex flex-col gap-2">
                {preview.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2",
                      item.sender === "me"
                        ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950"
                        : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSender(index)}
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                        item.sender === "me"
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-600 text-white dark:bg-zinc-500",
                      )}
                    >
                      {item.sender === "me" ? "我" : "對方"}
                    </button>
                    <textarea
                      value={item.content}
                      onChange={(e) => updateContent(index, e.target.value)}
                      rows={Math.min(4, item.content.split("\n").length || 1)}
                      className="flex-1 resize-none rounded-md border border-transparent bg-transparent px-1 text-sm text-zinc-900 focus:border-zinc-300 focus:outline-none dark:text-zinc-100 dark:focus:border-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="shrink-0 text-xs text-red-500 hover:underline"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          {!preview ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button type="button" onClick={handlePreview}>
                預覽
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
                返回編輯
              </Button>
              <Button type="button" loading={isPending} onClick={handleConfirm}>
                確認儲存 {preview.length} 則訊息
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
