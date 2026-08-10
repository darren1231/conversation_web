import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProviderFactory } from "@/lib/ai-providers/provider-factory";
import {
  getCredentialWithKey,
  getCredentials,
  logAPIUsage,
} from "@/lib/actions/api-credentials";
import { getAISystemPrompt } from "@/lib/actions/ai-settings";
import { RELATIONSHIP_TYPE_LABEL } from "@/lib/constants";
import type { Contact, Conversation, Message } from "@/lib/supabase/types";

/** 只餵最近這幾則訊息給模型：太舊的內容對「下一句怎麼回」幫助有限，還會墊高成本。 */
const MAX_CONTEXT_MESSAGES = 40;
const MIN_SUGGESTIONS = 2;
const MAX_SUGGESTIONS = 5;

function buildContactProfile(contact: Contact | null): string | undefined {
  if (!contact) return undefined;
  const lines = [
    contact.relationship_type
      ? `關係：${RELATIONSHIP_TYPE_LABEL[contact.relationship_type]}`
      : null,
    contact.interests ? `興趣與個性：${contact.interests}` : null,
    contact.personality ? `個性：${contact.personality}` : null,
    contact.background ? `重要背景：${contact.background}` : null,
    contact.met_through ? `認識方式：${contact.met_through}` : null,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function buildConversationContext(
  conversation: Conversation
): string | undefined {
  const lines = [
    conversation.context ? `背景：${conversation.context}` : null,
    conversation.goal ? `我的目標：${conversation.goal}` : null,
    conversation.my_mood ? `我的心情：${conversation.my_mood}` : null,
    conversation.their_mood ? `對方的心情：${conversation.their_mood}` : null,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : undefined;
}

export async function POST(request: NextRequest) {
  let credentialIdForLog: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請重新登入" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, guidance, count } = body;
    let { credentialId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "缺少 conversationId" }, { status: 400 });
    }

    // 沒指定就用第一組可用的 API 設定，讓使用者不必每次挑。
    if (!credentialId) {
      const all = await getCredentials();
      const active = all.find((c) => c.is_active) ?? all[0];
      if (!active) {
        return NextResponse.json(
          { error: "尚未設定 AI API Key，請先到設定頁新增" },
          { status: 400 }
        );
      }
      credentialId = active.id;
    }
    credentialIdForLog = credentialId;

    const { data: conversationRow } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conversationRow) {
      return NextResponse.json({ error: "找不到這段對話" }, { status: 404 });
    }
    const conversation = conversationRow as Conversation;

    const [{ data: contactRow }, { data: messageRows }] = await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("id", conversation.contact_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("sender, content, sort_order, created_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const contact = (contactRow as Contact) ?? null;

    const messages = ((messageRows ?? []) as Pick<
      Message,
      "sender" | "content"
    >[])
      .filter((m) => m.content && m.content.trim())
      .map((m) => ({ sender: m.sender, content: m.content as string }));

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "這段對話還沒有任何訊息，先記錄幾句再讓 AI 建議" },
        { status: 400 }
      );
    }

    const requested = Number(count) || 3;
    const suggestionCount = Math.min(
      MAX_SUGGESTIONS,
      Math.max(MIN_SUGGESTIONS, requested)
    );

    const [{ credential }, customPrompt] = await Promise.all([
      getCredentialWithKey(credentialId),
      getAISystemPrompt(),
    ]);

    const provider = ProviderFactory.createProvider({
      provider: credential.provider,
      model: credential.model,
      apiKey: credential.api_key,
    });

    const { analysis, usage } = await provider.suggestReplies({
      contactName: contact?.nickname ?? "對方",
      contactProfile: buildContactProfile(contact),
      conversationContext: buildConversationContext(conversation),
      messages: messages.slice(-MAX_CONTEXT_MESSAGES),
      guidance: typeof guidance === "string" ? guidance.trim() : undefined,
      count: suggestionCount,
      systemPrompt: customPrompt ?? undefined,
    });

    const pricing = provider.getPricing();
    const totalCost =
      (usage.inputTokens / 1_000_000) * pricing.inputCostPer1M +
      (usage.outputTokens / 1_000_000) * pricing.outputCostPer1M;

    try {
      await logAPIUsage(credentialId, {
        provider: credential.provider,
        model: credential.model,
        conversation_id: conversationId,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        total_cost: totalCost,
        operation: "suggest-replies",
        status: "success",
      });
    } catch (logError) {
      // 記帳失敗不該讓使用者拿不到建議。
      console.error("Failed to log API usage:", logError);
    }

    return NextResponse.json({
      analysis,
      cost: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalCost: parseFloat(totalCost.toFixed(8)),
      },
    });
  } catch (error) {
    console.error("Suggest replies error:", error);
    const message =
      error instanceof Error ? error.message : "產生建議回覆失敗";

    if (credentialIdForLog) {
      try {
        const { credential } = await getCredentialWithKey(credentialIdForLog);
        await logAPIUsage(credentialIdForLog, {
          provider: credential.provider,
          model: credential.model,
          input_tokens: 0,
          output_tokens: 0,
          total_cost: 0,
          operation: "suggest-replies",
          status: "failed",
          error_message: message,
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
