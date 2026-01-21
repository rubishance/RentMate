-- ============================================
-- ADMIN STATS FUNCTION
-- ============================================
-- Creates a function that allows admins to get system-wide statistics
-- bypassing RLS policies

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_admin_stats();

-- Create admin stats function
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

    -- Build JSON result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count
    );

    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (function will check admin role internally)
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_admin_stats() IS 'Returns system-wide statistics for admin dashboard. Only accessible by users with admin role.';
