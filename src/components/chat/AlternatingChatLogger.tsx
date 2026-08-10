"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { MessageSender } from "@/lib/supabase/types";
import {
  appendConversationLog,
  createConversationLog,
  type LogEntryInput,
} from "@/lib/actions/conversations";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn, nowDateValue, nowTimeValue } from "@/lib/utils";

export interface DraftEntry {
  key: string;
  sender: MessageSender;
  content: string;
  date: string;
  time: string;
}

let keySeq = 0;
function makeKey() {
  keySeq += 1;
  return `draft-${Date.now()}-${keySeq}`;
}

export function makeDraft(
  sender: MessageSender,
  content: string,
  date?: string,
  time?: string,
): DraftEntry {
  return {
    key: makeKey(),
    sender,
    content,
    date: date || nowDateValue(),
    time: time || nowTimeValue(),
  };
}

export function AlternatingChatLogger({
  contactName,
  contactId,
  conversationId,
  initialDrafts,
  startWith = "them",
}: {
  contactName: string;
  /** 提供 contactId 會建立一段新對話；提供 conversationId 則附加到既有對話。 */
  contactId?: string;
  conversationId?: string;
  initialDrafts?: DraftEntry[];
  startWith?: MessageSender;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [drafts, setDrafts] = useState<DraftEntry[]>(initialDrafts ?? []);
  const [sender, setSender] = useState<MessageSender>(startWith);
  const [content, setContent] = useState("");
  const [date, setDate] = useState(nowDateValue());
  const [time, setTime] = useState(nowTimeValue());
  const [showTime, setShowTime] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const senderLabel = (s: MessageSender) => (s === "me" ? "我" : contactName);

  function addEntry() {
    const text = content.trim();
    if (!text) {
      toast.error(`請先輸入${senderLabel(sender)}說的話`);
      inputRef.current?.focus();
      return;
    }

    setDrafts((prev) => [...prev, makeDraft(sender, text, date, time)]);
    setContent("");
    // 這就是「一句一句交替」：送出後自動換到另一方，直接接著打下一句。
    setSender((s) => (s === "me" ? "them" : "me"));
    setTime(nowTimeValue());
    inputRef.current?.focus();
  }

  function updateDraft(key: string, patch: Partial<DraftEntry>) {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
    if (editingKey === key) setEditingKey(null);
  }

  function moveDraft(index: number, direction: -1 | 1) {
    const target = index + direction;
    setDrafts((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    if (drafts.length === 0) {
      toast.error("還沒有任何對話內容");
      return;
    }

    const entries: LogEntryInput[] = drafts.map((d) => ({
      sender: d.sender,
      content: d.content,
      occurred_date: d.date || null,
      occurred_time: d.time || null,
    }));

    startTransition(async () => {
      const result = conversationId
        ? await appendConversationLog(conversationId, entries)
        : await createConversationLog(contactId!, entries);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`已儲存 ${drafts.length} 句對話`);
      setDrafts([]);

      const targetId =
        conversationId ??
        (result.data && "id" in result.data ? result.data.id : undefined);
      if (targetId) router.push(`/conversations/${targetId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* ── 已輸入的對話串 ───────────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            對話內容
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {drafts.length} 句
          </span>
        </div>

        {drafts.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            從下方開始輸入。送出一句後會自動換人，
            <br />
            讓你「{contactName}一句、我一句」接著打完整段對話。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {drafts.map((draft, index) => (
              <li
                key={draft.key}
                className={cn(
                  "flex gap-2",
                  draft.sender === "me" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    draft.sender === "me"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700",
                  )}
                >
                  <div
                    className={cn(
                      "mb-0.5 flex items-center gap-2 text-[11px]",
                      draft.sender === "me"
                        ? "text-indigo-200"
                        : "text-zinc-500 dark:text-zinc-400",
                    )}
                  >
                    <span className="font-semibold">
                      {senderLabel(draft.sender)}
                    </span>
                    <span>{draft.time}</span>
                  </div>

                  {editingKey === draft.key ? (
                    <div className="flex flex-col gap-2 py-1">
                      <textarea
                        value={draft.content}
                        onChange={(e) =>
                          updateDraft(draft.key, { content: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) =>
                            updateDraft(draft.key, { date: e.target.value })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <input
                          type="time"
                          value={draft.time}
                          onChange={(e) =>
                            updateDraft(draft.key, { time: e.target.value })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingKey(null)}
                        className="self-start rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        完成
                      </button>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {draft.content}
                    </p>
                  )}

                  <div
                    className={cn(
                      "mt-1 flex items-center gap-2 text-[11px]",
                      draft.sender === "me"
                        ? "text-indigo-200"
                        : "text-zinc-400 dark:text-zinc-500",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setEditingKey(
                          editingKey === draft.key ? null : draft.key,
                        )
                      }
                      className="hover:underline"
                    >
                      {editingKey === draft.key ? "收起" : "編輯"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraft(index, -1)}
                      disabled={index === 0}
                      className="disabled:opacity-30"
                      title="往上移"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDraft(index, 1)}
                      disabled={index === drafts.length - 1}
                      className="disabled:opacity-30"
                      title="往下移"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDraft(draft.key)}
                      className="hover:underline"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 輸入區：現在輪到誰 ───────────────────────────── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            現在輪到
          </span>
          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-600">
            <button
              type="button"
              onClick={() => setSender("them")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold",
                sender === "them"
                  ? "bg-zinc-700 text-white dark:bg-zinc-600"
                  : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              {contactName} 說
            </button>
            <button
              type="button"
              onClick={() => setSender("me")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold",
                sender === "me"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
              )}
            >
              我說
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTime((v) => !v)}
            className="ml-auto text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {showTime ? "隱藏時間" : `時間 ${date} ${time}`}
          </button>
        </div>

        {showTime && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addEntry();
              }
            }}
            placeholder={`輸入${senderLabel(sender)}說的話…（Enter 送出並換人，Shift+Enter 換行）`}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <Button type="button" onClick={addEntry}>
            送出
          </Button>
        </div>
      </div>

      {/* ── 儲存 ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          順序會照上面的排列儲存，儲存前都可以調整。
        </p>
        <Button
          type="button"
          onClick={handleSave}
          loading={isPending}
          disabled={drafts.length === 0}
        >
          儲存 {drafts.length > 0 ? `${drafts.length} 句` : ""}對話
        </Button>
      </div>
    </div>
  );
}
