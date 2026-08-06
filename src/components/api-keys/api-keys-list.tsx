"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface APICredential {
  id: string;
  provider: string;
  model: string;
  is_active: boolean;
  created_at: string;
}

interface APIKeysListProps {
  refreshTrigger?: number;
}

export default function APIKeysList({ refreshTrigger }: APIKeysListProps) {
  const toast = useToast();
  const [credentials, setCredentials] = useState<APICredential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await fetch("/api/credentials");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setCredentials(data);
      } catch {
        toast.error("获取凭证失败");
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个 API 配置吗？")) return;

    try {
      const response = await fetch(`/api/credentials?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      setCredentials(credentials.filter((c) => c.id !== id));
      toast.success("✓ API 配置已删除");
    } catch {
      toast.error("删除失败");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  if (credentials.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        还没有配置任何 API Key
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {credentials.map((cred) => (
        <div
          key={cred.id}
          className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold dark:text-white">
                {cred.provider.toUpperCase()}
              </h3>
              <code className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
                {cred.model}
              </code>
              {cred.is_active && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  活跃
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              添加于{" "}
              {formatDistanceToNow(new Date(cred.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </p>
          </div>

          <button
            onClick={() => handleDelete(cred.id)}
            className="ml-4 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
          >
            删除
          </button>
        </div>
      ))}
    </div>
  );
}
