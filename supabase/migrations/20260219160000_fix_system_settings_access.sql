-- Fix system_settings RLS to allow users to read essential config
-- Current policy "Admins can read system settings" prevents users from reading chat triggers

BEGIN;

-- Drop the restrictive policy if it exists (it was created in 20260206220000)
DROP POLICY IF EXISTS "Admins can read system settings" ON public.system_settings;

-- Create a more granular policy
-- Admins see everything
-- Users see specific public keys
CREATE POLICY "Public system settings" ON public.system_settings
    FOR SELECT
    USING (
        key IN (
            'hybrid_chat_mode', 
            'live_chat_enabled', 
            'maintenance_mode',
            'support_phone',
            'support_email'
        )
        OR 
        public.is_admin()
    );

COMMIT;
