-- AI Chat Usage Tracking
CREATE TABLE IF NOT EXISTS ai_chat_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI Usage Limits per Subscription Tier
CREATE TABLE IF NOT EXISTS ai_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    monthly_message_limit INTEGER NOT NULL,
    monthly_token_limit INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO ai_usage_limits (tier_name, monthly_message_limit, monthly_token_limit) VALUES
    ('free', 50, 50000),           -- 50 messages, ~50k tokens
    ('basic', 200, 200000),         -- 200 messages, ~200k tokens
    ('pro', 1000, 1000000),         -- 1000 messages, ~1M tokens
    ('business', -1, -1)            -- Unlimited (-1)
ON CONFLICT (tier_name) DO NOTHING;

-- Function to check and log AI usage
CREATE OR REPLACE FUNCTION check_ai_chat_usage(
    p_user_id UUID,
    p_tokens_used INTEGER DEFAULT 500
)
RETURNS JSON AS $$
DECLARE
    v_usage RECORD;
    v_limit RECORD;
    v_user_tier TEXT;
    v_result JSON;
BEGIN
    -- Get user's subscription tier
    SELECT subscription_tier INTO v_user_tier
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Default to free if no tier found
    v_user_tier := COALESCE(v_user_tier, 'free');
    
    -- Get limits for this tier
    SELECT * INTO v_limit
    FROM ai_usage_limits
    WHERE tier_name = v_user_tier;
    
    -- Get or create usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_usage
    FROM ai_chat_usage
    WHERE user_id = p_user_id;
    
    -- Check if we need to reset (monthly)
    IF v_usage.last_reset_at < DATE_TRUNC('month', NOW()) THEN
        UPDATE ai_chat_usage
        SET message_count = 0,
            tokens_used = 0,
            last_reset_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        v_usage.message_count := 0;
        v_usage.tokens_used := 0;
    END IF;
    
    -- Check limits (skip if unlimited)
    IF v_limit.monthly_message_limit != -1 AND v_usage.message_count >= v_limit.monthly_message_limit THEN
        v_result := json_build_object(
            'allowed', false,
            'reason', 'message_limit_exceeded',
            'current_usage', v_usage.message_count,
            'limit', v_limit.monthly_message_limit,
            'tier', v_user_tier
        );
        RETURN v_result;
    END IF;
    
    IF v_limit.monthly_token_limit != -1 AND v_usage.tokens_used >= v_limit.monthly_token_limit THEN
        v_result := json_build_object(
            'allowed', false,
            'reason', 'token_limit_exceeded',
            'current_usage', v_usage.tokens_used,
            'limit', v_limit.monthly_token_limit,
            'tier', v_user_tier
        );
        RETURN v_result;
    END IF;
    
    -- Increment usage
    UPDATE ai_chat_usage
    SET message_count = message_count + 1,
        tokens_used = tokens_used + p_tokens_used,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Return success
    v_result := json_build_object(
        'allowed', true,
        'current_messages', v_usage.message_count + 1,
        'message_limit', v_limit.monthly_message_limit,
        'current_tokens', v_usage.tokens_used + p_tokens_used,
        'token_limit', v_limit.monthly_token_limit,
        'tier', v_user_tier
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE ai_chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own AI usage"
    ON ai_chat_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all AI usage"
    ON ai_chat_usage FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Everyone can view limits (for UI display)
CREATE POLICY "Anyone can view AI limits"
    ON ai_usage_limits FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify limits
CREATE POLICY "Admins can modify AI limits"
    ON ai_usage_limits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_id ON ai_chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_last_reset ON ai_chat_usage(last_reset_at);
