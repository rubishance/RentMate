-- Migration: Fix Plan Management Policies and ID handling
-- Description: Adds missing RLS policies for admins to manage subscription plans.

-- 1. Correct RLS Policies for subscription_plans
-- DROP existing policies if any to ensure clean state (though none were found in research)
DROP POLICY IF EXISTS "Admins can insert plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can update plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can delete plans" ON subscription_plans;

-- INSERT: Only admins
CREATE POLICY "Admins can insert plans"
    ON subscription_plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    );

-- UPDATE: Only admins
CREATE POLICY "Admins can update plans"
    ON subscription_plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    );

-- DELETE: Only admins
CREATE POLICY "Admins can delete plans"
    ON subscription_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR is_super_admin = true)
        )
    );
