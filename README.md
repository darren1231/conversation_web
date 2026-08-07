# 人際對話成長日誌（Conversation Growth Log）— MVP

記錄你與不同人物的每一次對話，方便日後回顧與比較自己的表達能力。

Next.js (App Router) + TypeScript + Tailwind CSS v4 + Supabase (Auth / Postgres / Storage)，Mobile First，支援 Light/Dark Mode。

## 1. 環境變數設定

複製 `.env.example` 為 `.env.local`，填入你的 Supabase 專案設定（Project Settings → API）：

```bash
cp .env.example .env.local
```

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 皆為公開金鑰（anon/publishable key），可安全暴露在前端；所有資料存取權限由 Row Level Security（RLS）把關。本專案未使用 service role key。

## 2. Supabase 專案設定

### 2.1 執行資料庫 Migration

在 Supabase Dashboard 的 SQL Editor 中，依序執行 `supabase/migrations/` 下的所有檔案（或使用 Supabase CLI `supabase db push`）：

1. `0001_schema.sql` — 建立資料表、索引、`updated_at` 自動更新 trigger，以及新使用者自動建立 `profiles` 的 trigger。
2. `0002_rls.sql` — 為所有資料表啟用並設定 Row Level Security policies。
3. `0003_storage.sql` — 建立私人 Storage bucket `attachments`，並設定其 RLS policies。
4. `0004_api_credentials.sql` — 建立 `api_credentials` 和 `api_usage_logs` 表，用於存儲用戶的 AI API 配置和使用記錄。
5. `0005_api_credentials_rls.sql` — 為 API 相關表設定 RLS 策略。

```bash
# 使用 Supabase CLI（已 supabase link 專案後）
supabase db push
```

### 2.2 啟用 Google 登入

Supabase Dashboard → Authentication → Providers → Google：

1. 啟用 Google provider。
2. 在 [Google Cloud Console](https://console.cloud.google.com/) 建立 OAuth Client ID（Web application），並將 Supabase 提供的 Redirect URL（`https://<project-ref>.supabase.co/auth/v1/callback`）加入「已授權的重新導向 URI」。
3. 將 Client ID / Client Secret 貼回 Supabase Google provider 設定並儲存。
4. Authentication → URL Configuration：將本機開發網址（例如 `http://localhost:3000`）與正式網域加入 Redirect URLs 白名單，並設定 Site URL。

登入流程：`/login` 頁面呼叫 `supabase.auth.signInWithOAuth({ provider: "google" })` → Google 授權 → 導回 `/auth/callback`（Route Handler）以 `exchangeCodeForSession` 換取 session → 轉址回原本要前往的頁面。

## 3. 安裝與開發

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。未登入時會自動導向 `/login`；登入後才能存取任何頁面（由 `src/proxy.ts` 中介層檢查 session）。

## 4. 資料庫結構

| 資料表 | 說明 |
| --- | --- |
| `profiles` | 使用者資料，`id` 對應 `auth.users.id`，於 Google 登入時由 trigger 自動建立 |
| `contacts` | 聊天人物（暱稱、頭像、關係類型、平台、認識方式、興趣個性、背景、互動狀態、私人備註） |
| `conversations` | 每一次對話紀錄（標題、日期時間、平台、背景、目標、雙方心情、結果、摘要） |
| `messages` | 每一則聊天訊息（發送者 me/them、訊息類型、內容、日期時間、備註、排序） |
| `conversation_tags` | 對話標籤（多對一對應到 conversation） |
| `attachments` | 聊天截圖附件（Storage 路徑、說明、排序） |

所有主要資料表皆包含 `user_id`，並透過 RLS 確保使用者只能存取 `auth.uid() = user_id` 的資料列；`contacts`/`conversations`/`messages` 等表的 insert policy 亦檢查外鍵所屬對象是否為同一使用者，避免跨帳號掛接資料。

### Storage

- Bucket：`attachments`（**private**，非公開）。
- 路徑慣例：`{user_id}/{screenshots|avatars}/{conversation_id 或 contact_id}/{uuid}.{ext}`。
- Storage RLS：僅允許 `(storage.foldername(name))[1] = auth.uid()::text` 的物件被該使用者讀寫刪除。
- 前端一律透過 `createSignedUrl` / `createSignedUrls`（1 小時效期）取得可顯示的圖片網址，不使用公開永久網址。
- 上傳前使用 `browser-image-compression` 在瀏覽器端壓縮（目標 ≤1.5MB、最長邊 1920px），避免手機原圖過大造成 413。

## 5. 功能對應的主要程式碼

- 登入/登出：`src/app/login/page.tsx`、`src/app/auth/callback/route.ts`、`src/lib/actions/auth.ts`、`src/proxy.ts`
- 聊天人物 CRUD：`src/app/(app)/contacts/**`、`src/components/contacts/**`、`src/lib/actions/contacts.ts`
- 對話紀錄 CRUD：`src/app/(app)/conversations/**`、`src/components/conversations/**`、`src/lib/actions/conversations.ts`
- 手動訊息新增/編輯/刪除（左右對話框）：`src/components/chat/MessageComposer.tsx`、`MessageBubble.tsx`、`MessageEditForm.tsx`、`src/lib/actions/messages.ts`
- 批次貼上對話（解析＋預覽）：`src/lib/chatParser.ts`、`src/components/chat/BatchPasteDialog.tsx`
- 聊天截圖上傳（壓縮／私人 Storage／排序／說明／刪除）：`src/lib/storage.ts`、`src/components/attachments/**`、`src/lib/actions/attachments.ts`
- 歷史搜尋：`src/app/(app)/search/page.tsx`、`src/lib/search.ts`
- 首頁儀表板：`src/app/(app)/page.tsx`
- Dark mode：`src/app/globals.css`（`@custom-variant dark`）、`src/components/layout/ThemeInit.tsx`、`ThemeToggle.tsx`
- 成功/錯誤訊息：`src/components/ui/Toast.tsx`（所有新增／更新／刪除／上傳操作皆會呼叫 `toast.success` / `toast.error`）

## 6. 已知限制（第一版 MVP 範圍外）

依需求規格，以下項目刻意不在第一版實作：AI 回覆建議、AI 對話分析與評分、OCR 截圖辨識、自動讀取 LINE/Instagram、向量資料庫與 RAG、情緒或人格分析、即時聊天與通知。

## 7. 檢查結果

於本機（無真實 Supabase 專案，`.env.local` 使用 placeholder 值）執行：

```bash
npm run lint        # ✅ 0 errors, 0 warnings
npx tsc --noEmit     # ✅ 0 errors
npm run build        # ✅ 編譯成功，13 條路由全部產生
```

所有頁面皆使用 `cookies()`/`auth.getUser()`，因此在 build 階段以動態渲染（ƒ）方式產生，不會在建置期間對 Supabase 發出請求；實際資料存取與 RLS 驗證需連接真實 Supabase 專案才能完整測試（登入、CRUD、上傳、搜尋、登出後無法存取等完整流程）。

> 專案未內建自動化測試（`npm run test`）；此 MVP 的驗收方式為第七節列出的 lint／type check／build，以及依「完成標準」列出的十個步驟手動走查。
