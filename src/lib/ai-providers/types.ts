// 抽象接口：所有 AI Provider 都要实现
export interface AIProvider {
  // 测试 API 连接
  testConnection(): Promise<{ success: boolean; error?: string }>;

  // 解析对话图片
  parseConversationImage(imageBase64: string): Promise<ParsedMessage[]>;

  // 获取 pricing 信息（用于成本计算）
  getPricing(): ProviderPricing;
}

export interface ParsedMessage {
  sender: "me" | "them";
  content: string;
  timestamp?: string; // ISO format
}

export interface ProviderPricing {
  inputCostPer1M: number; // USD per 1M tokens
  outputCostPer1M: number; // USD per 1M tokens
}

export interface APICredentialConfig {
  provider: string; // "openai", "claude", etc.
  model: string;
  apiKey: string;
}

// 支持的 Provider 列表
export type SupportedProvider = "openai" | "claude" | "gemini";

export const PROVIDER_MODELS: Record<SupportedProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  claude: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro"],
};
