-- Migration: Fair Use and Abuse Prevention Schema
-- Description: Adds security fields to user_profiles and creates security_logs table.

BEGIN;

-- 1. Create Enums for Account Security
DO $$ BEGIN
    CREATE TYPE public.account_security_status AS ENUM ('active', 'flagged', 'suspended', 'banned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Update user_profiles with security fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS security_status public.account_security_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS security_notes TEXT[],
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_security_check TIMESTAMPTZ;

-- 3. Create security_logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_code TEXT NOT NULL, -- e.g. 'AUTH_VELOCITY', 'WHATSAPP_SPIKE', 'RESOURCE_SPIKE'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Indexing for Admin Dashboard
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);

-- 4. Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_logs;
    CREATE POLICY "Admins can view security logs"
        ON public.security_logs FOR SELECT
        USING (public.is_admin());
EXCEPTION WHEN OTHERS THEN
    CREATE POLICY "Admins can view security logs"
        ON public.security_logs FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;

-- 5. Helper Function: log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_code TEXT,
    p_severity TEXT,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip TEXT DEFAULT NULL,
    p_ua TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.security_logs (user_id, event_code, severity, details, ip_address, user_agent)
    VALUES (p_user_id, p_event_code, p_severity, p_details, p_ip, p_ua);
    
    -- Auto-flag if critical
    IF p_severity = 'critical' THEN
        UPDATE public.user_profiles 
        SET security_status = 'flagged',
            flagged_at = NOW()
        WHERE id = p_user_id AND (security_status = 'active' OR security_status IS NULL);
    END IF;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
