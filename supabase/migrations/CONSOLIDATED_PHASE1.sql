-- ============================================
-- 1. Create Subscription Plans Table
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY, -- 'free', 'pro', 'enterprise'
    name TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) DEFAULT 0,
    
    -- Resource Limits (-1 for unlimited)
    max_properties INTEGER DEFAULT 1,
    max_tenants INTEGER DEFAULT 1,
    max_contracts INTEGER DEFAULT 1,
    max_sessions INTEGER DEFAULT 1,
    
    -- Modular Features
    features JSONB DEFAULT '{}'::jsonb, -- e.g. {"can_export": true, "ai_assistant": false}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read plans, only admins can modify (if we build UI for it)
CREATE POLICY "Public Read Plans" 
    ON subscription_plans FOR SELECT 
    USING (true);

-- Seed Data
INSERT INTO subscription_plans (id, name, price_monthly, max_properties, max_tenants, max_contracts, max_sessions, features)
VALUES 
    ('free', 'Free Forever', 0, 1, 2, 1, 1, '{"support_level": "basic"}'::jsonb),
    ('pro', 'Pro', 29.99, 10, 20, -1, 3, '{"support_level": "priority", "export_data": true}'::jsonb),
    ('enterprise', 'Enterprise', 99.99, -1, -1, -1, -1, '{"support_level": "dedicated", "export_data": true, "api_access": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    max_properties = EXCLUDED.max_properties,
    max_tenants = EXCLUDED.max_tenants,
    max_contracts = EXCLUDED.max_contracts,
    max_sessions = EXCLUDED.max_sessions,
    features = EXCLUDED.features;
-- ============================================
-- 2. Link User Profiles to Subscription Plans
-- ============================================

-- 1. Add plan_id column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'free';

-- 2. Migrate existing users based on old enum (if needed)
-- Assuming 'free_forever' -> 'free', anything else -> 'free' or 'enterprise'
-- Since we are just starting, defaulting to 'free' is safe.
UPDATE user_profiles SET plan_id = 'free' WHERE plan_id IS NULL;

-- 3. Drop old columns if they exist (optional cleanup)
-- We'll keep them for a moment just in case, but let's drop the reliance on the enum type eventually.
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS subscription_plan;

-- 4. Update Trigger for New Users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        id, email, full_name, role, subscription_status, plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user',
        'active',
        'free' -- Default to free plan
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- 3. Dynamic Session Limits
-- ============================================

CREATE OR REPLACE FUNCTION public.manage_session_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    new_device_type TEXT;
    session_count INT;
    oldest_session_id UUID;
    user_plan_limit INT;
BEGIN
    -- 1. Get User's Plan Limit
    SELECT sp.max_sessions
    INTO user_plan_limit
    FROM public.user_profiles up
    JOIN public.subscription_plans sp ON up.plan_id = sp.id
    WHERE up.id = NEW.user_id;

    -- Fallback if no plan found (shouldn't happen)
    IF user_plan_limit IS NULL THEN
        user_plan_limit := 1;
    END IF;

    -- If unlimited (-1), skip check
    IF user_plan_limit = -1 THEN
        RETURN NEW;
    END IF;

    -- 2. Identify Device Type
    new_device_type := public.get_device_type(NEW.user_agent);

    -- 3. Count EXISTING sessions
    SELECT COUNT(*)
    INTO session_count
    FROM auth.sessions
    WHERE user_id = NEW.user_id;
    -- Note: We removed the "per device type" logic to enforce a GLOBAL session limit per plan.
    -- If you want per-device, uncomment the AND clause below, but usually plans limit total active sessions.
    -- AND public.get_device_type(user_agent) = new_device_type;

    -- 4. Enforce Limit
    IF session_count >= user_plan_limit THEN
        -- Delete Oldest Session
        SELECT id
        INTO oldest_session_id
        FROM auth.sessions
        WHERE user_id = NEW.user_id
        ORDER BY created_at ASC
        LIMIT 1;

        IF oldest_session_id IS NOT NULL THEN
            DELETE FROM auth.sessions WHERE id = oldest_session_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
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
-- ============================================
-- 5. Admin Delete User RPC
-- ============================================

-- Function to delete user from auth.users (cascades to all other tables)
-- Note: modifying auth.users usually requires superuser or specific grants.
-- Usage: supabase.rpc('delete_user_account', { target_user_id: '...' })

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth -- vital for accessing auth schema
AS $$
BEGIN
    -- 1. Check if requester is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can delete users.';
    END IF;
    
    -- 2. Prevent deleting yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account via this function.';
    END IF;

    -- 3. Delete from auth.users
    -- This triggers CASCADE to user_profiles -> properties, etc.
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
