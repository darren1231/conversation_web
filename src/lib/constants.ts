import type {
  InteractionStatus,
  MessageType,
  RelationshipType,
} from "@/lib/supabase/types";

export const RELATIONSHIP_TYPE_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "friend", label: "朋友" },
  { value: "colleague", label: "同事" },
  { value: "language_exchange", label: "語言交換" },
  { value: "dating", label: "約會對象" },
  { value: "family", label: "家人" },
  { value: "other", label: "其他" },
];

export const RELATIONSHIP_TYPE_LABEL: Record<RelationshipType, string> =
  Object.fromEntries(
    RELATIONSHIP_TYPE_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<RelationshipType, string>;

export const INTERACTION_STATUS_OPTIONS: { value: InteractionStatus; label: string }[] = [
  { value: "active", label: "互動中" },
  { value: "cooling_down", label: "降溫中" },
  { value: "reconnecting", label: "重新聯繫" },
  { value: "ended", label: "已結束" },
  { value: "unknown", label: "未知" },
];

export const INTERACTION_STATUS_LABEL: Record<InteractionStatus, string> =
  Object.fromEntries(
    INTERACTION_STATUS_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<InteractionStatus, string>;

export const MESSAGE_TYPE_OPTIONS: { value: MessageType; label: string }[] = [
  { value: "text", label: "文字" },
  { value: "image", label: "圖片" },
  { value: "voice", label: "語音" },
  { value: "sticker", label: "貼圖" },
  { value: "link", label: "連結" },
  { value: "in_person", label: "面對面談話" },
];

export const MESSAGE_TYPE_LABEL: Record<MessageType, string> =
  Object.fromEntries(
    MESSAGE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<MessageType, string>;

export const PLATFORM_SUGGESTIONS = [
  "LINE",
  "Instagram",
  "WhatsApp",
  "WeChat",
  "Facebook Messenger",
  "Telegram",
  "簡訊",
  "面對面",
  "其他",
];

export const ME_LABEL = "我";
