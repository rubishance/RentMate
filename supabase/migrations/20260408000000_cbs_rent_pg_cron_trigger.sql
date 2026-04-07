-- Update CBS Rent Sync Cron Schedule
-- Sets primary run to the 15th of the month at 16:30 UTC and onwards to capture CBS publish

BEGIN;

-- 1. Create a robust trigger function for the CBS edge function
CREATE OR REPLACE FUNCTION public.trigger_cbs_rent_sync()
RETURNS VOID AS $$
DECLARE
    v_ref TEXT;
    v_key TEXT;
    v_url TEXT;
BEGIN
    -- Fetch config (using existing config setup)
    v_ref := public.get_supabase_config('supabase_project_ref');
    v_key := public.get_supabase_config('supabase_service_role_key');
    
    -- Validate config
    IF v_ref IS NULL OR v_key IS NULL THEN
        RAISE WARNING 'CBS Rent Sync skipped: Missing config (ref=%, key_present=%)', v_ref, (v_key IS NOT NULL);
        RETURN;
    END IF;

    -- Construct URL to point to the new Edge Function
    v_url := 'https://' || v_ref || '.supabase.co/functions/v1/fetch-cbs-monthly-rent';
    
    -- Perform the request
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
    );
    RAISE LOG 'CBS Rent Sync Triggered at %', now();
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CBS Rent Sync Trigger Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Cron Jobs for CBS Rent
DO $$
BEGIN
    -- Schedule fast retries every 15 minutes between 15:30 UTC and 18:45 UTC on the 15th
    -- This covers 17:30 IL to 20:45 IL (Summer) and 18:30 IL to 21:45 IL (Winter)
    PERFORM cron.schedule(
        'cbs-rent-sync-publish-window',
        '30,45,0,15 15,16,17,18 15 * *',
        'SELECT public.trigger_cbs_rent_sync()'
    );

    -- Friday/Saturday/Holiday Early Publication (14:00 Israel Time)
    PERFORM cron.schedule(
        'cbs-rent-sync-weekend-window',
        '0,15,30,45 11,12,13 15 * 5,6',
        'SELECT public.trigger_cbs_rent_sync()'
    );

    -- Fallback safety sync on the 16th morning (06:00 UTC)
    PERFORM cron.schedule(
        'cbs-rent-sync-fallback-16',
        '0 6 16 * *',
        'SELECT public.trigger_cbs_rent_sync()'
    );

END $$;

COMMIT;
