"use client";

import { useState, useTransition } from "react";
import type { Message } from "@/lib/supabase/types";
import { deleteMessage } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { MESSAGE_TYPE_LABEL } from "@/lib/constants";
import { MessageEditForm } from "@/components/chat/MessageEditForm";

export function MessageBubble({
  message,
  conversationId,
}: {
  message: Message;
  conversationId: string;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isMe = message.sender === "me";

  function handleDelete() {
    if (!window.confirm("確定要刪除這則訊息嗎？")) return;
    startTransition(async () => {
      const result = await deleteMessage(message.id, conversationId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("訊息已刪除");
    });
  }

  if (editing) {
    return (
      <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
        <div className="w-full max-w-sm">
          <MessageEditForm
            conversationId={conversationId}
            message={message}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group flex max-w-[80%] flex-col gap-1",
          isMe ? "items-end" : "items-start",
        )}
      >
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          <span>{isMe ? "我" : "對方"}</span>
          <span>·</span>
          <span>{MESSAGE_TYPE_LABEL[message.message_type]}</span>
          {(message.occurred_date || message.occurred_time) && (
            <>
              <span>·</span>
              <span>
                {message.occurred_date ?? ""} {message.occurred_time ?? ""}
              </span>
            </>
          )}
        </div>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm",
            isMe
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
          )}
        >
          {message.content || (
            <span className="italic opacity-70">（無內容）</span>
          )}
        </div>
        {message.note && (
          <p className="max-w-full text-xs italic text-zinc-400 dark:text-zinc-500">
            備註：{message.note}
          </p>
        )}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2 py-0.5 text-xs"
            onClick={() => setEditing(true)}
          >
            編輯
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={isPending}
            className="px-2 py-0.5 text-xs text-red-600 dark:text-red-400"
            onClick={handleDelete}
          >
            刪除
          </Button>
        </div>
      </div>
    </div>
  );
}
