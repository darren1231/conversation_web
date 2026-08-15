import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function ConversationsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user!.id)
    .order("occurred_at", { ascending: false });

  const contactIds = Array.from(
    new Set((conversations ?? []).map((c) => c.contact_id)),
  );
  const conversationIds = (conversations ?? []).map((c) => c.id);

  const [{ data: contacts }, { data: tagRows }] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from("contacts")
          .select("id, nickname")
          .in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
    conversationIds.length > 0
      ? supabase
          .from("conversation_tags")
          .select("conversation_id, tag")
          .in("conversation_id", conversationIds)
      : Promise.resolve({
          data: [] as { conversation_id: string; tag: string }[],
        }),
  ]);

  const nameById = new Map((contacts ?? []).map((c) => [c.id, c.nickname]));
  const tagsByConversation = new Map<string, string[]>();
  for (const row of tagRows ?? []) {
    const list = tagsByConversation.get(row.conversation_id) ?? [];
    list.push(row.tag);
    tagsByConversation.set(row.conversation_id, list);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          所有對話
        </h1>
        <Link href="/conversations/new">
          <Button>+ 建立新對話</Button>
        </Link>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              tags={tagsByConversation.get(conversation.id)}
              showContactName
              contactName={nameById.get(conversation.contact_id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="還沒有任何對話紀錄"
          action={
            <Link href="/conversations/new">
              <Button>+ 建立新對話</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
