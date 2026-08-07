"use server";

import { createClient } from "@/lib/supabase/server";

interface CreateCredentialInput {
  provider: string;
  model: string;
  apiKey: string;
}

interface APICredential {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 创建或更新 API 凭证
export async function createOrUpdateCredential(input: CreateCredentialInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 先尝试删除同 provider 的旧凭证
  await supabase
    .from("api_credentials")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", input.provider);

  const { data, error } = await supabase
    .from("api_credentials")
    .insert({
      user_id: user.id,
      provider: input.provider,
      model: input.model,
      api_key: input.apiKey,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save credentials: ${error.message}`);
  }

  return data;
}

// 获取用户的所有凭证
export async function getCredentials(): Promise<APICredential[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("api_credentials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch credentials: ${error.message}`);
  }

  return data || [];
}

// 获取活跃的凭证（指定 provider）
export async function getActiveCredential(provider: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("api_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    throw new Error(`Failed to fetch credential: ${error.message}`);
  }

  return data || null;
}

// 获取凭证及其 API Key（仅在服务器端）
export async function getCredentialWithKey(
  credentialId: string
): Promise<{ credential: APICredential & { api_key: string } }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("api_credentials")
    .select("*")
    .eq("id", credentialId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error(`Credential not found: ${error.message}`);
  }

  return {
    credential: {
      ...data,
      api_key: data.api_key,
    },
  };
}

// 删除凭证
export async function deleteCredential(credentialId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("api_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete credential: ${error.message}`);
  }
}

// 记录 API 使用情况
export async function logAPIUsage(
  credentialId: string,
  data: {
    provider: string;
    model: string;
    conversation_id?: string;
    input_tokens: number;
    output_tokens: number;
    total_cost: number;
    operation: string;
    status: "success" | "failed";
    error_message?: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const totalTokens = data.input_tokens + data.output_tokens;

  const { error } = await supabase.from("api_usage_logs").insert({
    user_id: user.id,
    api_credential_id: credentialId,
    provider: data.provider,
    model: data.model,
    conversation_id: data.conversation_id || null,
    input_tokens: data.input_tokens,
    output_tokens: data.output_tokens,
    total_tokens: totalTokens,
    total_cost: data.total_cost,
    operation: data.operation,
    status: data.status,
    error_message: data.error_message || null,
  });

  if (error) {
    console.error("Failed to log API usage:", error);
    // 不抛出异常，日志记录失败不应该影响主流程
  }
}

// 获取成本统计
export async function getUsageStats(period: "day" | "month" | "all" = "all") {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  let query = supabase
    .from("api_usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (period === "day") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte("created_at", today.toISOString());
  } else if (period === "month") {
    const firstDay = new Date();
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    query = query.gte("created_at", firstDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch usage stats: ${error.message}`);
  }

  const logs = data || [];
  const totalCost = logs.reduce((sum, log) => sum + (log.total_cost || 0), 0);
  const totalTokens = logs.reduce(
    (sum, log) => sum + (log.total_tokens || 0),
    0
  );

  return {
    totalCost,
    totalTokens,
    callCount: logs.length,
    logs,
  };
}
