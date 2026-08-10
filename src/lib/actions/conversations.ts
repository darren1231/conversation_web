"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/contacts";
import type { MessageSender } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

export interface ConversationFormInput {
  title: string;
  occurred_at: string;
  platform: string;
  context: string;
  goal: string;
  my_mood: string;
  their_mood: string;
  outcome: string;
  summary: string;
  tags: string;
}

function readConversationInput(formData: FormData): ConversationFormInput {
  return {
    title: String(formData.get("title") ?? "").trim(),
    occurred_at: String(formData.get("occurred_at") ?? "").trim(),
    platform: String(formData.get("platform") ?? "").trim(),
    context: String(formData.get("context") ?? "").trim(),
    goal: String(formData.get("goal") ?? "").trim(),
    my_mood: String(formData.get("my_mood") ?? "").trim(),
    their_mood: String(formData.get("their_mood") ?? "").trim(),
    outcome: String(formData.get("outcome") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    tags: String(formData.get("tags") ?? "").trim(),
  };
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,，\s]+/)
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean),
    ),
  );
}

async function syncTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string,
  tags: string[],
) {
  await supabase
    .from("conversation_tags")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (tags.length > 0) {
    await supabase.from("conversation_tags").insert(
      tags.map((tag) => ({
        user_id: userId,
        conversation_id: conversationId,
        tag,
      })),
    );
  }
}

export async function createConversation(
  contactId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const input = readConversationInput(formData);
  if (!input.title) return { error: "對話標題為必填欄位" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      title: input.title,
      occurred_at: input.occurred_at
        ? new Date(input.occurred_at).toISOString()
        : new Date().toISOString(),
      platform: input.platform || null,
      context: input.context || null,
      goal: input.goal || null,
      my_mood: input.my_mood || null,
      their_mood: input.their_mood || null,
      outcome: input.outcome || null,
      summary: input.summary || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const tags = parseTags(input.tags);
  if (tags.length > 0) await syncTags(supabase, user.id, data.id, tags);

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
  return { data: { id: data.id } };
}

export interface LogEntryInput {
  sender: MessageSender;
  content: string;
  occurred_date: string | null;
  occurred_time: string | null;
}

/**
 * 「一句一句」記錄流程的儲存入口：一次建立對話 + 底下所有訊息。
 *
 * 使用者不需要先填一張對話表單 —— 標題會依日期自動產生，之後仍可在對話
 * 編輯頁補上平台、心情、標籤等欄位。
 *
 * 訊息順序以陣列順序為準（寫進 sort_order），不依時間排序，因為使用者
 * 輸入的時間只精確到分鐘，同一分鐘內多句話會排不出先後。
 */
export async function createConversationLog(
  contactId: string,
  entries: LogEntryInput[],
  title?: string,
): Promise<ActionResult<{ id: string; count: number }>> {
  const cleaned = entries.filter((e) => e.content.trim().length > 0);
  if (cleaned.length === 0) return { error: "至少要有一句對話才能儲存" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!contact) return { error: "找不到這位聊天人物" };

  // 對話發生時間取第一句的時間，沒填就用現在。
  const first = cleaned[0];
  const occurredAt =
    first.occurred_date && first.occurred_time
      ? new Date(`${first.occurred_date}T${first.occurred_time}`).toISOString()
      : new Date().toISOString();

  const fallbackTitle = `${formatDate(occurredAt)} 的對話`;

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      title: title?.trim() || fallbackTitle,
      occurred_at: occurredAt,
    })
    .select("id")
    .single();

  if (convError) return { error: convError.message };

  const rows = cleaned.map((entry, index) => ({
    user_id: user.id,
    conversation_id: conversation.id,
    sender: entry.sender,
    message_type: "text" as const,
    content: entry.content.trim(),
    occurred_date: entry.occurred_date || null,
    occurred_time: entry.occurred_time || null,
    sort_order: index,
  }));

  const { error: msgError } = await supabase.from("messages").insert(rows);

  if (msgError) {
    // 訊息寫不進去的話，剛剛那筆空對話就沒有意義，回收掉避免留下空殼。
    await supabase.from("conversations").delete().eq("id", conversation.id);
    return { error: msgError.message };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/conversations/${conversation.id}`);
  revalidatePath("/");
  return { data: { id: conversation.id, count: rows.length } };
}

/**
 * 把「一句一句」記錄的結果，附加到一段已存在的對話後面。
 */
export async function appendConversationLog(
  conversationId: string,
  entries: LogEntryInput[],
): Promise<ActionResult<{ count: number }>> {
  const cleaned = entries.filter((e) => e.content.trim().length > 0);
  if (cleaned.length === 0) return { error: "至少要有一句對話才能儲存" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conversation) return { error: "找不到這段對話" };

  const { data: last } = await supabase
    .from("messages")
    .select("sort_order")
    .eq("conversation_id", conversationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sortOrder = (last?.sort_order ?? -1) + 1;

  const rows = cleaned.map((entry) => ({
    user_id: user.id,
    conversation_id: conversationId,
    sender: entry.sender,
    message_type: "text" as const,
    content: entry.content.trim(),
    occurred_date: entry.occurred_date || null,
    occurred_time: entry.occurred_time || null,
    sort_order: sortOrder++,
  }));

  const { error } = await supabase.from("messages").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath(`/contacts/${conversation.contact_id}`);
  return { data: { count: rows.length } };
}

export async function updateConversation(
  conversationId: string,
  contactId: string,
  formData: FormData,
): Promise<ActionResult> {
  const input = readConversationInput(formData);
  if (!input.title) return { error: "對話標題為必填欄位" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("conversations")
    .update({
      title: input.title,
      occurred_at: input.occurred_at
        ? new Date(input.occurred_at).toISOString()
        : new Date().toISOString(),
      platform: input.platform || null,
      context: input.context || null,
      goal: input.goal || null,
      my_mood: input.my_mood || null,
      their_mood: input.their_mood || null,
      outcome: input.outcome || null,
      summary: input.summary || null,
    })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await syncTags(supabase, user.id, conversationId, parseTags(input.tags));

  revalidatePath(`/conversations/${conversationId}`);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
  return {};
}

export async function deleteConversation(
  conversationId: string,
  contactId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
  return {};
}
