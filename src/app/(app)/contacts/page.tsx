import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";
import { ContactCard } from "@/components/contacts/ContactCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: contacts }, { data: conversations }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("contact_id")
      .eq("user_id", user!.id),
  ]);

  const countByContact = new Map<string, number>();
  for (const c of conversations ?? []) {
    countByContact.set(c.contact_id, (countByContact.get(c.contact_id) ?? 0) + 1);
  }

  const avatarPaths = (contacts ?? [])
    .map((c) => c.avatar_url)
    .filter((v): v is string => Boolean(v));
  const signedUrls = await getSignedUrls(supabase, avatarPaths);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          聊天人物
        </h1>
        <Link href="/contacts/new">
          <Button>+ 建立聊天人物</Button>
        </Link>
      </div>

      {contacts && contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              avatarSignedUrl={
                contact.avatar_url ? signedUrls[contact.avatar_url] : null
              }
              conversationCount={countByContact.get(contact.id) ?? 0}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="還沒有任何聊天人物"
          description="建立第一位聊天對象，開始記錄你們的對話吧。"
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
