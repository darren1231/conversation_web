import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";
import { ContactForm } from "@/components/contacts/ContactForm";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!contact) notFound();

  const avatarSignedUrl = contact.avatar_url
    ? await getSignedUrl(supabase, contact.avatar_url)
    : null;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        編輯人物資料
      </h1>
      <ContactForm contact={contact} avatarSignedUrl={avatarSignedUrl} />
    </div>
  );
}
