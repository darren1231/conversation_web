"use client";

import { useState, useTransition } from "react";
import type { Message, MessageSender, MessageType } from "@/lib/supabase/types";
import { updateMessage } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { MESSAGE_TYPE_OPTIONS } from "@/lib/constants";
import { Card } from "@/components/ui/Card";

export function MessageEditForm({
  conversationId,
  message,
  onSaved,
  onCancel,
}: {
  conversationId: string;
  message: Message;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [sender, setSender] = useState<MessageSender>(message.sender);
  const [messageType, setMessageType] = useState<MessageType>(
    message.message_type,
  );
  const [content, setContent] = useState(message.content ?? "");
  const [date, setDate] = useState(message.occurred_date ?? "");
  const [time, setTime] = useState(message.occurred_time ?? "");
  const [note, setNote] = useState(message.note ?? "");

  function handleSave() {
    startTransition(async () => {
      const result = await updateMessage(message.id, conversationId, {
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
      toast.success("訊息已更新");
      onSaved();
    });
  }

  return (
    <Card className="p-3">
      <div className="mb-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={sender === "them" ? "primary" : "secondary"}
          onClick={() => setSender("them")}
        >
          對方
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sender === "me" ? "primary" : "secondary"}
          onClick={() => setSender("me")}
        >
          我
        </Button>
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
      </div>
      <Textarea
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="訊息內容"
        className="mb-2"
      />
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
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="備註（選填）"
        className="mb-3"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button type="button" size="sm" loading={isPending} onClick={handleSave}>
          儲存
        </Button>
      </div>
    </Card>
  );
}
