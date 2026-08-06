"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface UsageLog {
  id: string;
  provider: string;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  total_cost: number;
  status: string;
  error_message?: string;
  created_at: string;
}

interface Stats {
  totalCost: number;
  totalTokens: number;
  callCount: number;
  logs: UsageLog[];
}

export default function APIUsagePage() {
  const toast = useToast();
  const [period, setPeriod] = useState<"day" | "month" | "all">("month");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/usage-stats?period=${period}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setStats(data);
      } catch {
        toast.error("获取统计数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white mb-2">
          API 使用统计
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          查看你的 AI API 调用记录和成本统计
        </p>
      </div>

      {/* 周期选择 */}
      <div className="flex gap-2 mb-6">
        {(["day", "month", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {p === "day" ? "今天" : p === "month" ? "本月" : "全部"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          暂无数据
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* 总费用 */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                总费用
              </h3>
              <div className="text-3xl font-bold dark:text-white">
                ${stats.totalCost.toFixed(4)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {stats.callCount} 次调用
              </p>
            </div>

            {/* 总 Tokens */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                总 Tokens
              </h3>
              <div className="text-3xl font-bold dark:text-white">
                {stats.totalTokens.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                平均 {Math.round(stats.totalTokens / stats.callCount)}{" "}
                tokens/次
              </p>
            </div>

            {/* 平均成本 */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                平均成本
              </h3>
              <div className="text-3xl font-bold dark:text-white">
                ${(stats.totalCost / stats.callCount).toFixed(6)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                每次调用
              </p>
            </div>
          </div>

          {/* 使用记录表 */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
                      时间
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
                      服务商
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
                      操作
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                      Tokens
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                      费用
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-800 dark:text-gray-200">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <span title={log.created_at}>
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
                          {log.provider.toUpperCase()}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {log.operation}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {log.total_tokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        ${log.total_cost.toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.status === "success" ? (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            成功
                          </span>
                        ) : (
                          <span
                            className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded"
                            title={log.error_message}
                          >
                            失败
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
