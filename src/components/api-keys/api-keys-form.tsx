"use client";

import { useState } from "react";
import { PROVIDER_MODELS } from "@/lib/ai-providers/types";
import { useToast } from "@/components/ui/Toast";

interface APIKeysFormProps {
  onSuccess?: () => void;
}

/** 下拉選單裡代表「我要自己打模型名稱」的哨兵值。 */
const CUSTOM_MODEL = "__custom__";

export default function APIKeysForm({ onSuccess }: APIKeysFormProps) {
  const toast = useToast();
  const [provider, setProvider] = useState<string>("openai");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-5.6-luna");
  const [customModel, setCustomModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const providers = Object.keys(PROVIDER_MODELS);
  const models =
    PROVIDER_MODELS[provider as keyof typeof PROVIDER_MODELS] || [];

  const isCustom = selectedModel === CUSTOM_MODEL;
  // 實際送出的模型名稱：選單選的，或使用者自己打的。
  const model = isCustom ? customModel.trim() : selectedModel;

  // 当切换 provider 时，重置 model
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const availableModels =
      PROVIDER_MODELS[newProvider as keyof typeof PROVIDER_MODELS] || [];
    setSelectedModel(availableModels[0] || CUSTOM_MODEL);
    setCustomModel("");
  };

  // 测试 API Key
  const handleTest = async () => {
    if (!apiKey) {
      toast.error("请输入 API Key");
      return;
    }
    if (!model) {
      toast.error("請輸入模型名稱");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "测试失败");
        return;
      }

      toast.success("✓ API Key 有效");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "测试失败，请重试"
      );
    } finally {
      setTesting(false);
    }
  };

  // 保存凭证
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey) {
      toast.error("请输入 API Key");
      return;
    }
    if (!model) {
      toast.error("請輸入模型名稱");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "保存失败");
        return;
      }

      toast.success("✓ API 配置已保存");
      setApiKey("");
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "保存失败，请重试"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider 选择 */}
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-gray-300">
          AI 服务商
        </label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {providers.map((p) => (
            <option key={p} value={p}>
              {p.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Model 选择 */}
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-gray-300">
          模型
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value={CUSTOM_MODEL}>✏️ 自訂模型名稱…</option>
        </select>

        {isCustom && (
          <div className="mt-2">
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="例如：gpt-4o-2024-11-20"
              spellCheck={false}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              請填 API 文件上的完整模型 ID（不是網頁版看到的名稱）。填錯的話
              呼叫會回 model_not_found，可以先按「測試」確認。
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ 自訂模型沒有內建價格表，使用統計的花費會以 GPT-4o
              的費率估算，僅供參考。
            </p>
          </div>
        )}
      </div>

      {/* API Key 输入 */}
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-gray-300">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`输入你的 ${provider.toUpperCase()} API Key`}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          你的 API Key 将存储在数据库中，仅在服务器端使用
        </p>
      </div>

      {/* 按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || loading || !apiKey}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {testing ? "测试中..." : "测试"}
        </button>
        <button
          type="submit"
          disabled={loading || testing}
          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
        >
          {loading ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
