-- AI 建議回覆的個人化設定
-- 一位使用者一列，存自訂的分析風格 prompt。
-- 這份檔案可以重複執行，不會出錯。

CREATE TABLE IF NOT EXISTS public.ai_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  -- 留空或 NULL 代表使用程式內建的預設 prompt
  system_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_settings_select_own" ON public.ai_settings;
CREATE POLICY "ai_settings_select_own"
  ON public.ai_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_settings_insert_own" ON public.ai_settings;
CREATE POLICY "ai_settings_insert_own"
  ON public.ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_settings_update_own" ON public.ai_settings;
CREATE POLICY "ai_settings_update_own"
  ON public.ai_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_settings_delete_own" ON public.ai_settings;
CREATE POLICY "ai_settings_delete_own"
  ON public.ai_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 沿用 0001 建立的 updated_at 觸發器函式
DROP TRIGGER IF EXISTS set_updated_at ON public.ai_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
