"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateImage } from "@/lib/storage";
import { addAttachment } from "@/lib/actions/attachments";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export function AttachmentUploader({
  conversationId,
  onUploaded,
}: {
  conversationId: string;
  onUploaded: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";

    setUploading(true);
    setProgress({ done: 0, total: files.length });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("請重新登入");
      setUploading(false);
      setProgress(null);
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const uploadResult = await uploadPrivateImage(
        supabase,
        user.id,
        `screenshots/${conversationId}`,
        file,
      );
      if ("error" in uploadResult) {
        failCount++;
      } else {
        const result = await addAttachment(conversationId, uploadResult.path, "");
        if (result.error) failCount++;
        else successCount++;
      }
      setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }

    setUploading(false);
    setProgress(null);

    if (successCount > 0) {
      toast.success(`已上傳 ${successCount} 張截圖`);
      onUploaded();
    }
    if (failCount > 0) {
      toast.error(`${failCount} 張截圖上傳失敗`);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading && progress
          ? `上傳中 ${progress.done}/${progress.total}`
          : "上傳聊天截圖"}
      </Button>
    </div>
  );
}
