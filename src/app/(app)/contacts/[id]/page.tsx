import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { StreamedAvatar } from "@/components/ui/StreamedAvatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConversationCard } from "@/components/conversations/ConversationCard";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import {
  INTERACTION_STATUS_LABEL,
  RELATIONSHIP_TYPE_LABEL,
} from "@/lib/constants";
import type { Contact } from "@/lib/supabase/types";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser();

  // 三筆都只靠網址上的 id 和使用者 id，彼此不依賴，所以一次發完 —— 這頁因此
  // 只需要一趟往返。標籤本來是等對話清單回來後再用 .in(ids) 撈，那會多一整趟；
  // 改成直接撈這個使用者的標籤再於記憶體內配對，量級跟這頁本來就要載入的
  // 對話清單相當。
  const [{ data: contactRow }, { data: conversations }, { data: tagRows }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("conversations")
        .select("*")
        .eq("contact_id", id)
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("conversation_tags")
        .select("conversation_id, tag")
        .eq("user_id", user!.id),
    ]);

  if (!contactRow) notFound();
  const contact = contactRow as Contact;

  const tagsByConversation = new Map<string, string[]>();
  for (const row of tagRows ?? []) {
    const list = tagsByConversation.get(row.conversation_id) ?? [];
    list.push(row.tag);
    tagsByConversation.set(row.conversation_id, list);
  }

  const infoRows: { label: string; value: string | null }[] = [
    { label: "常用聊天平台", value: contact.platform },
    { label: "認識方式", value: contact.met_through },
    { label: "興趣與個性", value: contact.interests },
    { label: "重要背景", value: contact.background },
    { label: "私人備註", value: contact.private_notes },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <StreamedAvatar
            path={contact.avatar_url}
            name={contact.nickname}
            size={64}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {contact.nickname}
              </h1>
              {contact.relationship_type && (
                <Badge>
                  {RELATIONSHIP_TYPE_LABEL[contact.relationship_type]}
                </Badge>
              )}
              {contact.status && (
                <Badge>{INTERACTION_STATUS_LABEL[contact.status]}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              共 {conversations?.length ?? 0} 段對話紀錄
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/contacts/${contact.id}/edit`}>
            <Button variant="secondary" size="sm">
              編輯資料
            </Button>
          </Link>
          <DeleteContactButton contactId={contact.id} />
        </div>
      </div>

      <Card className="mb-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {infoRows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {row.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                {row.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Link
        href={`/contacts/${contact.id}/log`}
        className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70"
      >
        <span className="text-2xl">💬</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            記錄一段對話
          </span>
          <span className="block text-xs text-indigo-700/80 dark:text-indigo-300/80">
            {contact.nickname} 一句、我一句地打，或上傳截圖讓 AI 解析
          </span>
        </span>
        <span className="ml-auto shrink-0 text-indigo-400">→</span>
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          對話歷史
        </h2>
        <Link href={`/conversations/new?contactId=${contact.id}`}>
          <Button variant="secondary" size="sm">
            + 空白對話
          </Button>
        </Link>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              tags={tagsByConversation.get(conversation.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="還沒有任何對話紀錄"
          description="用上面的「記錄一段對話」開始，一句一句把對話打進來。"
          action={
            <Link href={`/contacts/${contact.id}/log`}>
              <Button>💬 記錄一段對話</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
