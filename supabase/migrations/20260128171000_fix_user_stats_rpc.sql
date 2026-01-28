-- Migration: fix_user_stats_rpc_v2
-- Description: Unifies get_users_with_stats RPC with correct column structure and phone support.

-- 1. Drop the function first to ensure we change the signature safely
DROP FUNCTION IF EXISTS get_users_with_stats();

-- 2. Create refined version with explicit column matching
CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT,
    subscription_status TEXT,
    plan_id TEXT,
    created_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    properties_count BIGINT,
    tenants_count BIGINT,
    contracts_count BIGINT,
    ai_sessions_count BIGINT,
    open_tickets_count BIGINT,
    storage_usage_mb NUMERIC,
    is_super_admin BOOLEAN
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
        up.role::TEXT,
        COALESCE(up.subscription_status::TEXT, 'active'),
        up.plan_id,
        up.created_at,
        up.last_login,
        
        -- Asset Stats
        COALESCE(p.count, 0)::BIGINT as properties_count,
        COALESCE(t.count, 0)::BIGINT as tenants_count,
        COALESCE(c.count, 0)::BIGINT as contracts_count,
        
        -- Usage Stats
        COALESCE(ai.count, 0)::BIGINT as ai_sessions_count,
        
        -- Support Stats
        COALESCE(st.count, 0)::BIGINT as open_tickets_count,
        
        -- Storage Usage (Bytes to MB)
        ROUND(COALESCE(usu.total_bytes, 0) / (1024.0 * 1024.0), 2)::NUMERIC as storage_usage_mb,
        
        -- Permissions
        COALESCE(up.is_super_admin, false) as is_super_admin
        
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
    LEFT JOIN (SELECT user_id, total_bytes FROM user_storage_usage) usu ON up.id = usu.user_id
    
    WHERE up.deleted_at IS NULL
    ORDER BY up.created_at DESC;
END;
$$;
