-- Migration: Security Audit Events

CREATE TABLE IF NOT EXISTS public.security_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID,
    event_type TEXT NOT NULL, -- e.g., '403', '401'
    resource TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all security logs
DROP POLICY IF EXISTS "Admins can view security audit events" ON public.security_audit_events;
CREATE POLICY "Admins can view security audit events" ON public.security_audit_events
    FOR SELECT USING (public.is_admin());

-- Notice: Service Role will insert events bypassing RLS. No insert policy needed for users.
