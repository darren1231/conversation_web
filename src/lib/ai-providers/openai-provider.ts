import {
  AIProvider,
  ParsedMessage,
  ProviderPricing,
  ReplySuggestion,
  SuggestRepliesInput,
  SuggestRepliesResult,
} from "./types";

/** 模型有時會把 JSON 包在 markdown 代码块里，先剥掉再 parse。 */
function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  return fenced ? fenced[1] : content;
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.openai.com/v1";

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/models/${this.model}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error?.message || `API returned ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  async parseConversationImage(
    imageBase64: string
  ): Promise<ParsedMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: `Please extract all messages from this conversation screenshot.
                  Return a JSON array with this exact format (no markdown, just raw JSON):
                  [
                    {"sender": "me", "content": "message text", "timestamp": "optional timestamp"},
                    {"sender": "them", "content": "reply text", "timestamp": "optional timestamp"}
                  ]

                  Rules:
                  - Identify who is "me" (usually the user) and who is "them" (other person)
                  - Extract all messages in order
                  - Keep exact formatting and emojis
                  - If timestamps are visible, include them in ISO format
                  - Return ONLY the JSON array, no other text`,
                },
              ],
            },
          ],
          temperature: 0,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `OpenAI API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const messages: ParsedMessage[] = JSON.parse(extractJson(content));

      // 验证格式
      if (!Array.isArray(messages)) {
        throw new Error("Response is not an array");
      }

      return messages.filter(
        (msg) =>
          msg.sender &&
          (msg.sender === "me" || msg.sender === "them") &&
          msg.content
      );
    } catch (error) {
      throw new Error(
        `Failed to parse image with OpenAI: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async suggestReplies(
    input: SuggestRepliesInput
  ): Promise<SuggestRepliesResult> {
    const {
      contactName,
      contactProfile,
      conversationContext,
      messages,
      guidance,
      count,
    } = input;

    const transcript = messages
      .map((m) => `${m.sender === "me" ? "我" : contactName}：${m.content}`)
      .join("\n");

    const lastFromThem =
      messages.length > 0 && messages[messages.length - 1].sender === "them";

    const systemPrompt = `你是一位擅長人際溝通的對話教練，專門幫使用者想「下一句要怎麼回」。

你的任務是提供 ${count} 個**走向明顯不同**的回覆選項，讓使用者挑一個直接送出。

硬性要求：
1. 每個選項的溝通策略要真的不一樣（例如：順著對方的話延伸、拋新話題、幽默帶過、認真回應、反問對方、推進見面邀約）。不要只是同義改寫，那樣沒有意義。
2. content 必須是「可以直接複製貼上送出」的訊息原文。不要加引號、不要寫成「你可以說…」、不要有任何說明性文字。
3. 語氣和長度要貼近對話紀錄裡「我」原本的說話習慣。對方講得短就別回長篇大論。
4. 語言跟隨對話紀錄。對話是繁體中文就用繁體中文，是英文就用英文。
5. 只根據提供的對話內容發揮，不要編造沒發生過的共同經歷或事實。
6. reason 用一句話說明這樣回的效果，寫給使用者看，不要說教。

只輸出 JSON 陣列，不要 markdown、不要其他文字：
[
  {"style": "走向標籤（4-8字）", "content": "可直接送出的訊息", "reason": "一句話說明效果"}
]`;

    const sections = [
      `【聊天對象】${contactName}`,
      contactProfile ? `【對象背景】\n${contactProfile}` : null,
      conversationContext ? `【這次對話的背景】\n${conversationContext}` : null,
      `【對話紀錄】\n${transcript}`,
      lastFromThem
        ? `【任務】${contactName} 剛說完上面最後那句，請想出「我」接下來可以怎麼回。`
        : `【任務】上面最後一句是「我」說的，對方還沒回。請想出「我」可以再補一句什麼，來延續話題或化解冷場。`,
      guidance
        ? `【使用者的指示】${guidance}\n請務必讓所有選項都符合這個方向，這比上面的策略多樣性更優先。`
        : null,
    ].filter(Boolean);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: sections.join("\n\n") },
          ],
          // 拉高 temperature，因為這個功能的價值就在於選項要夠不一樣。
          temperature: 0.9,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error?.message || `OpenAI API error: ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("OpenAI 沒有回傳內容");

      const parsed = JSON.parse(extractJson(content));
      if (!Array.isArray(parsed)) {
        throw new Error("回傳格式不是陣列");
      }

      const suggestions: ReplySuggestion[] = parsed
        .filter((s) => s && typeof s.content === "string" && s.content.trim())
        .map((s) => ({
          style: String(s.style ?? "建議回覆").trim(),
          content: String(s.content).trim(),
          reason: String(s.reason ?? "").trim(),
        }));

      if (suggestions.length === 0) {
        throw new Error("沒有產生任何可用的建議");
      }

      return {
        suggestions,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      throw new Error(
        `產生建議回覆失敗：${
          error instanceof Error ? error.message : "未知錯誤"
        }`
      );
    }
  }

  getPricing(): ProviderPricing {
    // OpenAI pricing as of 2025-08
    // Reference: https://openai.com/pricing
    const pricingMap: Record<string, ProviderPricing> = {
      "gpt-4o": {
        inputCostPer1M: 2.5, // $2.50 per 1M input tokens
        outputCostPer1M: 10.0, // $10.00 per 1M output tokens
      },
      "gpt-4o-mini": {
        inputCostPer1M: 0.15, // $0.15 per 1M input tokens
        outputCostPer1M: 0.6, // $0.60 per 1M output tokens
      },
      "gpt-4-turbo": {
        inputCostPer1M: 10.0,
        outputCostPer1M: 30.0,
      },
      "gpt-4": {
        inputCostPer1M: 30.0,
        outputCostPer1M: 60.0,
      },
      "gpt-3.5-turbo": {
        inputCostPer1M: 0.5,
        outputCostPer1M: 1.5,
      },
    };

    return pricingMap[this.model] || pricingMap["gpt-4o"];
  }
}
