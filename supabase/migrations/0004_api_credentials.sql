-- API Credentials table (支持多个 AI 平台)
CREATE TABLE api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- "openai", "claude", etc.
  model TEXT NOT NULL,   -- "gpt-4o", "claude-3-5-sonnet", etc.
  api_key TEXT NOT NULL, -- 明文存储
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 确保每个用户只有一个 provider 配置
  UNIQUE(user_id, provider) WHERE is_active = true
);

-- API Usage Logs table (记录成本)
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_credential_id UUID NOT NULL REFERENCES api_credentials(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Token 统计
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,

  -- 成本（美元）
  input_cost DECIMAL(10, 8), -- 单位：USD per 1M tokens 或 per 1K tokens
  output_cost DECIMAL(10, 8),
  total_cost DECIMAL(10, 8),

  -- 操作信息
  operation TEXT, -- "parse-image", "chat-completion", etc.
  status TEXT NOT NULL DEFAULT 'success', -- "success", "failed", "rate_limited"
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 索引优化查询性能
CREATE INDEX idx_api_credentials_user_id ON api_credentials(user_id);
CREATE INDEX idx_api_credentials_active ON api_credentials(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_api_usage_logs_conversation_id ON api_usage_logs(conversation_id);

-- 自动更新 updated_at
CREATE TRIGGER update_api_credentials_updated_at
BEFORE UPDATE ON api_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
