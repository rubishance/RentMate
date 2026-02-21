-- Hotfix: Fix AI Usage and Audit Functions
-- 1. Fix user_profiles missing column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
END $$;

-- 2. Redefine check_ai_chat_usage (from 20260124210700_admin_schema_cleanup.sql)
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
    SELECT COALESCE(subscription_tier, plan_id, 'free') INTO v_user_tier
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Default to free
    v_user_tier := COALESCE(v_user_tier, 'free');
    
    -- Get limits
    SELECT * INTO v_limit
    FROM ai_usage_limits
    WHERE tier_name = v_user_tier;
    
    -- Fallback
    IF NOT FOUND THEN
        SELECT * INTO v_limit FROM ai_usage_limits WHERE tier_name = 'free';
    END IF;
    
    -- Upsert usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_usage
    FROM ai_chat_usage
    WHERE user_id = p_user_id;
    
    -- Reset monthly logic
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
    
    -- Check limits
    IF v_limit.monthly_message_limit != -1 AND v_usage.message_count >= v_limit.monthly_message_limit THEN
        return json_build_object('allowed', false, 'reason', 'message_limit_exceeded', 'limit', v_limit.monthly_message_limit);
    END IF;
    
    IF v_limit.monthly_token_limit != -1 AND v_usage.tokens_used >= v_limit.monthly_token_limit THEN
        return json_build_object('allowed', false, 'reason', 'token_limit_exceeded', 'limit', v_limit.monthly_token_limit);
    END IF;
    
    -- Increment
    UPDATE ai_chat_usage
    SET message_count = message_count + 1,
        tokens_used = tokens_used + p_tokens_used,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN json_build_object('allowed', true, 'tier', v_user_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine log_ai_contract_audit (safe version)
CREATE OR REPLACE FUNCTION log_ai_contract_audit(
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    -- Insert into audit_logs. 
    -- Note: audit_logs doesn't have target_user_id, so we just use the available columns.
    INSERT INTO audit_logs (user_id, action, details, created_at)
    VALUES (p_user_id, p_action, p_details, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
