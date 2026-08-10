"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/contacts";

/**
 * 讀取使用者自訂的分析風格 prompt。
 * 回傳 null 代表沒設定過，呼叫端要退回內建預設。
 */
export async function getAISystemPrompt(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_settings")
    .select("system_prompt")
    .eq("user_id", user.id)
    .maybeSingle();

  // 資料表還沒建立（migration 沒跑）也不該讓建議功能整個掛掉。
  if (error) {
    console.error("Failed to read ai_settings:", error.message);
    return null;
  }

  const prompt = data?.system_prompt?.trim();
  return prompt ? prompt : null;
}

export async function saveAISystemPrompt(
  systemPrompt: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請重新登入" };

  const trimmed = systemPrompt.trim();

  const { error } = await supabase.from("ai_settings").upsert(
    {
      user_id: user.id,
      // 存空字串等同「恢復預設」，讀取時會被當成沒設定。
      system_prompt: trimmed || null,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings/ai-prompt");
  return {};
}
