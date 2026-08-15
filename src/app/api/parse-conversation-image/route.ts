import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ProviderFactory } from "@/lib/ai-providers/provider-factory";
import {
  getCredentialWithKey,
  logAPIUsage,
} from "@/lib/actions/api-credentials";

/** 名字会被拼进 prompt，所以只收短字串，太长或非字串一律当没给。 */
function asName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= 60 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, credentialId, conversationId, contactName, selfName } =
      body;

    if (!imageBase64 || !credentialId) {
      return NextResponse.json(
        { error: "Missing required fields: imageBase64, credentialId" },
        { status: 400 }
      );
    }

    // 获取用户的凭证及 API Key
    const { credential } = await getCredentialWithKey(credentialId);

    // 创建 Provider 实例
    const provider = ProviderFactory.createProvider({
      provider: credential.provider,
      model: credential.model,
      apiKey: credential.api_key,
    });

    // 解析图片。带上双方的名字，模型判断「这句是谁说的」会稳定很多。
    const messages = await provider.parseConversationImage(imageBase64, {
      contactName: asName(contactName),
      selfName: asName(selfName),
    });

    // 获取 pricing 信息并计算成本
    const pricing = provider.getPricing();

    // OpenAI Vision 调用的成本估算
    // 假设平均每张图片 100 input tokens + 500 output tokens
    // （实际值取决于图片复杂度和模型）
    const estimatedInputTokens = 100;
    const estimatedOutputTokens = 500;

    const inputCost = (estimatedInputTokens / 1000000) * pricing.inputCostPer1M;
    const outputCost =
      (estimatedOutputTokens / 1000000) * pricing.outputCostPer1M;
    const totalCost = inputCost + outputCost;

    // 记录 API 使用
    try {
      await logAPIUsage(credentialId, {
        provider: credential.provider,
        model: credential.model,
        conversation_id: conversationId || undefined,
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens,
        total_cost: totalCost,
        operation: "parse-image",
        status: "success",
      });
    } catch (logError) {
      console.error("Failed to log API usage:", logError);
      // 继续执行，不中断主流程
    }

    return NextResponse.json({
      success: true,
      messages,
      cost: {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalCost: parseFloat(totalCost.toFixed(8)),
      },
    });
  } catch (error) {
    console.error("Parse image error:", error);

    // 尝试记录失败的日志
    try {
      const body = await request.json();
      const { credentialId } = body;

      if (credentialId) {
        const { credential } = await getCredentialWithKey(credentialId);
        await logAPIUsage(credentialId, {
          provider: credential.provider,
          model: credential.model,
          input_tokens: 0,
          output_tokens: 0,
          total_cost: 0,
          operation: "parse-image",
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse image",
      },
      { status: 500 }
    );
  }
}
