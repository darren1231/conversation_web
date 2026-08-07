"use client";

import { useState } from "react";
import APIKeysForm from "@/components/api-keys/api-keys-form";
import APIKeysList from "@/components/api-keys/api-keys-list";

export default function APIKeysPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white mb-2">AI API 配置</h1>
        <p className="text-gray-600 dark:text-gray-400">
          配置你的 AI 服务商 API 密钥，用于自动解析对话截图
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：添加新配置 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            添加新配置
          </h2>
          <APIKeysForm
            onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
          />

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              ℹ️ 说明
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>✓ API Key 存储在数据库中</li>
              <li>✓ 仅在服务器端调用 API，不会暴露到客户端</li>
              <li>✓ 你可以随时删除或更新配置</li>
            </ul>
          </div>
        </div>

        {/* 右侧：已保存的配置 */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            已保存的配置
          </h2>
          <APIKeysList refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* 支持的 Provider 信息 */}
      <div className="mt-8 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          支持的 AI 平台
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded">
            <h3 className="font-semibold dark:text-white mb-2">OpenAI</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              支持 GPT-4o、GPT-4 等模型
            </p>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
              ✓ 已实现
            </code>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded opacity-50">
            <h3 className="font-semibold dark:text-white mb-2">Claude</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              支持 Claude 3 系列模型
            </p>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
              待实现
            </code>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded opacity-50">
            <h3 className="font-semibold dark:text-white mb-2">Gemini</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              支持 Gemini 2.0、1.5 等
            </p>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-300">
              待实现
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
