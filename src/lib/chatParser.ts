import type { MessageSender } from "@/lib/supabase/types";
import { ME_LABEL } from "@/lib/constants";

export interface ParsedLine {
  sender: MessageSender;
  speakerLabel: string;
  content: string;
}

const SPEAKER_LINE = /^\s*([^:：\n]{1,20}?)\s*[:：]\s*(.*)$/;

/**
 * Splits pasted chat text into speaker turns. Lines like "Joy：訊息" start a
 * new bubble; lines with no "name:" prefix are appended to the previous
 * bubble (multi-line messages).
 */
export function parseBatchChatText(raw: string): ParsedLine[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const result: ParsedLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(SPEAKER_LINE);
    if (match) {
      const [, speaker, content] = match;
      const sender: MessageSender = speaker.trim() === ME_LABEL ? "me" : "them";
      result.push({ sender, speakerLabel: speaker.trim(), content: content.trim() });
    } else if (result.length > 0) {
      const last = result[result.length - 1];
      last.content = last.content ? `${last.content}\n${line}` : line;
    } else {
      result.push({ sender: "them", speakerLabel: "", content: line });
    }
  }

  return result.filter((item) => item.content.trim().length > 0);
}
