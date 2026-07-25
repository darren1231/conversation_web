"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Message } from "@/lib/supabase/types";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { BatchPasteDialog } from "@/components/chat/BatchPasteDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function ChatEditor({
  conversationId,
  messages,
}: {
  conversationId: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [showBatchPaste, setShowBatchPaste] = useState(false);

  function refresh() {
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          聊天訊息
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowBatchPaste(true)}
        >
          批次貼上對話
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
        {messages.length === 0 ? (
          <EmptyState
            title="還沒有任何訊息"
            description="使用下方輸入框新增第一則訊息，或使用批次貼上快速匯入整段對話。"
          />
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              conversationId={conversationId}
              onChanged={refresh}
            />
          ))
        )}
      </div>

      <MessageComposer conversationId={conversationId} onAdded={refresh} />

      {showBatchPaste && (
        <BatchPasteDialog
          conversationId={conversationId}
          onClose={() => setShowBatchPaste(false)}
          onSaved={() => {
            setShowBatchPaste(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
