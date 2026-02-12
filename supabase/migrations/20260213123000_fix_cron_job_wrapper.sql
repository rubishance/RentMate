-- Fix Daily Admin Summary Cron by wrapping in a robust function
-- (Revised to return VOID for simplicity and be more robust)

BEGIN;

CREATE OR REPLACE FUNCTION public.trigger_daily_admin_summary()
RETURNS VOID AS $$
DECLARE
    v_ref TEXT;
    v_key TEXT;
    v_url TEXT;
BEGIN
    -- Fetch config 
    v_ref := public.get_supabase_config('supabase_project_ref');
    v_key := public.get_supabase_config('supabase_service_role_key');
    
    -- Validate config
    IF v_ref IS NULL OR v_key IS NULL THEN
        RAISE WARNING 'Daily Admin Summary skipped: Missing config (ref=%, key_present=%)', v_ref, (v_key IS NOT NULL);
        RETURN;
    END IF;

    -- Construct URL
    v_url := 'https://' || v_ref || '.supabase.co/functions/v1/send-daily-admin-summary';
    
    -- Perform the request
    -- net.http_post returns bigint, so we must discard it or catch it.
    -- PERFORM discards the result.
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Daily Admin Summary Trigger Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reschedule the cron job
DO $$
BEGIN
    -- Unschedule existing job
    PERFORM cron.unschedule('daily-admin-summary');
    
    -- Schedule new job
    -- 08:30 Israel Time is 06:30 UTC.
    PERFORM cron.schedule(
        'daily-admin-summary',
        '30 6 * * *', 
        'SELECT public.trigger_daily_admin_summary()'
    );
END $$;

COMMIT;
