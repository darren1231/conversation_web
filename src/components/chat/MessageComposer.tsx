"use client";

import { useState, useTransition } from "react";
import type { MessageSender, MessageType } from "@/lib/supabase/types";
import { addMessage } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { MESSAGE_TYPE_OPTIONS } from "@/lib/constants";
import { cn, nowDateValue, nowTimeValue } from "@/lib/utils";

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [sender, setSender] = useState<MessageSender>("them");
  const [messageType, setMessageType] = useState<MessageType>("text");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(nowDateValue());
  const [time, setTime] = useState(nowTimeValue());
  const [note, setNote] = useState("");
  const [showMeta, setShowMeta] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("請輸入訊息內容");
      return;
    }
    startTransition(async () => {
      const result = await addMessage(conversationId, {
        sender,
        message_type: messageType,
        content,
        occurred_date: date || null,
        occurred_time: time || null,
        note: note || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setContent("");
      setNote("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
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
            對方說
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
          onClick={() => setSender((s) => (s === "me" ? "them" : "me"))}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title="快速切換發言者"
        >
          ⇄ 切換
        </button>

        <Select
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as MessageType)}
          className="ml-auto w-auto"
        >
          {MESSAGE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => setShowMeta((v) => !v)}
          className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {showMeta ? "隱藏時間/備註" : "時間/備註"}
        </button>
      </div>

      {showMeta && (
        <div className="mb-2 grid grid-cols-3 gap-2">
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
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備註"
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={sender === "me" ? "輸入我說的話..." : "輸入對方說的話..."}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" loading={isPending}>
          新增
        </Button>
      </div>
    </form>
  );
}
