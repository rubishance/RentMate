-- AI Detailed Usage Tracking for Cost Analysis
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    feature TEXT NOT NULL, -- 'chat' or 'contract-extraction'
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all AI usage logs
CREATE POLICY "Admins can view all AI usage logs"
    ON public.ai_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to log AI usage with cost calculation
CREATE OR REPLACE FUNCTION public.log_ai_usage(
    p_user_id UUID,
    p_model TEXT,
    p_feature TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost_input NUMERIC;
    v_cost_output NUMERIC;
    v_total_cost NUMERIC;
BEGIN
    -- Determine costs based on model
    -- Prices per 1M tokens
    IF p_model LIKE 'gpt-4o-mini%' THEN
        v_cost_input := 0.15;
        v_cost_output := 0.60;
    ELSIF p_model LIKE 'gpt-4o%' THEN
        v_cost_input := 2.50;
        v_cost_output := 10.00;
    ELSE
        -- Default/Fallback (GPT-4o-mini prices if unknown)
        v_cost_input := 0.15;
        v_cost_output := 0.60;
    END IF;

    -- Calculate total cost
    v_total_cost := (p_input_tokens::NUMERIC / 1000000 * v_cost_input) + (p_output_tokens::NUMERIC / 1000000 * v_cost_output);

    -- Insert log
    INSERT INTO public.ai_usage_logs (
        user_id,
        model,
        feature,
        input_tokens,
        output_tokens,
        estimated_cost_usd
    ) VALUES (
        p_user_id,
        p_model,
        p_feature,
        p_input_tokens,
        p_output_tokens,
        v_total_cost
    );

    -- Update the old aggregator table if it exists
    INSERT INTO public.ai_chat_usage (user_id, message_count, tokens_used, updated_at)
    VALUES (p_user_id, 1, p_input_tokens + p_output_tokens, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET message_count = public.ai_chat_usage.message_count + 1,
        tokens_used = public.ai_chat_usage.tokens_used + (p_input_tokens + p_output_tokens),
        updated_at = NOW();
END;
$$;

-- Update get_admin_stats to include AI cost
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
    total_ai_cost_usd NUMERIC;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count
    FROM contracts;

    -- Get total revenue (sum of paid payments)
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount
    FROM payments
    WHERE status = 'paid';

    -- Get active users (users who logged in within last 30 days)
    SELECT COUNT(*) INTO active_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL
    AND updated_at > NOW() - INTERVAL '30 days';

    -- Get total AI cost
    SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO total_ai_cost_usd
    FROM ai_usage_logs;

    -- Build JSON result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost_usd
    );

    RETURN result;
END;
$$;
