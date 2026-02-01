-- Migration: tighten_payments_rls
-- Description: Ensures payments are strictly isolated by user_id, dropping any previous permissive policies.

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.payments;
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

-- 2. Create strict ownership policies based on user_id
CREATE POLICY "Users can view own payments"   ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (user_id = auth.uid());

-- 3. Ensure Admin view is still preserved (if admin_god_mode_rls was applied)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
        CREATE POLICY "Admins view all payments" 
            ON public.payments FOR SELECT 
            USING (public.is_admin());
    END IF;
END $$;
