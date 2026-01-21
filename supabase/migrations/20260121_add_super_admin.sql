-- Add is_super_admin column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create RPC for financial metrics (Super Admin Only)
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_mrr decimal := 0;
    total_users int := 0;
    active_subs int := 0;
    new_users_30d int := 0;
    churn_rate decimal := 0; -- Placeholder for now
    is_super boolean;
BEGIN
    -- Check if requesting user is super admin
    SELECT is_super_admin INTO is_super
    FROM user_profiles 
    WHERE id = auth.uid();

    IF is_super IS NOT TRUE THEN
        RAISE EXCEPTION 'Access Denied: Super Admin Only';
    END IF;

    -- 1. Total Users
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    
    -- 2. Active Subscribers (Any plan that is not 'free' or 'free_forever')
    -- Note: This depends on how you categorize 'active' payment plans. 
    -- We assume existence of plan_id implies a subscription if it's not the default free one.
    SELECT COUNT(*) INTO active_subs 
    FROM user_profiles 
    WHERE plan_id IS NOT NULL 
    AND plan_id NOT IN ('free', 'free_forever')
    AND subscription_status = 'active';
    
    -- 3. MRR Calculation
    -- Sum of price_monthly for all active users based on their plan_id
    SELECT COALESCE(SUM(sp.price_monthly), 0)
    INTO total_mrr
    FROM user_profiles up
    JOIN subscription_plans sp ON up.plan_id = sp.id
    WHERE up.subscription_status = 'active';
    
    -- 4. Growth (New users in last 30 days)
    SELECT COUNT(*) INTO new_users_30d
    FROM user_profiles
    WHERE created_at > (NOW() - INTERVAL '30 days');

    RETURN json_build_object(
        'mrr', total_mrr,
        'total_users', total_users,
        'active_subscribers', active_subs,
        'new_users_30d', new_users_30d,
        'churn_rate', 0 -- TODO: Implement churn logic later
    );
END;
$$;
