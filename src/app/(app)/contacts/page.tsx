import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSignedUrls } from "@/lib/storage";
import { ContactCard } from "@/components/contacts/ContactCard";
import { StreamedAvatarFromBatch } from "@/components/ui/StreamedAvatar";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/CardGridSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * 頁面本身是同步的，標題和「建立聊天人物」按鈕不需要等任何查詢就能出現；
 * 只有清單在自己的 Suspense 裡串流。使用者一按就能看到頁面框架，
 * 而且可以馬上按下建立按鈕，不必等資料回來。
 */
export default function ContactsPage() {
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

      <Suspense fallback={<CardGridSkeleton avatar />}>
        <ContactList />
      </Suspense>
    </div>
  );
}

async function ContactList() {
  const supabase = await createClient();
  const user = await getAuthUser();

  // 這兩筆互相不依賴，一起發出去；分開 await 會白白多等一趟往返。
  const [{ data: contacts }, { data: conversations }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false }),
    supabase.from("conversations").select("contact_id").eq("user_id", user!.id),
  ]);

  const countByContact = new Map<string, number>();
  for (const c of conversations ?? []) {
    countByContact.set(c.contact_id, (countByContact.get(c.contact_id) ?? 0) + 1);
  }

  const avatarPaths = (contacts ?? [])
    .map((c) => c.avatar_url)
    .filter((v): v is string => Boolean(v));
  // 刻意不 await：換圖片網址要多跑一趟 Storage，而名字、平台、對話數在上面
  // 那一波就已經到齊了。把這個 Promise 交給每張卡片，圖片自己串流補上，
  // 但整頁仍然只發一次批次簽章。
  const signedUrls = getSignedUrls(supabase, avatarPaths);

  if (!contacts || contacts.length === 0) {
    return (
      <EmptyState
        title="還沒有任何聊天人物"
        description="建立第一位聊天對象，開始記錄你們的對話吧。"
        action={
          <Link href="/contacts/new">
            <Button>+ 建立聊天人物</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          avatar={
            <StreamedAvatarFromBatch
              urls={signedUrls}
              path={contact.avatar_url}
              name={contact.nickname}
              size={48}
            />
          }
          conversationCount={countByContact.get(contact.id) ?? 0}
        />
      ))}
    </div>
  );
}
