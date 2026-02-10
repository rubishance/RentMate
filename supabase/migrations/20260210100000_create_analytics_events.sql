-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    -- Admins can read all events
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'analytics_events' AND policyname = 'Admins can read all analytics'
    ) THEN
        CREATE POLICY "Admins can read all analytics" ON public.analytics_events
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    -- Users can insert their own events (hidden from others)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'analytics_events' AND policyname = 'Users can log their own events'
    ) THEN
        CREATE POLICY "Users can log their own events" ON public.analytics_events
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- RPC for aggregated stats
DROP FUNCTION IF EXISTS public.get_global_usage_stats(INTEGER);
CREATE OR REPLACE FUNCTION get_global_usage_stats(days_limit INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'top_users', (
            SELECT jsonb_agg(u) FROM (
                SELECT 
                    ae.user_id,
                    up.full_name,
                    up.email,
                    count(*) as event_count
                FROM analytics_events ae
                JOIN user_profiles up ON ae.user_id = up.id
                WHERE ae.created_at > now() - (days_limit || ' days')::interval
                GROUP BY ae.user_id, up.full_name, up.email
                ORDER BY event_count DESC
                LIMIT 10
            ) u
        ),
        'popular_features', (
            SELECT jsonb_agg(f) FROM (
                SELECT 
                    event_name,
                    count(*) as usage_count
                FROM analytics_events
                WHERE created_at > now() - (days_limit || ' days')::interval
                GROUP BY event_name
                ORDER BY usage_count DESC
            ) f
        ),
        'daily_trends', (
            SELECT jsonb_agg(t) FROM (
                SELECT 
                    date_trunc('day', created_at)::date as day,
                    count(*) as count
                FROM analytics_events
                WHERE created_at > now() - (days_limit || ' days')::interval
                GROUP BY 1
                ORDER BY 1 ASC
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$$;
