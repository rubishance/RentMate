-- Update Index Sync Cron Schedule
-- Sets primary run to 15th at 19:00 Israel Time (17:00 UTC) 
-- with retries following every 2 hours until end of 16th.

BEGIN;

-- 1. Create a robust trigger function
CREATE OR REPLACE FUNCTION public.trigger_index_sync()
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
        RAISE WARNING 'Index Sync skipped: Missing config (ref=%, key_present=%)', v_ref, (v_key IS NOT NULL);
        RETURN;
    END IF;

    -- Construct URL
    v_url := 'https://' || v_ref || '.supabase.co/functions/v1/fetch-index-data';
    
    -- Perform the request
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
    );
    RAISE LOG 'Index Sync Triggered at %', now();
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Index Sync Trigger Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Cron Jobs
DO $$
DECLARE
    job_names TEXT[] := ARRAY['index-update-day15', 'index-update-day16', 'index-update-day17', 'index-sync-primary', 'index-sync-retry-15', 'index-sync-retry-16'];
    jname TEXT;
BEGIN
    -- Unschedule legacy jobs safely
    FOREACH jname IN ARRAY job_names LOOP
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = jname) THEN
            PERFORM cron.unschedule(jname);
        END IF;
    END LOOP;

    -- Schedule Primary Sync (15th at 19:00 Israel Time = 17:00 UTC)
    PERFORM cron.schedule(
        'index-sync-primary',
        '0 17 15 * *',
        'SELECT public.trigger_index_sync()'
    );

    -- Schedule Retry Syncs (Every 2 hours on the 15th evening and 16th)
    PERFORM cron.schedule(
        'index-sync-retry-15',
        '0 19,21,23 15 * *', 
        'SELECT public.trigger_index_sync()'
    );

    PERFORM cron.schedule(
        'index-sync-retry-16',
        '0 */2 16 * *',
        'SELECT public.trigger_index_sync()'
    );
END $$;

COMMIT;
