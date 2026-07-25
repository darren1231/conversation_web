import Link from "next/link";
import type { Contact } from "@/lib/supabase/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  INTERACTION_STATUS_LABEL,
  RELATIONSHIP_TYPE_LABEL,
} from "@/lib/constants";
import { formatRelative } from "@/lib/utils";

export function ContactCard({
  contact,
  avatarSignedUrl,
  conversationCount,
}: {
  contact: Contact;
  avatarSignedUrl?: string | null;
  conversationCount?: number;
}) {
  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="flex items-center gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
        <Avatar src={avatarSignedUrl} name={contact.nickname} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
              {contact.nickname}
            </p>
            {contact.relationship_type && (
              <Badge>{RELATIONSHIP_TYPE_LABEL[contact.relationship_type]}</Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {contact.platform || "尚未設定平台"}
            {typeof conversationCount === "number"
              ? ` · ${conversationCount} 段對話`
              : ""}
            {" · "}
            更新於 {formatRelative(contact.updated_at)}
          </p>
        </div>
        {contact.status && (
          <Badge className="shrink-0">
            {INTERACTION_STATUS_LABEL[contact.status]}
          </Badge>
        )}
      </Card>
    </Link>
  );
}
