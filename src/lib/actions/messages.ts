"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/contacts";
import type { MessageSender, MessageType } from "@/lib/supabase/types";

export interface MessageInput {
  sender: MessageSender;
  message_type: MessageType;
  content: string;
  occurred_date?: string | null;
  occurred_time?: string | null;
  note?: string | null;
}

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
) {
  const { data } = await supabase
    .from("messages")
    .select("sort_order")
    .eq("conversation_id", conversationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 1;
}

export async function addMessage(
  conversationId: string,
  input: MessageInput,
): Promise<ActionResult<{ id: string }>> {
  if (!input.content?.trim() && input.message_type === "text") {
    return { error: "訊息內容不能為空" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const sortOrder = await nextSortOrder(supabase, conversationId);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      sender: input.sender,
      message_type: input.message_type,
      content: input.content || null,
      occurred_date: input.occurred_date || null,
      occurred_time: input.occurred_time || null,
      note: input.note || null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  return { data: { id: data.id } };
}

export async function batchAddMessages(
  conversationId: string,
  items: MessageInput[],
): Promise<ActionResult<{ count: number }>> {
  if (items.length === 0) return { error: "沒有可儲存的訊息" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  let sortOrder = await nextSortOrder(supabase, conversationId);

  const rows = items.map((item) => ({
    user_id: user.id,
    conversation_id: conversationId,
    sender: item.sender,
    message_type: item.message_type,
    content: item.content || null,
    occurred_date: item.occurred_date || null,
    occurred_time: item.occurred_time || null,
    note: item.note || null,
    sort_order: sortOrder++,
  }));

  const { error } = await supabase.from("messages").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  return { data: { count: rows.length } };
}

export async function updateMessage(
  messageId: string,
  conversationId: string,
  input: MessageInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("messages")
    .update({
      sender: input.sender,
      message_type: input.message_type,
      content: input.content || null,
      occurred_date: input.occurred_date || null,
      occurred_time: input.occurred_time || null,
      note: input.note || null,
    })
    .eq("id", messageId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  return {};
}

export async function deleteMessage(
  messageId: string,
  conversationId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  return {};
}
