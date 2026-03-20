-- Optimize Index Sync Cron Schedule
-- Run shortly after CBS target publication time (18:30 Israel Time)
-- Israel time is UTC+2 roughly or UTC+3 during DST. 
-- 18:30 IL translates to 16:30 UTC (winter) or 15:30 UTC (summer).
-- We'll schedule the trigger to aggressively poll starting at 15:35 UTC 
-- through 18:05 UTC. 

BEGIN;

DO $$
DECLARE
    job_names TEXT[] := ARRAY['index-update-day15', 'index-update-day16', 'index-update-day17', 'index-sync-primary', 'index-sync-retry-15', 'index-sync-retry-16'];
    jname TEXT;
BEGIN
    -- Unschedule all old sync jobs
    FOREACH jname IN ARRAY job_names LOOP
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = jname) THEN
            PERFORM cron.unschedule(jname);
        END IF;
    END LOOP;

    -- Schedule fast retries every 15 minutes between 15:30 UTC and 18:45 UTC on the 15th
    -- This covers 17:30 IL to 20:45 IL (Summer) and 18:30 IL to 21:45 IL (Winter)
    PERFORM cron.schedule(
        'index-sync-publish-window',
        '30,45,0,15 15,16,17,18 15 * *',
        'SELECT public.trigger_index_sync()'
    );

    -- Friday/Saturday/Holiday Early Publication (14:00 Israel Time)
    -- IL 14:00 translates to roughly 11:00 UTC (summer) or 12:00 UTC (winter)
    -- We will aggressively poll between 11:00 UTC and 14:00 UTC if the 15th is a Fri (5) or Sat (6)
    PERFORM cron.schedule(
        'index-sync-weekend-window',
        '0,15,30,45 11,12,13 15 * 5,6',
        'SELECT public.trigger_index_sync()'
    );

    -- Fallback safety sync on the 16th morning (06:00 UTC)
    PERFORM cron.schedule(
        'index-sync-fallback-16',
        '0 6 16 * *',
        'SELECT public.trigger_index_sync()'
    );

END $$;

COMMIT;
