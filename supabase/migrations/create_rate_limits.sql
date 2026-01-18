-- Create a table to track rate limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_idx ON public.rate_limits(ip_address, endpoint);

-- Function to clean up old rate limit entries (e.g., older than 1 hour)
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limits
    WHERE last_request_at < (now() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (although Edge Functions might bypass it with service role, good practice)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny public access by default (only service role should write)
CREATE POLICY "No public access" ON public.rate_limits
    FOR ALL
    USING (false);
