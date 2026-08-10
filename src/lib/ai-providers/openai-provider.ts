import {
  AIProvider,
  ParsedMessage,
  ProviderPricing,
  ReplySuggestion,
  SuggestRepliesInput,
  SuggestRepliesResult,
} from "./types";
import { DEFAULT_ANALYSIS_PROMPT } from "./default-prompt";

/** 模型有時會把 JSON 包在 markdown 代码块里，先剥掉再 parse。 */
function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  return fenced ? fenced[1] : content;
}

/**
 * GPT-5 世代（含 gpt-5.6 sol/terra/luna）與 o 系列推理模型改了請求格式：
 * max_tokens 改名為 max_completion_tokens，temperature / top_p 等取樣參數
 * 直接被移除，送了會回 400 Unsupported parameter。
 */
function isNextGenModel(model: string): boolean {
  return /^(gpt-5|o[1-9])/i.test(model);
}

/** 錯誤訊息看起來像是「這個模型不吃舊參數」。 */
function looksLikeParamRejection(message: string): boolean {
  return /unsupported parameter|unsupported value|max_tokens|temperature/i.test(
    message
  );
}

interface ChatMessage {
  role: string;
  content: unknown;
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.openai.com/v1";

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private buildBody(
    messages: ChatMessage[],
    maxTokens: number,
    temperature: number,
    forceNextGen = false
  ) {
    const body: Record<string, unknown> = { model: this.model, messages };

    if (forceNextGen || isNextGenModel(this.model)) {
      body.max_completion_tokens = maxTokens;
      // temperature 不送 —— 這代模型只接受預設值。
    } else {
      body.max_tokens = maxTokens;
      body.temperature = temperature;
    }

    return body;
  }

  /**
   * 呼叫 chat/completions。使用者可以自己填模型名稱，我們無法預先知道那個
   * 模型吃哪一種參數格式，所以舊格式被拒時自動改用新格式重試一次。
   */
  private async chatCompletion(
    messages: ChatMessage[],
    maxTokens: number,
    temperature: number
  ) {
    const send = (body: Record<string, unknown>) =>
      fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

    let response = await send(this.buildBody(messages, maxTokens, temperature));

    if (!response.ok && response.status === 400) {
      const error = await response.json().catch(() => ({}));
      const message: string = error.error?.message ?? "";

      if (!isNextGenModel(this.model) && looksLikeParamRejection(message)) {
        response = await send(
          this.buildBody(messages, maxTokens, temperature, true)
        );
      } else {
        throw new Error(message || `OpenAI API error: 400`);
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    return response.json();
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
      const data = await this.chatCompletion(
        [
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
        4096,
        0
      );

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

    // 前半段是使用者可在設定頁改寫的分析風格；後半段的輸出格式由程式固定，
    // 這樣使用者怎麼改 prompt 都不會把 JSON 解析弄壞。
    const persona = input.systemPrompt?.trim() || DEFAULT_ANALYSIS_PROMPT;

    const systemPrompt = `${persona}

────────────────────
【輸出格式】以下為系統要求，必須遵守。

先做完整分析，再給 ${count} 個**走向明顯不同**的回覆選項。

硬性要求：
1. 每個選項的溝通策略要真的不一樣（例如：順著對方的話延伸、丟一個梗測試對方接不接、認真回應、反問、推進見面邀約）。不要只是同義改寫，那樣沒有意義。
2. content 必須是「可以直接複製貼上送出」的訊息原文。不要加引號、不要寫成「你可以說…」、不要夾雜任何說明性文字。
3. signals 要引用對話裡實際出現的原話，不要空泛描述。
4. 一定要從 ${count} 個選項裡挑一個最推薦的，把它的索引放進 recommended（從 0 開始），並在 recommendationReason 說明為什麼推它、而不是別的。不要說「都可以」。
5. lastMessageNote：如果對話最後一句是「我」說的，點評那句話的效果，好壞都要講；如果最後一句是對方說的，這欄填 null。
6. nextStep 說明如果對方接了這球，接下來可以往哪個方向走。

只輸出這個 JSON 物件，不要 markdown、不要其他文字：
{
  "relationshipRead": "目前關係狀態的判讀，2-4 句",
  "signals": ["具體訊號，引用原話", "..."],
  "lastMessageNote": "對我最後一句的點評，或 null",
  "suggestions": [
    {"style": "走向標籤（4-8字）", "content": "可直接送出的訊息", "reason": "一句話說明這樣回的效果"}
  ],
  "recommended": 0,
  "recommendationReason": "為什麼推這一個",
  "nextStep": "對方接了之後可以怎麼走"
}`;

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
      const data = await this.chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: sections.join("\n\n") },
        ],
        3072,
        // 舊世代模型拉高 temperature，因為這功能的價值就在選項要夠不一樣；
        // GPT-5 世代不吃這個參數，多樣性改由 prompt 的硬性要求來確保。
        0.9
      );

      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("OpenAI 沒有回傳內容");

      const parsed = JSON.parse(extractJson(content));

      // 模型偶爾會忽略外層物件、直接吐建議陣列，這種情況也要能用。
      const raw = Array.isArray(parsed) ? { suggestions: parsed } : parsed;
      if (!raw || typeof raw !== "object") {
        throw new Error("回傳格式無法解析");
      }

      const suggestions: ReplySuggestion[] = (
        Array.isArray(raw.suggestions) ? raw.suggestions : []
      )
        .filter(
          (s: unknown): s is Record<string, unknown> =>
            !!s &&
            typeof s === "object" &&
            typeof (s as Record<string, unknown>).content === "string" &&
            String((s as Record<string, unknown>).content).trim().length > 0
        )
        .map((s: Record<string, unknown>) => ({
          style: String(s.style ?? "建議回覆").trim(),
          content: String(s.content).trim(),
          reason: String(s.reason ?? "").trim(),
        }));

      if (suggestions.length === 0) {
        throw new Error("沒有產生任何可用的建議");
      }

      const signals = (Array.isArray(raw.signals) ? raw.signals : [])
        .map((s: unknown) => String(s ?? "").trim())
        .filter((s: string) => s.length > 0);

      // 推薦索引落在範圍外就退回第一則，不要讓畫面標到不存在的項目。
      const rawIndex = Number(raw.recommended);
      const recommendedIndex =
        Number.isInteger(rawIndex) &&
        rawIndex >= 0 &&
        rawIndex < suggestions.length
          ? rawIndex
          : 0;

      const lastNote = String(raw.lastMessageNote ?? "").trim();

      return {
        analysis: {
          relationshipRead: String(raw.relationshipRead ?? "").trim(),
          signals,
          // 最後一句是對方說的時候本來就不該有點評，直接忽略模型多給的內容。
          lastMessageNote:
            !lastFromThem && lastNote && lastNote !== "null" ? lastNote : null,
          suggestions,
          recommendedIndex,
          recommendationReason: String(raw.recommendationReason ?? "").trim(),
          nextStep: String(raw.nextStep ?? "").trim(),
        },
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
    // OpenAI 標準短脈絡費率，含 2026-07-30 的降價（Luna -80%、Terra -20%）
    // Reference: https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/
    const pricingMap: Record<string, ProviderPricing> = {
      "gpt-5.6-luna": {
        inputCostPer1M: 0.2, // $0.20 per 1M input tokens
        outputCostPer1M: 1.2, // $1.20 per 1M output tokens
      },
      "gpt-5.6-terra": {
        inputCostPer1M: 2.0,
        outputCostPer1M: 12.0,
      },
      "gpt-5.6-sol": {
        inputCostPer1M: 5.0,
        outputCostPer1M: 30.0,
      },
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
