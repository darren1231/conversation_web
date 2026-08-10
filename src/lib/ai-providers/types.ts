// 抽象接口：所有 AI Provider 都要实现
export interface AIProvider {
  // 测试 API 连接
  testConnection(): Promise<{ success: boolean; error?: string }>;

  // 解析对话图片
  parseConversationImage(imageBase64: string): Promise<ParsedMessage[]>;

  // 根据对话纪录，产生多个走向不同的建议回覆
  suggestReplies(input: SuggestRepliesInput): Promise<SuggestRepliesResult>;

  // 获取 pricing 信息（用于成本计算）
  getPricing(): ProviderPricing;
}

export interface ParsedMessage {
  sender: "me" | "them";
  content: string;
  timestamp?: string; // ISO format
}

/** 一則建議回覆。style 是走向標籤，content 可直接複製送出。 */
export interface ReplySuggestion {
  style: string;
  content: string;
  reason: string;
}

export interface SuggestRepliesInput {
  /** 對方的稱呼，讓建議讀起來自然。 */
  contactName: string;
  /** 關係、興趣、背景等人物資料，可省略。 */
  contactProfile?: string;
  /** 這段對話的背景與目標，可省略。 */
  conversationContext?: string;
  /** 對話紀錄，依實際順序排列。 */
  messages: { sender: "me" | "them"; content: string }[];
  /** 使用者對這次建議的額外指示，例如「想約她週末出來」「講得幽默一點」。 */
  guidance?: string;
  /** 要幾個走向不同的建議。 */
  count: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface SuggestRepliesResult {
  suggestions: ReplySuggestion[];
  /** 由 API 回報的實際用量，用於成本計算。 */
  usage: TokenUsage;
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
