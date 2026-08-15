import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ProviderFactory } from "@/lib/ai-providers/provider-factory";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, model, apiKey } = body;

    if (!provider || !model || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: provider, model, apiKey" },
        { status: 400 }
      );
    }

    // 创建 Provider 实例
    const providerInstance = ProviderFactory.createProvider({
      provider,
      model,
      apiKey,
    });

    // 测试连接
    const result = await providerInstance.testConnection();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Connection test failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key is valid",
    });
  } catch (error) {
    console.error("API test error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to test API key",
      },
      { status: 500 }
    );
  }
}
