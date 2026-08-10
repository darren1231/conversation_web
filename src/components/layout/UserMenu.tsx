"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

interface UserMenuProps {
  displayName: string;
}

export function UserMenu({ displayName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      {/* 菜单按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="max-w-[8rem] truncate hidden sm:inline">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {displayName}
            </p>
          </div>

          <nav className="py-1">
            <Link
              href="/settings/api-keys"
              className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setIsOpen(false)}
            >
              🔑 API 配置
            </Link>
            <Link
              href="/settings/ai-prompt"
              className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setIsOpen(false)}
            >
              ✨ AI 分析風格
            </Link>
            <Link
              href="/settings/api-usage"
              className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setIsOpen(false)}
            >
              💰 使用統計
            </Link>
          </nav>

          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
