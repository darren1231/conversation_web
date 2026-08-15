import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSignedUrls } from "@/lib/storage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactCard } from "@/components/contacts/ContactCard";
import { StreamedAvatarFromBatch } from "@/components/ui/StreamedAvatar";
import { ConversationCard } from "@/components/conversations/ConversationCard";

/**
 * 首頁刻意不是一個大的 async 元件。
 *
 * 原本整頁要等最慢的那筆查詢回來才畫得出任何東西 —— 連完全不需要資料的
 * 「快速開始」三張卡片也一起被卡住。現在頁面本身是同步的：靜態的部分立刻出現，
 * 三個要查資料的區塊各自在自己的 Suspense 裡串流進來，誰先好誰先顯示。
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          快速開始
        </h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            href="/contacts/new"
            icon="🧑‍🤝‍🧑"
            title="建立聊天人物"
            hint="新增一位聊天對象"
          />
          <QuickAction
            href="/conversations/new"
            icon="💬"
            title="建立新對話"
            hint="記錄一次新的對話"
          />
          <QuickAction
            href="/conversations"
            icon="🖼️"
            title="上傳聊天截圖"
            hint="選擇對話後上傳截圖"
          />
        </div>
      </section>

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="最近互動人物" />}>
        <RecentContacts />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="最近建立的對話" />}>
        <RecentConversations />
      </Suspense>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: string;
  title: string;
  hint: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex h-full items-center gap-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
        </div>
      </Card>
    </Link>
  );
}

async function Stats() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const [
    { count: contactCount },
    { count: conversationCount },
    { count: messageCount },
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
  ]);

  const stats = [
    { label: "聊天人物", value: contactCount ?? 0 },
    { label: "對話紀錄", value: conversationCount ?? 0 },
    { label: "聊天訊息", value: messageCount ?? 0 },
  ];

  return (
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
  );
}

async function RecentContacts() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: recentContacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(4);

  const avatarPaths = (recentContacts ?? [])
    .map((c) => c.avatar_url)
    .filter((v): v is string => Boolean(v));
  // 同樣不 await：頭像自己串流，卡片文字不必等那趟 Storage 往返。
  const signedUrls = getSignedUrls(supabase, avatarPaths);

  return (
    <section>
      <SectionHeader title="最近互動人物" href="/contacts" />
      {recentContacts && recentContacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recentContacts.map((contact) => (
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
  );
}

async function RecentConversations() {
  const supabase = await createClient();
  const user = await getAuthUser();

  // 同一波發完：人物名稱和標籤都只靠使用者 id，不必等 recentConversations。
  const [{ data: recentConversations }, { data: contacts }, { data: tagRows }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false })
        .limit(4),
      supabase.from("contacts").select("id, nickname").eq("user_id", user!.id),
      supabase
        .from("conversation_tags")
        .select("conversation_id, tag")
        .eq("user_id", user!.id),
    ]);

  const tagsByConversation = new Map<string, string[]>();
  for (const row of tagRows ?? []) {
    const list = tagsByConversation.get(row.conversation_id) ?? [];
    list.push(row.tag);
    tagsByConversation.set(row.conversation_id, list);
  }
  const nameByContact = new Map(
    (contacts ?? []).map((c) => [c.id, c.nickname]),
  );

  return (
    <section>
      <SectionHeader title="最近建立的對話" href="/conversations" />
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
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <Link
        href={href}
        className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        查看全部
      </Link>
    </div>
  );
}

/* 骨架的高度刻意對齊實際內容，串流補上時不會把下面的區塊往下推。 */

function StatsSkeleton() {
  return (
    <section aria-busy="true">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="text-center">
            <div className="mx-auto h-8 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mx-auto mt-1 h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </Card>
        ))}
      </div>
    </section>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section aria-busy="true">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <div className="h-5 w-14 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
