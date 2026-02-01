-- Migration: 20260130153116_final_schema_cleanup.sql
-- Description: Removes obsolete columns and tables identified in the schema audit.
-- Replaces: legacy 'tenants' table, redundant 'properties' fields, and legacy 'user_profiles' fields.

BEGIN;

-- 1. Remove obsolete columns from 'contracts'
ALTER TABLE public.contracts DROP COLUMN IF EXISTS tenant_id;

-- 2. Remove redundant columns from 'properties'
-- Status is now derived from triggers/contracts, rent is in contracts, title is address + city
ALTER TABLE public.properties DROP COLUMN IF EXISTS title;
ALTER TABLE public.properties DROP COLUMN IF EXISTS rent_price;
ALTER TABLE public.properties DROP COLUMN IF EXISTS status;

-- 3. Remove redundant columns from 'user_profiles'
-- Drop trigger and function before dropping the column its dependencies
DROP TRIGGER IF EXISTS tr_sync_user_tier ON public.user_profiles;
DROP FUNCTION IF EXISTS sync_user_tier();

ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS last_name;

-- 4. Remove the redundant 'tenants' table
-- Migration 20260126000014 already backfilled this data into contracts.tenants JSONB
DROP TABLE IF EXISTS public.tenants CASCADE;

-- 5. Update get_users_with_stats RPC to count tenants from embedded data
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
    -- Tenant Counts (from embedded JSONB in contracts)
    LEFT JOIN (
        SELECT user_id, sum(jsonb_array_length(COALESCE(tenants, '[]'::jsonb))) as count 
        FROM contracts 
        GROUP BY user_id
    ) t ON up.id = t.user_id
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

COMMIT;
