-- Migration: fix_subscription_management_rls_and_cleanup
-- Description: Fixes RLS violation for plan management and removes the redundant max_tenants column.

-- 1. Redefine is_admin to be super robust (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR is_super_admin = true)
    );
END;
$$;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can update plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON subscription_plans;

-- 3. Create new policies using is_admin() helper
CREATE POLICY "Admins can insert plans"
    ON subscription_plans FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update plans"
    ON subscription_plans FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete plans"
    ON subscription_plans FOR DELETE
    USING (public.is_admin());

-- 4. Remove the max_tenants column as it is irrelevant (no dedicated tenants data)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'max_tenants'
    ) THEN
        ALTER TABLE subscription_plans DROP COLUMN max_tenants;
    END IF;
END $$;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
