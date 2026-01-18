-- ============================================
-- 4. Get User Stats RPC
-- ============================================

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    -- User Profile Columns
    id UUID,
    email TEXT,
    full_name TEXT,
    role user_role,
    subscription_status subscription_status,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    
    -- Stats
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
        up.role,
        up.subscription_status,
        up.plan_id,
        up.created_at,
        
        -- Counts (Coalesce to 0)
        COALESCE(p.count, 0) as properties_count,
        COALESCE(t.count, 0) as tenants_count,
        COALESCE(c.count, 0) as contracts_count
    FROM user_profiles up
    -- Join Property Counts
    LEFT JOIN (
        SELECT user_id, count(*) as count 
        FROM properties 
        GROUP BY user_id
    ) p ON up.id = p.user_id
    -- Join Tenant Counts
    LEFT JOIN (
        SELECT user_id, count(*) as count 
        FROM tenants 
        GROUP BY user_id
    ) t ON up.id = t.user_id
    -- Join Contract Counts
    LEFT JOIN (
        SELECT user_id, count(*) as count 
        FROM contracts 
        GROUP BY user_id
    ) c ON up.id = c.user_id
    
    ORDER BY up.created_at DESC;
END;
$$;
