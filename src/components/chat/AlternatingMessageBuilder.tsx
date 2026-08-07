"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Message {
  id: string;
  sender: "me" | "them";
  content: string;
  timestamp: string;
}

interface AlternatingMessageBuilderProps {
  contactName: string;
  onMessagesReady: (messages: Message[]) => void;
}

export function AlternatingMessageBuilder({
  contactName,
  onMessagesReady,
}: AlternatingMessageBuilderProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [themInput, setThemInput] = useState("");
  const [meInput, setMeInput] = useState("");
  const [themTime, setThemTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [meTime, setMeTime] = useState(new Date().toISOString().slice(0, 16));

  const addThemMessage = () => {
    if (!themInput.trim()) {
      toast.error("請輸入對方的話");
      return;
    }
    if (!themTime) {
      toast.error("請選擇時間");
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: "them",
      content: themInput,
      timestamp: new Date(themTime).toISOString(),
    };

    setMessages([...messages, newMessage]);
    setThemInput("");
    // 下一條自動設為現在時間
    setThemTime(new Date().toISOString().slice(0, 16));
    toast.success("✓ 已添加對方的話");
  };

  const addMeMessage = () => {
    if (!meInput.trim()) {
      toast.error("請輸入你的回覆");
      return;
    }
    if (!meTime) {
      toast.error("請選擇時間");
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: "me",
      content: meInput,
      timestamp: new Date(meTime).toISOString(),
    };

    setMessages([...messages, newMessage]);
    setMeInput("");
    // 下一條自動設為現在時間
    setMeTime(new Date().toISOString().slice(0, 16));
    toast.success("✓ 已添加你的回覆");
  };

  const deleteMessage = (id: string) => {
    setMessages(messages.filter((m) => m.id !== id));
    toast.success("✓ 已刪除");
  };

  const handleSubmit = () => {
    if (messages.length === 0) {
      toast.error("至少要添加一條消息");
      return;
    }
    onMessagesReady(messages);
  };

  return (
    <div className="space-y-6">
      {/* 輸入區 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 對方的話 */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-950/20">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
            {contactName} 說的
          </h3>
          <div className="space-y-3">
            <textarea
              value={themInput}
              onChange={(e) => setThemInput(e.target.value)}
              placeholder={`輸入 ${contactName} 說的話...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                時間
              </label>
              <input
                type="datetime-local"
                value={themTime}
                onChange={(e) => setThemTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={addThemMessage}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              + 添加 {contactName} 的話
            </button>
          </div>
        </div>

        {/* 我的回覆 */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-green-50 dark:bg-green-950/20">
          <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3">
            我說的
          </h3>
          <div className="space-y-3">
            <textarea
              value={meInput}
              onChange={(e) => setMeInput(e.target.value)}
              placeholder="輸入你的回覆..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
            />

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                時間
              </label>
              <input
                type="datetime-local"
                value={meTime}
                onChange={(e) => setMeTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              onClick={addMeMessage}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
            >
              + 添加我的回覆
            </button>
          </div>
        </div>
      </div>

      {/* 預覽區 */}
      {messages.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            對話預覽 ({messages.length} 條)
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              )
              .map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 p-3 rounded-lg ${
                    msg.sender === "me"
                      ? "bg-green-100 dark:bg-green-900/40"
                      : "bg-blue-100 dark:bg-blue-900/40"
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {msg.sender === "me" ? "我" : contactName} •{" "}
                      {new Date(msg.timestamp).toLocaleString("zh-TW")}
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-100 break-words">
                      {msg.content}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1"
                  >
                    刪除
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 提交按鈕 */}
      {messages.length > 0 && (
        <button
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
        >
          ✓ 確認並創建對話
        </button>
      )}
    </div>
  );
}
