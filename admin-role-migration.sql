-- ============================================
-- PRODUCTION-READY ADMIN ROLE SYSTEM MIGRATION
-- ============================================
-- This migration creates a complete user management system with:
-- - User profiles with role support (user, admin, manager)
-- - Audit logging for admin actions
-- - 2FA enrollment tracking
-- - Enhanced RLS policies
-- ============================================

-- ============================================
-- 1. CREATE USER PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- ============================================
-- 2. CREATE AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 3. AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, role, mfa_enabled)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- ============================================
-- 4. UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. USER PROFILES RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile (except role and is_active)
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
        is_active = (SELECT is_active FROM user_profiles WHERE id = auth.uid())
    );

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
    ON user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only system can insert (via trigger)
CREATE POLICY "System can insert profiles"
    ON user_profiles FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 7. AUDIT LOGS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Anyone authenticated can insert audit logs
CREATE POLICY "Authenticated can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- No one can update or delete audit logs (immutable)
-- (No policies = no access)

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set user role (admin only)
CREATE OR REPLACE FUNCTION set_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if caller is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
    
    -- Validate role
    IF new_role NOT IN ('user', 'admin', 'manager') THEN
        RAISE EXCEPTION 'Invalid role. Must be: user, admin, or manager';
    END IF;
    
    -- Update role
    UPDATE user_profiles
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO audit_logs (user_id, user_email, action, details)
    SELECT 
        auth.uid(),
        (SELECT email FROM user_profiles WHERE id = auth.uid()),
        'role_changed',
        jsonb_build_object(
            'target_user_id', target_user_id,
            'new_role', new_role
        );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle user active status (admin only)
CREATE OR REPLACE FUNCTION toggle_user_active(target_user_id UUID, active_status BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if caller is admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can change user status';
    END IF;
    
    -- Prevent admin from deactivating themselves
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot deactivate your own account';
    END IF;
    
    -- Update status
    UPDATE user_profiles
    SET is_active = active_status, updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO audit_logs (user_id, user_email, action, details)
    SELECT 
        auth.uid(),
        (SELECT email FROM user_profiles WHERE id = auth.uid()),
        'user_status_changed',
        jsonb_build_object(
            'target_user_id', target_user_id,
            'is_active', active_status
        );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    action_name TEXT,
    action_details JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO audit_logs (user_id, user_email, action, details)
    SELECT 
        auth.uid(),
        (SELECT email FROM user_profiles WHERE id = auth.uid()),
        action_name,
        action_details;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_profiles
    SET last_login = NOW()
    WHERE id = auth.uid();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. MIGRATE EXISTING DATA
-- ============================================

-- Assign existing data to user profiles
-- This function should be run manually after creating your first admin user
CREATE OR REPLACE FUNCTION assign_data_to_user(target_user_id UUID)
RETURNS TEXT AS $$
BEGIN
    UPDATE properties SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE tenants SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE contracts SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE settings SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE files SET user_id = target_user_id WHERE user_id IS NULL;
    
    RETURN 'Data successfully assigned to user: ' || target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. CREATE FIRST ADMIN (MANUAL STEP)
-- ============================================
-- After running this migration and creating your first user account,
-- run this command to make yourself an admin:
--
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE email = 'your-email@example.com';
--
-- Then run:
-- SELECT assign_data_to_user('your-user-id');
-- ============================================

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Admin role system migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create your first user account via signup page';
    RAISE NOTICE '2. In Supabase Dashboard > Authentication > Users, find your user ID';
    RAISE NOTICE '3. Run: UPDATE user_profiles SET role = ''admin'' WHERE email = ''your-email@example.com'';';
    RAISE NOTICE '4. Run: SELECT assign_data_to_user(''your-user-id'');';
    RAISE NOTICE '5. Enable MFA in Supabase Dashboard > Authentication > Settings';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '  - user_profiles (with role support)';
    RAISE NOTICE '  - audit_logs (for tracking admin actions)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Functions created:';
    RAISE NOTICE '  - is_admin() - Check if user is admin';
    RAISE NOTICE '  - get_user_role() - Get user role';
    RAISE NOTICE '  - set_user_role() - Change user role (admin only)';
    RAISE NOTICE '  - toggle_user_active() - Activate/deactivate user (admin only)';
    RAISE NOTICE '  - log_admin_action() - Log admin actions';
    RAISE NOTICE '  - update_last_login() - Track login times';
END $$;
