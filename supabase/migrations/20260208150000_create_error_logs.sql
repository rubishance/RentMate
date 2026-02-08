-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    stack TEXT,
    route TEXT,
    component_stack TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN DEFAULT false,
    environment TEXT DEFAULT 'production'
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone (even unauthenticated) can insert logs (so we catch 404s/auth errors)
DROP POLICY IF EXISTS "Allow anonymous inserts to error_logs" ON public.error_logs;
CREATE POLICY "Allow anonymous inserts to error_logs" ON public.error_logs
    FOR INSERT WITH CHECK (true);

-- 2. Only admins can view logs
DROP POLICY IF EXISTS "Allow admins to view error_logs" ON public.error_logs;
CREATE POLICY "Allow admins to view error_logs" ON public.error_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- 3. Only admins can update logs (mark as resolved)
DROP POLICY IF EXISTS "Allow admins to update error_logs" ON public.error_logs;
CREATE POLICY "Allow admins to update error_logs" ON public.error_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- 4. Trigger to notify admin on error
CREATE OR REPLACE FUNCTION public.notify_admin_on_error()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
BEGIN
    PERFORM
      net.http_post(
        url := project_url || '/functions/v1/send-admin-alert',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
        body := json_build_object(
            'type', TG_OP,
            'table', 'error_logs',
            'record', row_to_json(NEW)
        )::jsonb
      );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger error notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_error_log_inserted ON public.error_logs;
CREATE TRIGGER on_error_log_inserted
    AFTER INSERT ON public.error_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admin_on_error();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_is_resolved ON public.error_logs (is_resolved) WHERE (is_resolved = false);
