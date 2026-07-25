"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { Contact } from "@/lib/supabase/types";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  INTERACTION_STATUS_OPTIONS,
  PLATFORM_SUGGESTIONS,
} from "@/lib/constants";
import {
  createContact,
  updateContact,
  updateContactAvatar,
} from "@/lib/actions/contacts";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateImage } from "@/lib/storage";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/Field";

export function ContactForm({
  contact,
  avatarSignedUrl,
}: {
  contact?: Contact;
  avatarSignedUrl?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    avatarSignedUrl ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = contact
        ? await updateContact(contact.id, formData)
        : await createContact(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const contactId = contact?.id ?? result.data?.id;

      if (avatarFile && contactId) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const uploadResult = await uploadPrivateImage(
            supabase,
            user.id,
            `avatars/${contactId}`,
            avatarFile,
          );
          if ("error" in uploadResult) {
            toast.error(`頭像上傳失敗：${uploadResult.error}`);
          } else {
            await updateContactAvatar(contactId, uploadResult.path);
          }
        }
      }

      toast.success(contact ? "人物資料已更新" : "人物已建立");
      router.push(`/contacts/${contactId}`);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={avatarPreview} name={contact?.nickname ?? "?"} size={64} />
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            上傳頭像
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      <FieldGroup>
        <Label htmlFor="nickname" required>
          暱稱
        </Label>
        <Input
          id="nickname"
          name="nickname"
          required
          defaultValue={contact?.nickname}
          placeholder="例如：Joy"
        />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label htmlFor="relationship_type">關係類型</Label>
          <Select
            id="relationship_type"
            name="relationship_type"
            defaultValue={contact?.relationship_type ?? ""}
          >
            <option value="">未設定</option>
            {RELATIONSHIP_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="status">目前互動狀態</Label>
          <Select id="status" name="status" defaultValue={contact?.status ?? "active"}>
            {INTERACTION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label htmlFor="platform">常用聊天平台</Label>
        <Input
          id="platform"
          name="platform"
          list="platform-suggestions"
          defaultValue={contact?.platform ?? ""}
          placeholder="例如：LINE"
        />
        <datalist id="platform-suggestions">
          {PLATFORM_SUGGESTIONS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="met_through">認識方式</Label>
        <Input
          id="met_through"
          name="met_through"
          defaultValue={contact?.met_through ?? ""}
          placeholder="例如：交友軟體、朋友介紹"
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="interests">興趣與個性</Label>
        <Textarea
          id="interests"
          name="interests"
          rows={3}
          defaultValue={contact?.interests ?? ""}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="background">重要背景</Label>
        <Textarea
          id="background"
          name="background"
          rows={3}
          defaultValue={contact?.background ?? ""}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="private_notes">私人備註</Label>
        <Textarea
          id="private_notes"
          name="private_notes"
          rows={3}
          defaultValue={contact?.private_notes ?? ""}
        />
      </FieldGroup>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          取消
        </Button>
        <Button type="submit" loading={isPending}>
          {contact ? "儲存變更" : "建立人物"}
        </Button>
      </div>
    </form>
  );
}
