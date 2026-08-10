-- AI 分析風格 prompt，跟著每一組 API 設定走。
-- 每位使用者的 key 各自一份，就跟 api_key、model 一樣。
-- NULL 或空字串代表使用程式內建的預設 prompt。
-- 這份檔案可以重複執行，不會出錯。

ALTER TABLE public.api_credentials
  ADD COLUMN IF NOT EXISTS system_prompt text;
