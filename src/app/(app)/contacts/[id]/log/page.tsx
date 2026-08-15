import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ChatLogTabs } from "@/components/chat/ChatLogTabs";

export default async function ContactLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nickname")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!contact) notFound();

  return (
    <div>
      <Link
        href={`/contacts/${contact.id}`}
        className="mb-3 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← 回到 {contact.nickname}
      </Link>

      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        記錄與 {contact.nickname} 的對話
      </h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        直接開始打，儲存時會自動建立一段對話紀錄，之後再補標題和心情就好。
      </p>

      <ChatLogTabs contactName={contact.nickname} contactId={contact.id} />
    </div>
  );
}
