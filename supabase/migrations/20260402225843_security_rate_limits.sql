-- Database Backend for Edge Function Rate Limiting

CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    request_count INT NOT NULL DEFAULT 1,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Ensure RLS is enabled but only fully accessible by service role
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rate limits are isolated" ON public.rate_limits
    FOR ALL USING (auth.uid() = user_id);

-- Migration Function for Atomic Counter
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_limit INT
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INT;
BEGIN
    INSERT INTO public.rate_limits (user_id, endpoint, request_count, last_request)
    VALUES (p_user_id, p_endpoint, 1, NOW())
    ON CONFLICT (user_id, endpoint) DO UPDATE
    SET 
        request_count = CASE 
            WHEN rate_limits.last_request < NOW() - INTERVAL '1 minute' THEN 1 
            ELSE rate_limits.request_count + 1 
        END,
        last_request = NOW()
    RETURNING request_count INTO v_count;

    IF v_count > p_limit THEN
        RETURN FALSE;
    ELSE
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (so the check from the edge function using service role or user JWT can work)
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, TEXT, INT) TO authenticated, service_role;
