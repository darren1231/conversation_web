"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { MessageSender } from "@/lib/supabase/types";
import {
  appendConversationLog,
  createConversationLog,
  type LogEntryInput,
} from "@/lib/actions/conversations";
import { addAttachment } from "@/lib/actions/attachments";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateImage } from "@/lib/storage";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn, nowDateValue, nowTimeValue } from "@/lib/utils";

/**
 * 截圖上跟著這句話的「回覆引用」預覽。
 * 它是被回覆的那則舊訊息的節錄，本身不是一句對話，所以只在校對時顯示，不會存進紀錄。
 */
export interface DraftQuote {
  name?: string;
  sender?: MessageSender;
  excerpt: string;
}

export interface DraftEntry {
  key: string;
  sender: MessageSender;
  content: string;
  date: string;
  time: string;
  replyTo?: DraftQuote;
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
  replyTo?: DraftQuote,
): DraftEntry {
  return {
    key: makeKey(),
    sender,
    content,
    date: date || nowDateValue(),
    time: time || nowTimeValue(),
    ...(replyTo ? { replyTo } : {}),
  };
}

/**
 * 校對用的原始截圖：編輯期間顯示在對話串下方方便逐句比對，
 * 儲存成功後會上傳成這段對話的附件，畫面上就跟著收掉。
 */
export interface ReferenceImage {
  file: File;
  previewUrl: string;
}

export function AlternatingChatLogger({
  contactName,
  contactId,
  conversationId,
  initialDrafts,
  referenceImage,
  startWith = "them",
}: {
  contactName: string;
  /** 提供 contactId 會建立一段新對話；提供 conversationId 則附加到既有對話。 */
  contactId?: string;
  conversationId?: string;
  initialDrafts?: DraftEntry[];
  referenceImage?: ReferenceImage;
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
  const [showReference, setShowReference] = useState(true);

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

  /** AI 有時候是整段左右判反，一句一句換人太慢，給一個一次全翻的按鈕。 */
  function swapAllSenders() {
    setDrafts((prev) =>
      prev.map((d) => ({ ...d, sender: d.sender === "me" ? "them" : "me" })),
    );
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

  /**
   * 把校對用的截圖收進這段對話的附件。校對稿已經存好了，所以這裡失敗只提醒，
   * 不會把整次儲存當成失敗。
   */
  async function saveReferenceImage(targetConversationId: string) {
    if (!referenceImage) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("截圖沒有存成附件：登入狀態已過期");
      return;
    }

    const uploaded = await uploadPrivateImage(
      supabase,
      user.id,
      `screenshots/${targetConversationId}`,
      referenceImage.file,
    );
    if ("error" in uploaded) {
      toast.error(`截圖沒有存成附件：${uploaded.error}`);
      return;
    }

    const result = await addAttachment(
      targetConversationId,
      uploaded.path,
      "AI 解析來源截圖",
    );
    if (result.error) toast.error(`截圖沒有存成附件：${result.error}`);
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

      // 附加到既有對話時就是原本那筆；新建時才從回傳值拿到新的 id。
      const targetId =
        conversationId ?? (result.data as { id?: string } | undefined)?.id;

      // 校對結束＝截圖任務結束：存進資料庫後畫面上就不用再留著它。
      if (targetId) await saveReferenceImage(targetId);

      setDrafts([]);
      if (targetId) router.push(`/conversations/${targetId}`);
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
          <div className="flex items-center gap-3">
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={swapAllSenders}
                className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                title={`把每一句都改成另一個人說的（我 ↔ ${contactName}）`}
              >
                全部換邊
              </button>
            )}
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {drafts.length} 句
            </span>
          </div>
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

                  {/*
                    截圖上的回覆引用。標示出來是為了讓人一眼看懂「這句雖然引用了我的話，
                    但說話的還是對方」，被引用的那則舊訊息不會被當成一句新對話存起來。
                  */}
                  {draft.replyTo && (
                    <div
                      className={cn(
                        "mb-1 border-l-2 pl-2 text-[11px]",
                        draft.sender === "me"
                          ? "border-indigo-300 text-indigo-100"
                          : "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      ↩ 回覆
                      {draft.replyTo.sender
                        ? ` ${senderLabel(draft.replyTo.sender)}`
                        : draft.replyTo.name
                          ? ` ${draft.replyTo.name}`
                          : ""}
                      ：{draft.replyTo.excerpt}
                    </div>
                  )}

                  {editingKey === draft.key ? (
                    <div className="flex flex-col gap-2 py-1">
                      {/* AI 認錯發言者是常見狀況，所以編輯時第一件事就是能改「這句是誰說的」。 */}
                      <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-600">
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(draft.key, { sender: "them" })
                          }
                          className={cn(
                            "flex-1 px-2 py-1 text-xs font-semibold",
                            draft.sender === "them"
                              ? "bg-zinc-700 text-white dark:bg-zinc-600"
                              : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                          )}
                        >
                          {contactName} 說
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft(draft.key, { sender: "me" })
                          }
                          className={cn(
                            "flex-1 px-2 py-1 text-xs font-semibold",
                            draft.sender === "me"
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                          )}
                        >
                          我說
                        </button>
                      </div>
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
                      onClick={() =>
                        updateDraft(draft.key, {
                          sender: draft.sender === "me" ? "them" : "me",
                        })
                      }
                      className="hover:underline"
                      title="換成另一個人說的"
                    >
                      換人
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

      {/* ── 校對用的原始截圖 ─────────────────────────────── */}
      {referenceImage && (
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                原始截圖
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                對照著改上面的內容；儲存後會一起存進這段對話。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReference((v) => !v)}
              className="shrink-0 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {showReference ? "收合" : "展開"}
            </button>
          </div>

          {showReference && (
            // 手機上限制高度並讓它自己捲動，才不會把校對稿推到看不見的地方。
            <div className="mt-2 max-h-[60vh] overflow-auto rounded-lg bg-zinc-100 p-2 dark:bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={referenceImage.previewUrl}
                alt="AI 解析來源的對話截圖"
                className="mx-auto w-full max-w-md rounded-lg"
              />
            </div>
          )}
        </div>
      )}

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
