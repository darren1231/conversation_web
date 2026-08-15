import Link from "next/link";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSignedUrls } from "@/lib/storage";
import { StreamedAvatar } from "@/components/ui/StreamedAvatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChatEditor } from "@/components/chat/ChatEditor";
import { AIReplySuggestions } from "@/components/chat/AIReplySuggestions";
import { AttachmentGrid } from "@/components/attachments/AttachmentGrid";
import { DeleteConversationButton } from "@/components/conversations/DeleteConversationButton";
import { formatDateTime } from "@/lib/utils";
import type { Attachment, Contact } from "@/lib/supabase/types";

/**
 * 人物資料要等對話回來才知道 contact_id，是這頁唯一真正的第二趟查詢。
 * 用到它的地方（上方的人物連結、AI 建議的稱呼）都各自串流，所以整頁的
 * 主要內容 —— 標題、摘要、標籤、聊天訊息 —— 只等第一波就能顯示。
 * 包一層 cache()，兩個地方共用同一次查詢。
 */
const getContact = cache(async (contactId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  return (data ?? null) as Contact | null;
});

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  // 訊息、標籤、附件都只需要網址上的 id，不必等對話本身回來才能查 ——
  // 一起發出去，這頁就少掉一整趟往返。RLS 仍會擋掉不屬於自己的資料列。
  const [
    { data: conversation },
    { data: messages },
    { data: tags },
    { data: attachments },
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("conversation_tags").select("tag").eq("conversation_id", id),
    supabase
      .from("attachments")
      .select("*")
      .eq("conversation_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!conversation) notFound();

  const infoRows: { label: string; value: string | null }[] = [
    { label: "對話背景", value: conversation.context },
    { label: "聊天目標", value: conversation.goal },
    { label: "我當時的心情", value: conversation.my_mood },
    { label: "對方當時的心情", value: conversation.their_mood },
    { label: "對話結果", value: conversation.outcome },
  ];

  return (
    <div>
      <div className="mb-4">
        <Suspense fallback={<ContactLinkPlaceholder />}>
          <ContactLink contactId={conversation.contact_id} />
        </Suspense>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {conversation.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {formatDateTime(conversation.occurred_at)}
              {conversation.platform ? ` · ${conversation.platform}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href={`/conversations/${conversation.id}/edit`}>
              <Button variant="secondary" size="sm">
                編輯對話
              </Button>
            </Link>
            <DeleteConversationButton
              conversationId={conversation.id}
              contactId={conversation.contact_id}
            />
          </div>
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge
              key={t.tag}
              className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            >
              #{t.tag}
            </Badge>
          ))}
        </div>
      )}

      {(conversation.summary || infoRows.some((r) => r.value)) && (
        <Card className="mb-6">
          {conversation.summary && (
            <div className="mb-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                摘要
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                {conversation.summary}
              </p>
            </div>
          )}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {infoRows.map(
              (row) =>
                row.value && (
                  <div key={row.label}>
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                      {row.value}
                    </dd>
                  </div>
                ),
            )}
          </dl>
        </Card>
      )}

      <Link
        href={`/conversations/${conversation.id}/log`}
        className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70"
      >
        <span className="text-2xl">💬</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            接著記錄
          </span>
          <span className="block text-xs text-indigo-700/80 dark:text-indigo-300/80">
            一句一句接著打，或上傳截圖讓 AI 解析後補進這段對話
          </span>
        </span>
        <span className="ml-auto shrink-0 text-indigo-400">→</span>
      </Link>

      <div className="mb-8">
        <ChatEditor conversationId={conversation.id} messages={messages ?? []} />
      </div>

      <div className="mb-8">
        <Suspense fallback={null}>
          <ReplySuggestions
            conversationId={conversation.id}
            contactId={conversation.contact_id}
            hasMessages={(messages?.length ?? 0) > 0}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <Attachments
          conversationId={conversation.id}
          attachments={(attachments ?? []) as Attachment[]}
        />
      </Suspense>
    </div>
  );
}

async function ContactLink({ contactId }: { contactId: string }) {
  const contact = await getContact(contactId);
  if (!contact) return null;

  return (
    <Link
      href={`/contacts/${contact.id}`}
      className="mb-3 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
    >
      <StreamedAvatar
        path={contact.avatar_url}
        name={contact.nickname}
        size={24}
      />
      {contact.nickname}
    </Link>
  );
}

/** 跟載入後的人物連結同高，補上時不會把標題往下推。 */
function ContactLinkPlaceholder() {
  return (
    <div className="mb-3 flex items-center gap-2" aria-hidden>
      <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
    </div>
  );
}

async function ReplySuggestions({
  conversationId,
  contactId,
  hasMessages,
}: {
  conversationId: string;
  contactId: string;
  hasMessages: boolean;
}) {
  const contact = await getContact(contactId);
  return (
    <AIReplySuggestions
      conversationId={conversationId}
      contactName={contact?.nickname ?? "對方"}
      hasMessages={hasMessages}
    />
  );
}

async function Attachments({
  conversationId,
  attachments,
}: {
  conversationId: string;
  attachments: Attachment[];
}) {
  const supabase = await createClient();
  const signedUrls = await getSignedUrls(
    supabase,
    attachments.map((a) => a.storage_path),
  );
  return (
    <AttachmentGrid
      conversationId={conversationId}
      attachments={attachments}
      signedUrls={signedUrls}
    />
  );
}
