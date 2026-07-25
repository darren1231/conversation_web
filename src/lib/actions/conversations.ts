"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/contacts";

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
