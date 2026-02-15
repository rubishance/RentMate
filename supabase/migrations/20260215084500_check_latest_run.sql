-- Check execution logs for today's 08:30 run
BEGIN;

DO $$
DECLARE
    r RECORD;
    v_now TIMESTAMP;
BEGIN
    SELECT timezone('UTC', now()) INTO v_now;
    RAISE NOTICE 'Current Time (UTC): %', v_now;

    RAISE NOTICE '--- CRON RUNS (Today) ---';
    FOR r IN 
        SELECT d.* 
        FROM cron.job_run_details d
        JOIN cron.job j ON j.jobid = d.jobid
        WHERE j.jobname = 'daily-admin-summary'
        AND d.start_time > (now() - interval '24 hours')
        ORDER BY d.start_time DESC 
    LOOP
        RAISE NOTICE 'RUN: ID=%, Status=%, Msg="%", Time=%', 
            r.runid, r.status, r.return_message, r.start_time;
    END LOOP;

    RAISE NOTICE '--- DEBUG LOGS (Today) ---';
    FOR r IN 
        SELECT created_at, message, details 
        FROM public.debug_logs 
        WHERE created_at > (now() - interval '24 hours')
        ORDER BY created_at DESC 
        LIMIT 10
    LOOP
        RAISE NOTICE '[%] % | %', r.created_at, r.message, r.details;
    END LOOP;
    
    RAISE NOTICE '--- END DIAGNOSTICS ---';
END $$;

COMMIT;
