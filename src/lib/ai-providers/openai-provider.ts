import { AIProvider, ParsedMessage, ProviderPricing } from "./types";

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

      // 尝试提取 JSON（可能被包含在 markdown 代码块中）
      let jsonStr = content;
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const messages: ParsedMessage[] = JSON.parse(jsonStr);

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

  getPricing(): ProviderPricing {
    // OpenAI pricing as of 2025-02
    // Reference: https://openai.com/pricing
    const pricingMap: Record<string, ProviderPricing> = {
      "gpt-4o": {
        inputCostPer1M: 2.5, // $2.50 per 1M input tokens
        outputCostPer1M: 10.0, // $10.00 per 1M output tokens
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
