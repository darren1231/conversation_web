import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatLogTabs } from "@/components/chat/ChatLogTabs";

export default async function ConversationLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, title, contact_id")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: contact } = await supabase
    .from("contacts")
    .select("nickname")
    .eq("id", conversation.contact_id)
    .maybeSingle();

  return (
    <div>
      <Link
        href={`/conversations/${conversation.id}`}
        className="mb-3 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← 回到「{conversation.title}」
      </Link>

      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        接著記錄對話
      </h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        新的句子會接在這段對話原有訊息的後面。
      </p>

      <ChatLogTabs
        contactName={contact?.nickname ?? "對方"}
        conversationId={conversation.id}
      />
    </div>
  );
}
