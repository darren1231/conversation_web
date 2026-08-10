"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlternatingChatLogger,
  makeDraft,
  type DraftEntry,
} from "@/components/chat/AlternatingChatLogger";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { compressImage } from "@/lib/storage";
import { nowDateValue } from "@/lib/utils";

interface CredentialOption {
  id: string;
  provider: string;
  model: string;
  is_active: boolean;
}

interface ParsedMessage {
  sender: "me" | "them";
  content: string;
  timestamp?: string;
}

/** AI 回傳的 timestamp 格式不保證，抓得到時分就用，抓不到就留空。 */
function timeFromTimestamp(raw?: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      // data:image/jpeg;base64,XXXX → 只要 XXXX
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("讀取圖片失敗"));
    reader.readAsDataURL(file);
  });
}

export function ImageImportPanel({
  contactName,
  contactId,
  conversationId,
}: {
  contactName: string;
  contactId?: string;
  conversationId?: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [credentials, setCredentials] = useState<CredentialOption[]>([]);
  const [credentialId, setCredentialId] = useState("");
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<DraftEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/credentials");
        if (!res.ok) throw new Error("讀取 API 設定失敗");
        const data: CredentialOption[] = await res.json();
        if (cancelled) return;
        const usable = data.filter((c) => c.is_active);
        setCredentials(usable);
        if (usable.length > 0) setCredentialId(usable[0].id);
      } catch {
        if (!cancelled) setCredentials([]);
      } finally {
        if (!cancelled) setLoadingCredentials(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePick(selected: File | undefined) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("請選擇圖片檔");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setDrafts(null);
  }

  async function handleParse() {
    if (!file) {
      toast.error("請先選擇一張對話截圖");
      return;
    }
    if (!credentialId) {
      toast.error("請先到設定頁新增 API Key");
      return;
    }

    setParsing(true);
    try {
      const compressed = await compressImage(file);
      const imageBase64 = await fileToBase64(compressed);

      const res = await fetch("/api/parse-conversation-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, credentialId, conversationId }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "解析失敗");

      const parsed: ParsedMessage[] = payload.messages ?? [];
      if (parsed.length === 0) {
        toast.error("這張圖片沒有解析出任何訊息，可以改用逐句輸入");
        return;
      }

      const today = nowDateValue();
      setDrafts(
        parsed.map((m) =>
          makeDraft(
            m.sender,
            m.content,
            today,
            timeFromTimestamp(m.timestamp),
          ),
        ),
      );
      toast.success(`解析出 ${parsed.length} 句，請確認後儲存`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解析失敗");
    } finally {
      setParsing(false);
    }
  }

  if (loadingCredentials) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        載入中…
      </p>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-600">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          圖片解析需要先設定 AI API Key。
        </p>
        <Link href="/settings/api-keys" className="mt-3 inline-block">
          <Button size="sm">前往設定 API Key</Button>
        </Link>
      </div>
    );
  }

  // 解析完成後，直接沿用逐句輸入的同一套介面來校對、補句、調順序。
  if (drafts) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <span>AI 解析結果請先確認，發言者或順序有錯都可以直接改。</span>
          <button
            type="button"
            onClick={() => setDrafts(null)}
            className="shrink-0 font-semibold hover:underline"
          >
            重新上傳
          </button>
        </div>
        <AlternatingChatLogger
          contactName={contactName}
          contactId={contactId}
          conversationId={conversationId}
          initialDrafts={drafts}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          使用的 AI 模型
        </label>
        <Select
          value={credentialId}
          onChange={(e) => setCredentialId(e.target.value)}
        >
          {credentials.map((c) => (
            <option key={c.id} value={c.id}>
              {c.provider} · {c.model}
            </option>
          ))}
        </Select>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center hover:border-indigo-400 dark:border-zinc-600 dark:hover:border-indigo-500"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="待解析的對話截圖"
            className="mx-auto max-h-64 rounded-lg"
          />
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              點擊選擇對話截圖
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              AI 會讀出誰說了什麼，解析後你再確認
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0])}
        />
      </div>

      <Button
        type="button"
        onClick={handleParse}
        loading={parsing}
        disabled={!file}
        fullWidth
      >
        {parsing ? "AI 解析中…" : "開始解析"}
      </Button>
    </div>
  );
}
