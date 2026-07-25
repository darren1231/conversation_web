"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Attachment } from "@/lib/supabase/types";
import {
  deleteAttachment,
  reorderAttachments,
  updateAttachmentCaption,
} from "@/lib/actions/attachments";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { AttachmentUploader } from "@/components/attachments/AttachmentUploader";
import { EmptyState } from "@/components/ui/EmptyState";

export function AttachmentGrid({
  conversationId,
  attachments,
  signedUrls,
}: {
  conversationId: string;
  attachments: Attachment[];
  signedUrls: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [captions, setCaptions] = useState<Record<string, string>>(
    Object.fromEntries(attachments.map((a) => [a.id, a.caption ?? ""])),
  );

  function refresh() {
    router.refresh();
  }

  function handleCaptionBlur(attachmentId: string) {
    const caption = captions[attachmentId] ?? "";
    startTransition(async () => {
      const result = await updateAttachmentCaption(
        attachmentId,
        conversationId,
        caption,
      );
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(attachment: Attachment) {
    if (!window.confirm("確定要刪除這張截圖嗎？")) return;
    startTransition(async () => {
      const result = await deleteAttachment(
        attachment.id,
        conversationId,
        attachment.storage_path,
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("截圖已刪除");
      refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= attachments.length) return;
    const reordered = [...attachments];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    startTransition(async () => {
      const result = await reorderAttachments(
        conversationId,
        reordered.map((a) => a.id),
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          聊天截圖
        </h2>
        <AttachmentUploader conversationId={conversationId} onUploaded={refresh} />
      </div>

      {attachments.length === 0 ? (
        <EmptyState title="還沒有上傳任何截圖" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <div className="aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
                {signedUrls[attachment.storage_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrls[attachment.storage_path]}
                    alt={attachment.caption || "聊天截圖"}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-2">
                <Input
                  value={captions[attachment.id] ?? ""}
                  onChange={(e) =>
                    setCaptions((prev) => ({
                      ...prev,
                      [attachment.id]: e.target.value,
                    }))
                  }
                  onBlur={() => handleCaptionBlur(attachment.id)}
                  placeholder="新增圖片說明"
                  className="mb-2 text-xs"
                />
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0 || isPending}
                      onClick={() => move(index, -1)}
                      className="px-1.5 py-0.5"
                      aria-label="上移"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === attachments.length - 1 || isPending}
                      onClick={() => move(index, 1)}
                      className="px-1.5 py-0.5"
                      aria-label="下移"
                    >
                      ↓
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={isPending}
                    onClick={() => handleDelete(attachment)}
                    className="px-1.5 py-0.5 text-xs text-red-600 dark:text-red-400"
                  >
                    刪除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
