-- Enhance get_users_with_stats RPC with deeper analytics
DROP FUNCTION IF EXISTS get_users_with_stats();

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    -- User Profile Columns
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role user_role,
    subscription_status subscription_status,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    
    -- Stats
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT,
    ai_sessions_count BIGINT,
    open_tickets_count BIGINT,
    storage_usage_mb NUMERIC
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
        up.phone,
        up.role,
        up.subscription_status,
        up.plan_id,
        up.created_at,
        up.last_login,
        
        -- Basic Counts
        COALESCE(p.count, 0) as properties_count,
        COALESCE(t.count, 0) as tenants_count,
        COALESCE(c.count, 0) as contracts_count,
        
        -- AI Usage
        COALESCE(ai.count, 0) as ai_sessions_count,
        
        -- Support Status
        COALESCE(st.count, 0) as open_tickets_count,
        
        -- Storage Usage (Bytes to MB)
        ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2) as storage_usage_mb
        
    FROM user_profiles up
    -- Property Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM properties GROUP BY user_id) p ON up.id = p.user_id
    -- Tenant Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM tenants GROUP BY user_id) t ON up.id = t.user_id
    -- Contract Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM contracts GROUP BY user_id) c ON up.id = c.user_id
    -- AI Counts
    LEFT JOIN (SELECT user_id, count(*) as count FROM ai_conversations GROUP BY user_id) ai ON up.id = ai.user_id
    -- Open Support Tickets
    LEFT JOIN (SELECT user_id, count(*) as count FROM support_tickets WHERE status != 'resolved' GROUP BY user_id) st ON up.id = st.user_id
    -- Storage Usage
    LEFT JOIN user_storage_usage usu ON up.id = usu.user_id
    
    ORDER BY up.created_at DESC;
END;
$$;
