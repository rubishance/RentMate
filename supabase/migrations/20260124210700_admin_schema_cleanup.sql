-- Migration: fix_admin_schema_issues_20260124
-- Description: Fixes discrepancies in user_profiles, user_storage_usage, and AI usage tracking.

-- 1. Add subscription_tier to user_profiles (for AI Usage and older queries)
-- We keep it in sync with plan_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
END $$;

-- Update existing data
UPDATE user_profiles SET subscription_tier = plan_id WHERE subscription_tier IS NULL OR subscription_tier != plan_id;

-- Create sync trigger
CREATE OR REPLACE FUNCTION sync_user_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subscription_tier := NEW.plan_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_user_tier ON user_profiles;
CREATE TRIGGER tr_sync_user_tier
    BEFORE INSERT OR UPDATE OF plan_id ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_tier();

-- 2. Fix the Foreign Key for Storage Usage (PostgREST needs explicit profiles link)
DO $$ 
BEGIN
    -- First drop auth.users link if it's the only one
    -- ALTER TABLE user_storage_usage DROP CONSTRAINT IF EXISTS user_storage_usage_user_id_fkey;
    
    -- Ensure link to user_profiles
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_storage_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.user_storage_usage 
        ADD CONSTRAINT user_storage_usage_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Fix the AI Chat Usage Function (Make it more robust)
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
    -- Get user's subscription tier (using plan_id as fallback)
    SELECT COALESCE(subscription_tier, plan_id, 'free') INTO v_user_tier
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- Default to free if no tier found
    v_user_tier := COALESCE(v_user_tier, 'free');
    
    -- Get limits for this tier
    SELECT * INTO v_limit
    FROM ai_usage_limits
    WHERE tier_name = v_user_tier;
    
    -- Fallback to free limits if tier limits not found
    IF NOT FOUND THEN
        SELECT * INTO v_limit FROM ai_usage_limits WHERE tier_name = 'free';
    END IF;
    
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

-- 4. Fix get_users_with_stats RPC structure
-- We'll use TEXT for enum columns in return type to be more flexible
DROP FUNCTION IF EXISTS get_users_with_stats();

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    subscription_status TEXT,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.role::TEXT,
        up.subscription_status::TEXT,
        up.plan_id,
        up.created_at,
        COALESCE(p.count, 0) as properties_count,
        COALESCE(t.count, 0) as tenants_count,
        COALESCE(c.count, 0) as contracts_count
    FROM user_profiles up
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    WHERE up.deleted_at IS NULL
    ORDER BY up.created_at DESC;
END;
$$;

-- 5. Force schema cache reload (if possible)
NOTIFY pgrst, 'reload schema';
