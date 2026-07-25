"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InteractionStatus, RelationshipType } from "@/lib/supabase/types";

export interface ContactFormInput {
  nickname: string;
  relationship_type: RelationshipType | "";
  platform: string;
  met_through: string;
  interests: string;
  personality: string;
  background: string;
  status: InteractionStatus | "";
  private_notes: string;
}

export interface ActionResult<T = undefined> {
  error?: string;
  data?: T;
}

function readContactInput(formData: FormData): ContactFormInput {
  return {
    nickname: String(formData.get("nickname") ?? "").trim(),
    relationship_type: (formData.get("relationship_type") as RelationshipType) || "",
    platform: String(formData.get("platform") ?? "").trim(),
    met_through: String(formData.get("met_through") ?? "").trim(),
    interests: String(formData.get("interests") ?? "").trim(),
    personality: String(formData.get("personality") ?? "").trim(),
    background: String(formData.get("background") ?? "").trim(),
    status: (formData.get("status") as InteractionStatus) || "active",
    private_notes: String(formData.get("private_notes") ?? "").trim(),
  };
}

export async function createContact(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const input = readContactInput(formData);
  if (!input.nickname) {
    return { error: "暱稱為必填欄位" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      nickname: input.nickname,
      relationship_type: input.relationship_type || null,
      platform: input.platform || null,
      met_through: input.met_through || null,
      interests: input.interests || null,
      personality: input.personality || null,
      background: input.background || null,
      status: input.status || "active",
      private_notes: input.private_notes || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath("/");
  return { data: { id: data.id } };
}

export async function updateContact(
  contactId: string,
  formData: FormData,
): Promise<ActionResult> {
  const input = readContactInput(formData);
  if (!input.nickname) {
    return { error: "暱稱為必填欄位" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("contacts")
    .update({
      nickname: input.nickname,
      relationship_type: input.relationship_type || null,
      platform: input.platform || null,
      met_through: input.met_through || null,
      interests: input.interests || null,
      personality: input.personality || null,
      background: input.background || null,
      status: input.status || "active",
      private_notes: input.private_notes || null,
    })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
  return {};
}

export async function updateContactAvatar(
  contactId: string,
  storagePath: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("contacts")
    .update({ avatar_url: storagePath })
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
  return {};
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath("/");
  return {};
}
