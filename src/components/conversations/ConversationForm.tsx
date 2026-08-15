"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Conversation } from "@/lib/supabase/types";
import { createConversation, updateConversation } from "@/lib/actions/conversations";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Label, Textarea } from "@/components/ui/Field";
import { PLATFORM_SUGGESTIONS } from "@/lib/constants";
import { toDatetimeLocalValue } from "@/lib/utils";

export function ConversationForm({
  contactId,
  conversation,
  initialTags,
}: {
  contactId: string;
  conversation?: Conversation;
  initialTags?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = conversation
        ? await updateConversation(conversation.id, contactId, formData)
        : await createConversation(contactId, formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(conversation ? "對話已更新" : "對話已建立");
      const targetId = conversation?.id ?? result.data?.id;
      router.push(`/conversations/${targetId}`);
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl">
      <FieldGroup>
        <Label htmlFor="title" required>
          對話標題
        </Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={conversation?.title}
          placeholder="例如：第一次聊旅遊"
        />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="occurred_at">日期與時間</Label>
          <Input
            id="occurred_at"
            name="occurred_at"
            type="datetime-local"
            defaultValue={
              conversation
                ? toDatetimeLocalValue(conversation.occurred_at)
                : toDatetimeLocalValue(new Date().toISOString())
            }
          />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="platform">使用平台</Label>
          <Input
            id="platform"
            name="platform"
            list="platform-suggestions"
            defaultValue={conversation?.platform ?? ""}
          />
          <datalist id="platform-suggestions">
            {PLATFORM_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label htmlFor="context">對話背景</Label>
        <Textarea
          id="context"
          name="context"
          rows={2}
          defaultValue={conversation?.context ?? ""}
          placeholder="這次對話發生的情境或前情提要"
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="goal">聊天目標</Label>
        <Input
          id="goal"
          name="goal"
          defaultValue={conversation?.goal ?? ""}
          placeholder="例如：邀約週末見面"
        />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="my_mood">我當時的心情</Label>
          <Input
            id="my_mood"
            name="my_mood"
            defaultValue={conversation?.my_mood ?? ""}
            placeholder="例如：期待又緊張"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="their_mood">對方當時的心情</Label>
          <Input
            id="their_mood"
            name="their_mood"
            defaultValue={conversation?.their_mood ?? ""}
            placeholder="例如：心情不錯"
          />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label htmlFor="outcome">對話結果</Label>
        <Input
          id="outcome"
          name="outcome"
          defaultValue={conversation?.outcome ?? ""}
          placeholder="例如：成功約到週六吃飯"
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="summary">摘要</Label>
        <Textarea
          id="summary"
          name="summary"
          rows={3}
          defaultValue={conversation?.summary ?? ""}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="tags">標籤</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={initialTags?.join(", ") ?? ""}
          placeholder="以逗號或空白分隔，例如：邀約, 旅遊"
        />
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" loading={isPending}>
          {conversation ? "儲存變更" : "建立對話"}
        </Button>
      </div>
    </form>
  );
}
