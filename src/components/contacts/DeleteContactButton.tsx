"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteContact } from "@/lib/actions/contacts";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        "確定要刪除這位聊天人物嗎？所有相關的對話、訊息與截圖也會一併刪除，且無法復原。",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteContact(contactId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("人物已刪除");
      router.push("/contacts");
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
      刪除人物
    </Button>
  );
}
