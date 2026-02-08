-- Migration: Hardening Access Control
-- Description: Restricts system_settings read access and secures administrative roles.

-- 1. HARDEN system_settings
-- Only Super Admins can read the full settings. Regular users see nothing (unless we specificy public keys).
DROP POLICY IF EXISTS "Everyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can read system settings" ON public.system_settings;
CREATE POLICY "Admins can read system settings" ON public.system_settings
    FOR SELECT
    USING (public.is_admin());

-- 2. PREVENT ROLE SELF-ESCALATION
-- Create a trigger function to ensure only admins can change roles
CREATE OR REPLACE FUNCTION public.check_role_change() 
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role != NEW.role OR OLD.is_super_admin != NEW.is_super_admin) THEN
        -- Check if the PERFOMING user is an admin
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
        ) THEN
            RAISE EXCEPTION 'Access Denied: You cannot modify roles without administrative privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_role_change ON public.user_profiles;
CREATE TRIGGER tr_on_role_change
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_role_change();

-- 3. REMOVE SENSITIVE KEYS FROM PUBLIC TABLE (MOVE TO ENV/VAULT)
-- These keys should NOT be in the table for long-term security.
DELETE FROM public.system_settings WHERE key IN ('supabase_service_role_key', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN');

NOTIFY pgrst, 'reload schema';
