-- Create a debug logs table to capture Edge Function execution
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    function_name TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB
);

-- Enable RLS but allow service role to insert
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to insert debug logs"
    ON public.debug_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Allow service role to select debug logs"
    ON public.debug_logs
    FOR SELECT
    TO service_role
    USING (true);

-- Grant access to authenticated users (admin only ideally, but keeping simple for now)
GRANT ALL ON public.debug_logs TO service_role;
GRANT SELECT ON public.debug_logs TO authenticated;
