-- Migration: Handle Guest Leads Routing
-- Description: Adds 'sales@rentmate.co.il' support and guest lead user ID.

-- 1. Create a "Guest Leads" user system entry if not exists
-- We use a fixed UUID for the "System Guest" to route anonymous emails.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'guest-leads@rentmate.co.il') THEN
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
        VALUES (
          '00000000-0000-0000-0000-000000000000', 
          'guest-leads@rentmate.co.il', 
          '{"full_name": "Potential Lead"}'::jsonb, 
          NOW()
        );
    END IF;
END $$;

-- 2. Ensure profile exists for routing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'guest-leads@rentmate.co.il') THEN
        INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name, role)
        VALUES (
          '00000000-0000-0000-0000-000000000000', 
          'guest-leads@rentmate.co.il', 
          'Potential Lead', 
          'Potential',
          'Lead',
          'user'
        );
    END IF;
END $$;

-- 3. Update get_admin_stats to include automated actions count
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
    total_automated_actions INTEGER;
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
    SELECT COUNT(*) INTO total_users_count FROM user_profiles WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count FROM contracts;

    -- Get total revenue
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount FROM payments WHERE status = 'paid';

    -- Get active users (30d)
    SELECT COUNT(*) INTO active_users_count FROM user_profiles WHERE deleted_at IS NULL AND updated_at > NOW() - INTERVAL '30 days';

    -- Get total AI cost
    SELECT COALESCE(SUM(estimated_cost_usd), 0) INTO total_ai_cost_usd FROM ai_usage_logs;

    -- Get total automated actions (from logs where action_taken includes 'proposed' or 'notified')
    SELECT COUNT(*) INTO total_automated_actions FROM automation_logs;

    -- Build JSON result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost_usd,
        'totalAutomatedActions', total_automated_actions
    );

    RETURN result;
END;
$$;
