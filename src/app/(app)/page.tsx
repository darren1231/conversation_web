import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ConversationCard } from "@/components/conversations/ConversationCard";

export default async function HomePage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [
    { count: contactCount },
    { count: conversationCount },
    { count: messageCount },
    { data: recentContacts },
    { data: recentConversations },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user!.id)
      .order("occurred_at", { ascending: false })
      .limit(4),
  ]);

  const avatarPaths = (recentContacts ?? [])
    .map((c) => c.avatar_url)
    .filter((v): v is string => Boolean(v));

  const conversationIds = (recentConversations ?? []).map((c) => c.id);
  const contactIds = Array.from(
    new Set((recentConversations ?? []).map((c) => c.contact_id)),
  );
  const [signedUrls, { data: tagRows }, { data: contactRows }] = await Promise.all([
    getSignedUrls(supabase, avatarPaths),
    conversationIds.length > 0
      ? supabase
          .from("conversation_tags")
          .select("conversation_id, tag")
          .in("conversation_id", conversationIds)
      : Promise.resolve({ data: [] as { conversation_id: string; tag: string }[] }),
    contactIds.length > 0
      ? supabase.from("contacts").select("id, nickname").in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
  ]);

  const tagsByConversation = new Map<string, string[]>();
  for (const row of tagRows ?? []) {
    const list = tagsByConversation.get(row.conversation_id) ?? [];
    list.push(row.tag);
    tagsByConversation.set(row.conversation_id, list);
  }
  const nameByContact = new Map((contactRows ?? []).map((c) => [c.id, c.nickname]));

  const stats = [
    { label: "聊天人物", value: contactCount ?? 0 },
    { label: "對話紀錄", value: conversationCount ?? 0 },
    { label: "聊天訊息", value: messageCount ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          快速開始
        </h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/contacts/new">
            <Card className="flex h-full items-center gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
              <span className="text-2xl">🧑‍🤝‍🧑</span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  建立聊天人物
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  新增一位聊天對象
                </p>
              </div>
            </Card>
          </Link>
          <Link href="/conversations/new">
            <Card className="flex h-full items-center gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  建立新對話
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  記錄一次新的對話
                </p>
              </div>
            </Card>
          </Link>
          <Link href="/conversations">
            <Card className="flex h-full items-center gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
              <span className="text-2xl">🖼️</span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  上傳聊天截圖
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  選擇對話後上傳截圖
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {stat.value}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            最近互動人物
          </h2>
          <Link
            href="/contacts"
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            查看全部
          </Link>
        </div>
        {recentContacts && recentContacts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                avatarSignedUrl={
                  contact.avatar_url ? signedUrls[contact.avatar_url] : null
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="還沒有任何聊天人物"
            action={
              <Link href="/contacts/new">
                <Button>+ 建立聊天人物</Button>
              </Link>
            }
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            最近建立的對話
          </h2>
          <Link
            href="/conversations"
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            查看全部
          </Link>
        </div>
        {recentConversations && recentConversations.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                tags={tagsByConversation.get(conversation.id)}
                showContactName
                contactName={nameByContact.get(conversation.contact_id)}
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
      </section>
    </div>
  );
}
