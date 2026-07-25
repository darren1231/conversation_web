import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { escapeIlike } from "@/lib/search";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  if (!q) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          搜尋
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          輸入人物名稱、對話標題、訊息內容、背景、摘要或標籤來搜尋。
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pattern = `%${escapeIlike(q)}%`;

  const [
    { data: matchedContacts },
    { data: matchedConversations },
    { data: matchedTags },
    { data: matchedMessages },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, nickname, background")
      .eq("user_id", user!.id)
      .or(`nickname.ilike.${pattern},background.ilike.${pattern}`)
      .limit(20),
    supabase
      .from("conversations")
      .select("id, contact_id, title, summary, occurred_at")
      .eq("user_id", user!.id)
      .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
      .limit(20),
    supabase
      .from("conversation_tags")
      .select("conversation_id, tag")
      .eq("user_id", user!.id)
      .ilike("tag", pattern)
      .limit(20),
    supabase
      .from("messages")
      .select("id, conversation_id, content, sender")
      .eq("user_id", user!.id)
      .ilike("content", pattern)
      .limit(20),
  ]);

  const conversationIdsNeeded = new Set<string>([
    ...(matchedTags ?? []).map((t) => t.conversation_id),
    ...(matchedMessages ?? []).map((m) => m.conversation_id),
  ]);
  const { data: relatedConversations } =
    conversationIdsNeeded.size > 0
      ? await supabase
          .from("conversations")
          .select("id, contact_id, title, occurred_at")
          .in("id", Array.from(conversationIdsNeeded))
      : { data: [] };
  const conversationById = new Map(
    (relatedConversations ?? []).map((c) => [c.id, c]),
  );

  const contactIdsNeeded = new Set<string>([
    ...(matchedConversations ?? []).map((c) => c.contact_id),
    ...(relatedConversations ?? []).map((c) => c.contact_id),
  ]);
  const { data: relatedContacts } =
    contactIdsNeeded.size > 0
      ? await supabase
          .from("contacts")
          .select("id, nickname")
          .in("id", Array.from(contactIdsNeeded))
      : { data: [] };
  const contactNameById = new Map(
    (relatedContacts ?? []).map((c) => [c.id, c.nickname]),
  );

  const totalResults =
    (matchedContacts?.length ?? 0) +
    (matchedConversations?.length ?? 0) +
    (matchedTags?.length ?? 0) +
    (matchedMessages?.length ?? 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          搜尋結果：「{q}」
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          共找到 {totalResults} 筆結果
        </p>
      </div>

      {totalResults === 0 && (
        <EmptyState title="沒有找到符合的結果" description="請嘗試其他關鍵字。" />
      )}

      {matchedContacts && matchedContacts.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            人物
          </h2>
          <div className="flex flex-col gap-2">
            {matchedContacts.map((c) => (
              <Link key={c.id} href={`/contacts/${c.id}`}>
                <Card className="hover:border-indigo-300 dark:hover:border-indigo-600">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {c.nickname}
                  </p>
                  {c.background && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {c.background}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {matchedConversations && matchedConversations.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            對話標題／摘要
          </h2>
          <div className="flex flex-col gap-2">
            {matchedConversations.map((c) => (
              <Link key={c.id} href={`/conversations/${c.id}`}>
                <Card className="hover:border-indigo-300 dark:hover:border-indigo-600">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                    {contactNameById.get(c.contact_id)}
                  </p>
                  {c.summary && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {c.summary}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {matchedTags && matchedTags.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            標籤
          </h2>
          <div className="flex flex-col gap-2">
            {matchedTags.map((t) => {
              const conv = conversationById.get(t.conversation_id);
              return (
                <Link key={`${t.conversation_id}-${t.tag}`} href={`/conversations/${t.conversation_id}`}>
                  <Card className="hover:border-indigo-300 dark:hover:border-indigo-600">
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      #{t.tag}
                    </Badge>
                    <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
                      {conv?.title ?? "對話"}
                    </p>
                    {conv && (
                      <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                        {contactNameById.get(conv.contact_id)}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {matchedMessages && matchedMessages.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            訊息內容
          </h2>
          <div className="flex flex-col gap-2">
            {matchedMessages.map((m) => {
              const conv = conversationById.get(m.conversation_id);
              return (
                <Link key={m.id} href={`/conversations/${m.conversation_id}`}>
                  <Card className="hover:border-indigo-300 dark:hover:border-indigo-600">
                    <p className="line-clamp-2 text-sm text-zinc-800 dark:text-zinc-200">
                      {m.sender === "me" ? "我：" : "對方："}
                      {m.content}
                    </p>
                    <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                      {conv?.title}
                      {conv ? ` · ${contactNameById.get(conv.contact_id)}` : ""}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
