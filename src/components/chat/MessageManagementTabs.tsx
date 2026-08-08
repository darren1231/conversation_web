"use client";

import { useState } from "react";
import { AlternatingMessageBuilder } from "@/components/chat/AlternatingMessageBuilder";

interface Message {
  id: string;
  sender: "me" | "them";
  content: string;
  timestamp: string;
}

interface ExistingMessage {
  id: string;
  sender: "me" | "them";
  content: string;
  created_at: string;
}

interface MessageManagementTabsProps {
  contactName: string;
  existingMessages?: ExistingMessage[];
  conversationId?: string;
}

export function MessageManagementTabs({
  contactName,
  existingMessages,
  conversationId,
}: MessageManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<"view" | "manual" | "image">(
    "view"
  );

  const tabs = [
    { id: "view", label: "📋 查看消息", icon: "📋" },
    { id: "manual", label: "✏️ 逐條添加", icon: "✏️" },
    { id: "image", label: "📸 上傳圖片", icon: "📸" },
  ];

  const handleAlternatingMessagesReady = async (messages: Message[]) => {
    if (!conversationId) {
      console.error("Conversation ID is required to save messages");
      return;
    }

    try {
      const response = await fetch("/api/messages/batch-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: messages.map((m) => ({
            sender: m.sender,
            content: m.content,
            created_at: m.timestamp,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save messages");
      }

      // Reload page to show new messages
      window.location.reload();
    } catch (error) {
      console.error("Failed to save messages:", error);
    }
  };

  return (
    <div>
      {/* 選項卡 */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab: { id: string; label: string; icon: string }) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "view" | "manual" | "image")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 內容區 */}
      <div className="mt-6">
        {/* 查看現有消息 */}
        {activeTab === "view" && (
          <div>
            {existingMessages && existingMessages.length > 0 ? (
              <div className="space-y-3">
                {existingMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.sender === "me"
                        ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
                        : "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {msg.sender === "me" ? "我" : contactName} •{" "}
                      {new Date(msg.created_at).toLocaleString("zh-TW")}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                暫無消息。使用下方選項卡添加消息。
              </div>
            )}
          </div>
        )}

        {/* 逐條添加（交替式） */}
        {activeTab === "manual" && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              按照「{contactName} 一句、我一句」的順序添加對話消息。每條消息都會記錄時間。
            </p>
            <AlternatingMessageBuilder
              contactName={contactName}
              onMessagesReady={handleAlternatingMessagesReady}
            />
          </div>
        )}

        {/* 上傳圖片 */}
        {activeTab === "image" && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            📸 圖片上傳功能開發中...
            <p className="text-sm mt-2">
              上傳對話截圖，AI 會自動解析並添加消息。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
