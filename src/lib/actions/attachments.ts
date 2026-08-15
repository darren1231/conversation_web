"use server";

import { refresh, revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import type { ActionResult } from "@/lib/actions/contacts";
import { removeStorageObjects } from "@/lib/storage";

export async function addAttachment(
  conversationId: string,
  storagePath: string,
  caption: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "請重新登入" };

  const { data: last } = await supabase
    .from("attachments")
    .select("sort_order")
    .eq("conversation_id", conversationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      storage_path: storagePath,
      caption: caption || null,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  refresh();
  return { data: { id: data.id } };
}

export async function updateAttachmentCaption(
  attachmentId: string,
  conversationId: string,
  caption: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("attachments")
    .update({ caption: caption || null })
    .eq("id", attachmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  refresh();
  return {};
}

export async function reorderAttachments(
  conversationId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "請重新登入" };

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("attachments")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("user_id", user.id),
    ),
  );

  revalidatePath(`/conversations/${conversationId}`);
  refresh();
  return {};
}

export async function deleteAttachment(
  attachmentId: string,
  conversationId: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await removeStorageObjects(supabase, [storagePath]);

  revalidatePath(`/conversations/${conversationId}`);
  refresh();
  return {};
}
