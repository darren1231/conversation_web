import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { CardGridSkeleton } from "@/components/ui/CardGridSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/** 標題與建立按鈕不需要等查詢，只有清單串流（理由同 contacts/page.tsx）。 */
export default function ConversationsPage() {
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

      <Suspense fallback={<CardGridSkeleton />}>
        <ConversationList />
      </Suspense>
    </div>
  );
}

async function ConversationList() {
  const supabase = await createClient();
  const user = await getAuthUser();

  // 三筆都只靠使用者 id，彼此不依賴 —— 一次發完，這份清單只需要一趟往返。
  // 人物名稱和標籤本來是等 conversations 回來後再用 .in(ids) 撈，那要多一整趟；
  // 改成撈這個使用者自己的人物與標籤，再於記憶體內配對。
  const [{ data: conversations }, { data: contacts }, { data: tagRows }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false }),
      supabase.from("contacts").select("id, nickname").eq("user_id", user!.id),
      supabase
        .from("conversation_tags")
        .select("conversation_id, tag")
        .eq("user_id", user!.id),
    ]);

  const nameById = new Map((contacts ?? []).map((c) => [c.id, c.nickname]));

  const tagsByConversation = new Map<string, string[]>();
  for (const row of tagRows ?? []) {
    const list = tagsByConversation.get(row.conversation_id) ?? [];
    list.push(row.tag);
    tagsByConversation.set(row.conversation_id, list);
  }

  if (!conversations || conversations.length === 0) {
    return (
      <EmptyState
        title="還沒有任何對話紀錄"
        action={
          <Link href="/conversations/new">
            <Button>+ 建立新對話</Button>
          </Link>
        }
      />
    );
  }

  return (
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
  );
}
