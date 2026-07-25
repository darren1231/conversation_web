import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationForm } from "@/components/conversations/ConversationForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function NewConversationPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  const { contactId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!contactId) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, nickname")
      .eq("user_id", user!.id)
      .order("nickname");

    return (
      <div>
        <h1 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          建立新對話
        </h1>
        {contacts && contacts.length > 0 ? (
          <div>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
              請選擇這次對話的對象：
            </p>
            <div className="flex flex-col gap-2">
              {contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/conversations/new?contactId=${c.id}`}
                  className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-indigo-600 dark:hover:bg-indigo-950"
                >
                  {c.nickname}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="請先建立聊天人物"
            description="建立對話前，需要先有一位聊天對象。"
            action={
              <Link href="/contacts/new">
                <Button>+ 建立聊天人物</Button>
              </Link>
            }
          />
        )}
      </div>
    );
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nickname")
    .eq("id", contactId)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!contact) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        建立新對話
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        對象：{contact.nickname}
      </p>
      <ConversationForm contactId={contact.id} />
    </div>
  );
}
