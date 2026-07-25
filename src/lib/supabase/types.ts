// Hand-written types mirroring the Supabase database schema.
// Keep in sync with supabase/migrations/*.sql

export type RelationshipType =
  | "friend"
  | "colleague"
  | "language_exchange"
  | "dating"
  | "family"
  | "other";

export type InteractionStatus =
  | "active"
  | "cooling_down"
  | "reconnecting"
  | "ended"
  | "unknown";

export type MessageSender = "me" | "them";

export type MessageType =
  | "text"
  | "image"
  | "voice"
  | "sticker"
  | "link"
  | "in_person";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  relationship_type: RelationshipType | null;
  platform: string | null;
  met_through: string | null;
  interests: string | null;
  personality: string | null;
  background: string | null;
  status: InteractionStatus | null;
  private_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  contact_id: string;
  title: string;
  occurred_at: string;
  platform: string | null;
  context: string | null;
  goal: string | null;
  my_mood: string | null;
  their_mood: string | null;
  outcome: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  conversation_id: string;
  sender: MessageSender;
  message_type: MessageType;
  content: string | null;
  occurred_date: string | null;
  occurred_time: string | null;
  note: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationTag {
  id: string;
  user_id: string;
  conversation_id: string;
  tag: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  user_id: string;
  conversation_id: string;
  storage_path: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

