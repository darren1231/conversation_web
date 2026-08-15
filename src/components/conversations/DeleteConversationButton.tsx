"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteConversation } from "@/lib/actions/conversations";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export function DeleteConversationButton({
  conversationId,
  contactId,
}: {
  conversationId: string;
  contactId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm("確定要刪除這段對話嗎？所有訊息與截圖也會一併刪除，且無法復原。")
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteConversation(conversationId, contactId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("對話已刪除");
      router.push(`/contacts/${contactId}`);
    });
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      loading={isPending}
      onClick={handleDelete}
    >
      刪除對話
    </Button>
  );
}
