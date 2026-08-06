-- RLS 策略: api_credentials
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API credentials"
ON api_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create API credentials"
ON api_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API credentials"
ON api_credentials
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API credentials"
ON api_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- RLS 策略: api_usage_logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
ON api_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create usage logs"
ON api_usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);
