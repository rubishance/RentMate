-- Migration: fix_admin_permissions
-- Description: Grants execute permissions on admin RPCs and ensures admins can view all data for management purposes.

-- 1. Grant Execute on RPCs
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;

-- 2. Ensure Admin Policies for Management Tables
-- user_storage_usage
DROP POLICY IF EXISTS "Admins can view all storage usage" ON public.user_storage_usage;
CREATE POLICY "Admins can view all storage usage"
    ON public.user_storage_usage FOR SELECT
    USING (public.is_admin());

-- audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

-- property_documents (Admin should be able to see metadata at least? usually handled by service role or specific rpc)
-- For now, let's just make sure the storage usage tracking is solid.

-- 3. Fix user_profiles RLS if it's missing (it was in reset_auth_policies.sql, but let's be safe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        -- Re-run the policies to be absolutely sure
        DROP POLICY IF EXISTS "Admins view all" ON public.user_profiles;
        CREATE POLICY "Admins view all" 
            ON public.user_profiles FOR SELECT 
            USING (public.is_admin());
            
        DROP POLICY IF EXISTS "Admins update all" ON public.user_profiles;
        CREATE POLICY "Admins update all" 
            ON public.user_profiles FOR UPDATE 
            USING (public.is_admin());
    END IF;
END $$;
