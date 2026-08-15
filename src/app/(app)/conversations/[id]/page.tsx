import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { getSignedUrls } from "@/lib/storage";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChatEditor } from "@/components/chat/ChatEditor";
import { AIReplySuggestions } from "@/components/chat/AIReplySuggestions";
import { AttachmentGrid } from "@/components/attachments/AttachmentGrid";
import { DeleteConversationButton } from "@/components/conversations/DeleteConversationButton";
import { formatDateTime } from "@/lib/utils";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!conversation) notFound();

  const [{ data: contact }, { data: messages }, { data: tags }, { data: attachments }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("id", conversation.contact_id)
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

  const attachmentPaths = (attachments ?? []).map((a) => a.storage_path);
  const signedUrls = await getSignedUrls(supabase, attachmentPaths);
  const contactAvatarUrl = contact?.avatar_url
    ? (await getSignedUrls(supabase, [contact.avatar_url]))[contact.avatar_url]
    : null;

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
        {contact && (
          <Link
            href={`/contacts/${contact.id}`}
            className="mb-3 inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            <Avatar src={contactAvatarUrl} name={contact.nickname} size={24} />
            {contact.nickname}
          </Link>
        )}
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
            {contact && (
              <DeleteConversationButton
                conversationId={conversation.id}
                contactId={contact.id}
              />
            )}
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
        <AIReplySuggestions
          conversationId={conversation.id}
          contactName={contact?.nickname ?? "對方"}
          hasMessages={(messages?.length ?? 0) > 0}
        />
      </div>

      <AttachmentGrid
        conversationId={conversation.id}
        attachments={attachments ?? []}
        signedUrls={signedUrls}
      />
    </div>
  );
}
