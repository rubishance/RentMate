-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================

-- 1. Create a SECURITY DEFINER function to check admin status
-- This function runs with the privileges of the creator (superuser), bypassing RLS.
-- This breaks the infinite loop where checking RLS required querying the table protected by RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public -- Secure the search path
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Admins see all" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all" ON user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins manage CRM" ON crm_interactions;
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;

-- Resets for User Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- 3. Recreate Policies using the Safe Function

-- A. User Profiles
CREATE POLICY "Users can view own profile" 
    ON user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
    ON user_profiles FOR SELECT 
    USING (is_admin());

CREATE POLICY "Admins can update all profiles" 
    ON user_profiles FOR UPDATE 
    USING (is_admin());

-- B. CRM Interactions (Admin Only)
CREATE POLICY "Admins manage CRM"
    ON crm_interactions FOR ALL
    USING (is_admin());

-- C. Audit Logs (Admin Only)
CREATE POLICY "Admins view audit logs"
    ON audit_logs FOR SELECT
    USING (is_admin());

-- D. Invoices (Users own, Admins all)
DROP POLICY IF EXISTS "Users view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins view all invoices" ON invoices;

CREATE POLICY "Users view own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins view all invoices"
    ON invoices FOR SELECT
    USING (is_admin());
