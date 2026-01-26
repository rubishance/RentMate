-- ============================================
-- AI Usage Tracking & Limits
-- ============================================

-- 1. Add max_ai_scans to subscription_plans
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_ai_scans INTEGER DEFAULT 5;

-- 2. Update Seed Data for existing plans
UPDATE subscription_plans SET max_ai_scans = 5 WHERE id = 'free';
UPDATE subscription_plans SET max_ai_scans = 50 WHERE id = 'pro';
UPDATE subscription_plans SET max_ai_scans = -1 WHERE id = 'enterprise';

-- 3. Create AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL, -- 'bill_scan', 'contract_analysis', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs (user_id, created_at);

-- Policies
CREATE POLICY "Users can view their own usage logs"
    ON ai_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 4. RPC to check and log usage
-- Returns { allowed: boolean, current_usage: int, limit: int }
CREATE OR REPLACE FUNCTION check_and_log_ai_usage(p_user_id UUID, p_feature TEXT DEFAULT 'bill_scan', p_count INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_current_usage INTEGER;
    v_month_start TIMESTAMPTZ;
    v_requester_role TEXT;
BEGIN
    -- SECURITY CHECK: 
    -- 1. Must be authenticated
    -- 2. Must be logging for self OR be an admin
    SELECT role INTO v_requester_role FROM public.user_profiles WHERE id = auth.uid();
    
    IF p_user_id != auth.uid() AND COALESCE(v_requester_role, 'user') != 'admin' THEN
        RAISE EXCEPTION 'Access Denied: You cannot log usage for another user.';
    END IF;

    -- Get current month start
    v_month_start := date_trunc('month', now());

    -- 1. Get User's Limit from their plan
    SELECT p.max_ai_scans INTO v_limit
    FROM user_profiles up
    JOIN subscription_plans p ON up.plan_id = p.id
    WHERE up.id = p_user_id;

    -- Fallback to default free limit if not found
    IF v_limit IS NULL THEN
        v_limit := 5;
    END IF;

    -- 2. Count total AI usage this month
    SELECT COUNT(*)::INTEGER INTO v_current_usage
    FROM ai_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= v_month_start;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + p_count) <= v_limit THEN
        -- Log the usage (multiple entries)
        FOR i IN 1..p_count LOOP
            INSERT INTO ai_usage_logs (user_id, feature_name)
            VALUES (p_user_id, p_feature);
        END LOOP;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'current_usage', v_current_usage + p_count,
            'limit', v_limit
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'current_usage', v_current_usage,
            'limit', v_limit
        );
    END IF;
END;
$$;
