import Link from "next/link";
import type { Conversation } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

export function ConversationCard({
  conversation,
  tags,
  showContactName,
  contactName,
}: {
  conversation: Conversation;
  tags?: string[];
  showContactName?: boolean;
  contactName?: string;
}) {
  return (
    <Link href={`/conversations/${conversation.id}`}>
      <Card className="transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {conversation.title}
          </p>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {formatDateTime(conversation.occurred_at)}
          </span>
        </div>
        {showContactName && contactName && (
          <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
            {contactName}
          </p>
        )}
        {conversation.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
            {conversation.summary}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {conversation.platform && <Badge>{conversation.platform}</Badge>}
          {tags?.map((tag) => (
            <Badge
              key={tag}
              className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </Card>
    </Link>
  );
}
