import type { ParseImageContext, ParsedMessage, QuotedPreview } from "./types";

/**
 * 截圖解析的共用邏輯：prompt 與回傳值的整理。
 *
 * 這裡處理的是這個功能最常見的兩種錯誤：
 * 1. 整段對話的左右判反，變成每一句都掛到錯的人身上。
 * 2. 「回覆引用」被當成一句獨立訊息。截圖上那塊灰色小預覽是被回覆的舊訊息，
 *    它會顯示原作者的名字（常常就是我自己），但它出現在對方的泡泡上面，
 *    模型很容易因此把整顆泡泡判給錯的人，或把那行截斷的預覽當成新訊息。
 */

/** 訊息泡泡的方向判定：位置優先，名字只在對得上時才拿來覆核。 */
function senderRules(context?: ParseImageContext): string {
  const lines = [
    `"me" = the person holding the phone that took this screenshot (the account that is logged in).`,
    `"them" = the other person in the conversation.`,
  ];

  if (context?.contactName) {
    lines.push(
      `The other person is called "${context.contactName}" — that name appears in the screen header, next to their bubbles, or inside quote previews of their messages.`
    );
  }
  if (context?.selfName) {
    lines.push(
      `My own display name in this app is "${context.selfName}". Text labelled "${context.selfName}" was written by "me" — including when it shows up inside a quote preview attached to one of THEIR bubbles.`
    );
  }

  return lines.join("\n");
}

export function buildParseImagePrompt(context?: ParseImageContext): string {
  return `You are extracting a chat transcript from a screenshot of a one-on-one messaging app (LINE, Messenger, WhatsApp, Instagram DM, WeChat, Telegram…).

## Who is who
${senderRules(context)}

## How to decide the sender — read the layout, in this order
1. HORIZONTAL POSITION decides it. A bubble flush against the RIGHT edge of the screen is "me". A bubble flush against the LEFT edge is "them". Judge by which edge the bubble hugs, not by where its text happens to start.
2. AVATAR: profile pictures are drawn only beside "them" bubbles. A bubble with no avatar beside it is "me".
3. COLOR: all "me" bubbles share one background color, all "them" bubbles share another. Once one bubble is classified by position, classify the rest by matching its color.
Never infer the sender from wording, tone, politeness or language — both people can write the same way. Only layout is reliable.

## Reply quotes — the single most common mistake, read this twice
Chat apps render the message being replied to as a small preview attached to the top of a bubble (or as a smaller bubble directly above it): dimmer and smaller text, usually ONE truncated line ending in "…", often with the ORIGINAL author's name and a tiny avatar.

All of these rules are mandatory:
- A quote preview is NOT a message. Never emit it as its own item in the output array.
- The name shown inside a quote preview is the author of the OLD quoted message. It tells you NOTHING about who sent the bubble the preview is attached to.
- Therefore: never flip a bubble's sender because of the name, avatar or text inside its quote preview. The bubble's own position on screen decides, always.
- Worked example: a LEFT-side bubble carrying a quote preview labelled "Alex" is a message from "them" — them replying to something Alex said earlier. It is NOT a message from Alex, and the quoted line is NOT a separate message from Alex.
- Record the quote on the message it belongs to, in "replyTo": {"name": name shown or null, "excerpt": the previewed text exactly as displayed, ellipsis included}. Use "replyTo": null for messages that are not replies.
- Never merge quoted text into "content". "content" holds only the new text that this bubble's sender actually typed.

## Extracting the text
- One bubble = one item. Multiple lines inside the SAME bubble stay in one "content", joined with \\n. Separate bubbles stay separate items, even when the same person sent several in a row.
- Keep the on-screen order, top to bottom.
- Copy the text exactly: punctuation, emoji, line breaks, mixed languages. Do not translate, summarise, shorten or fix typos.
- "timestamp": the time shown for that message, copied verbatim (e.g. "08/12 下午 19:49"). Use null when that message has no time next to it. A standalone date or time separator line is not a message.
- Ignore everything that is not a message bubble: the status bar, the header with the contact name and back arrow, tabs, search icons, date separators, "已讀"/"Read"/"Delivered" marks, typing indicators, reactions, the input box and its placeholder ("Aa"), and the keyboard.

## Output
Return ONLY a raw JSON array — no markdown fence, no commentary:
[
  {"sender": "me", "content": "message text", "timestamp": "19:49", "replyTo": null},
  {"sender": "them", "content": "reply text", "timestamp": null, "replyTo": {"name": "Alex", "excerpt": "quoted line as shown…"}}
]`;
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim();
}

function sameName(a: string, b?: string): boolean {
  if (!b) return false;
  return a.toLowerCase() === b.trim().toLowerCase();
}

const ME_TOKENS = new Set(["me", "self", "user", "i", "own", "right", "我"]);
const THEM_TOKENS = new Set([
  "them",
  "they",
  "other",
  "others",
  "contact",
  "partner",
  "friend",
  "left",
  "對方",
  "他",
  "她",
]);

/** 模型偶爾不照 "me"/"them" 回答，而是給名字或 left/right，這裡一律收斂回兩個值。 */
function resolveSender(
  value: unknown,
  context?: ParseImageContext
): "me" | "them" | null {
  const raw = cleanText(value);
  if (!raw) return null;

  if (sameName(raw, context?.selfName)) return "me";
  if (sameName(raw, context?.contactName)) return "them";

  const token = raw.toLowerCase();
  if (ME_TOKENS.has(token)) return "me";
  if (THEM_TOKENS.has(token)) return "them";
  return null;
}

/** 引用區塊上的名字對得上才判定歸屬，對不上就只留名字，不要瞎猜。 */
function resolveQuoteAuthor(
  name: string,
  context?: ParseImageContext
): "me" | "them" | undefined {
  if (sameName(name, context?.selfName)) return "me";
  if (sameName(name, context?.contactName)) return "them";
  return undefined;
}

function parseReplyTo(
  value: unknown,
  context?: ParseImageContext
): QuotedPreview | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;

  const excerpt = cleanText(raw.excerpt ?? raw.text ?? raw.content);
  const name = cleanText(raw.name ?? raw.sender ?? raw.author);
  if (!excerpt && !name) return undefined;

  return {
    excerpt,
    ...(name ? { name } : {}),
    ...(name && resolveQuoteAuthor(name, context)
      ? { sender: resolveQuoteAuthor(name, context) }
      : {}),
  };
}

/** 比對用的鍵：去掉尾端省略號與空白，讓截斷過的引用文字對得上。 */
function quoteKey(text: string): string {
  return text.replace(/[\s.．。]*(?:…|\.{3})\s*$/u, "").trim();
}

function endsTruncated(text: string): boolean {
  return /(?:…|\.{3})\s*$/u.test(text);
}

/** 截圖上的固定介面文字，不是對話內容。只比對完全相同的字串，避免誤刪。 */
const UI_NOISE = new Set([
  "aa",
  "已讀",
  "已读",
  "已送達",
  "已送达",
  "read",
  "seen",
  "delivered",
  "sent",
  "輸入訊息",
  "输入消息",
  "type a message",
  "message",
]);

/**
 * 把模型回傳的原始陣列整理成可用的訊息串：
 * 收斂發言者、掛上引用、濾掉介面文字，並擋掉漏網的「引用被當成訊息」。
 */
export function normalizeParsedMessages(
  raw: unknown,
  context?: ParseImageContext
): ParsedMessage[] {
  // 模型有時候會用 {messages: [...]} 包起來。
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { messages?: unknown } | null)?.messages)
      ? (raw as { messages: unknown[] }).messages
      : null;

  if (!list) throw new Error("Response is not an array");

  const messages: ParsedMessage[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;

    const sender = resolveSender(entry.sender, context);
    const content = cleanText(entry.content ?? entry.text);
    if (!sender || !content) continue;
    if (UI_NOISE.has(content.toLowerCase())) continue;

    const timestamp = cleanText(entry.timestamp);
    const replyTo = parseReplyTo(entry.replyTo ?? entry.quote, context);

    // 同一句連續重複出現通常是模型抖動，不是對方真的連傳兩次一模一樣的話。
    const previous = messages[messages.length - 1];
    if (previous && previous.sender === sender && previous.content === content) {
      continue;
    }

    messages.push({
      sender,
      content,
      ...(timestamp && timestamp.toLowerCase() !== "null" ? { timestamp } : {}),
      ...(replyTo ? { replyTo } : {}),
    });
  }

  // 最後一道防線：模型還是把某塊引用預覽當成訊息輸出時，
  // 它會是「被截斷」且「和某則訊息的引用內容一樣」，兩個條件同時成立才刪，
  // 才不會把截圖裡真的存在的那句原始訊息也一起刪掉。
  const quoted = new Set(
    messages
      .map((m) => m.replyTo?.excerpt)
      .filter((e): e is string => !!e)
      .map(quoteKey)
      .filter((e) => e.length > 0)
  );

  return messages.filter(
    (m) => !(endsTruncated(m.content) && quoted.has(quoteKey(m.content)))
  );
}
