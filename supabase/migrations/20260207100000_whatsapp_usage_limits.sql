-- Migration: Add WhatsApp Usage Limits
-- Description: Adds limits to subscription plans and per-user overrides for WhatsApp messaging.

BEGIN;

-- 1. Add max_whatsapp_messages to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_whatsapp_messages INTEGER DEFAULT 50;

-- 2. Update Seed Data for existing plans
UPDATE public.subscription_plans SET max_whatsapp_messages = 50 WHERE id = 'free';
UPDATE public.subscription_plans SET max_whatsapp_messages = 500 WHERE id = 'pro';
UPDATE public.subscription_plans SET max_whatsapp_messages = -1 WHERE id = 'enterprise';
UPDATE public.subscription_plans SET max_whatsapp_messages = -1 WHERE id = 'master';

-- 3. Add whatsapp_limit_override to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS whatsapp_limit_override INTEGER DEFAULT NULL;

-- 3b. Also add to ai_usage_limits for UI consistency in Usage Dashboard
ALTER TABLE public.ai_usage_limits
ADD COLUMN IF NOT EXISTS monthly_whatsapp_limit INTEGER DEFAULT 50;

UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = 50 WHERE tier_name = 'free';
UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = 500 WHERE tier_name = 'pro';
UPDATE public.ai_usage_limits SET monthly_whatsapp_limit = -1 WHERE tier_name = 'enterprise';

-- 4. Create WhatsApp Usage Logs Table
-- This tracks OUTBOUND messages to count against the quota
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_usage_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_user_date ON public.whatsapp_usage_logs (user_id, created_at);

-- Policies
CREATE POLICY "Users can view their own whatsapp usage logs"
    ON public.whatsapp_usage_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can manage all usage logs"
    ON public.whatsapp_usage_logs FOR ALL
    USING (public.is_admin());

-- 5. RPC to check and log usage
-- Returns { allowed: boolean, current_usage: int, limit: int }
CREATE OR REPLACE FUNCTION public.check_and_log_whatsapp_usage(p_user_id UUID, p_conversation_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_current_usage INTEGER;
    v_month_start TIMESTAMPTZ;
BEGIN
    -- SECURITY CHECK: 
    -- Only admin or the user themselves can trigger this check
    IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Get current month start
    v_month_start := date_trunc('month', now());

    -- 1. Get User's Limit and Override
    SELECT 
        COALESCE(up.whatsapp_limit_override, p.max_whatsapp_messages, 50) INTO v_limit
    FROM public.user_profiles up
    JOIN public.subscription_plans p ON up.plan_id = p.id
    WHERE up.id = p_user_id;

    -- Fallback if user or plan not found
    IF v_limit IS NULL THEN
        v_limit := 50;
    END IF;

    -- 2. Count total WhatsApp usage this month (Outbound messages)
    SELECT COUNT(*)::INTEGER INTO v_current_usage
    FROM public.whatsapp_usage_logs
    WHERE user_id = p_user_id
      AND created_at >= v_month_start;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + 1) <= v_limit THEN
        -- Log the usage
        INSERT INTO public.whatsapp_usage_logs (user_id, conversation_id)
        VALUES (p_user_id, p_conversation_id);
        
        RETURN jsonb_build_object(
            'allowed', true,
            'current_usage', v_current_usage + 1,
            'limit', v_limit
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'current_usage', v_current_usage,
            'limit', v_limit,
            'error', 'Limit exceeded'
        );
    END IF;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
