import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { ConversationForm } from "@/components/conversations/ConversationForm";

export default async function EditConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  // 標籤只需要網址上的 id，不必等對話回來 —— 一起發，這頁少一趟往返。
  const [{ data: conversation }, { data: tags }] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase.from("conversation_tags").select("tag").eq("conversation_id", id),
  ]);

  if (!conversation) notFound();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        編輯對話
      </h1>
      <ConversationForm
        contactId={conversation.contact_id}
        conversation={conversation}
        initialTags={(tags ?? []).map((t) => t.tag)}
      />
    </div>
  );
}
