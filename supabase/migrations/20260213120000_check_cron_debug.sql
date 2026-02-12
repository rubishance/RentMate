-- Force inspect run ID at migration time
DO $$
DECLARE
    r RECORD;
    v_count INT;
BEGIN
    RAISE NOTICE '--- CRON INSPECTION START ---';
    
    SELECT count(*) INTO v_count FROM cron.job;
    RAISE NOTICE 'Total Job Count: %', v_count;

    FOR r IN SELECT * FROM cron.job LOOP
        RAISE NOTICE 'JOB: ID=%, Name="%", Schedule="%", Command="%"', 
            r.jobid, r.jobname, r.schedule, r.command;
    END LOOP;

    RAISE NOTICE '--- RECENT FAILURES (Last 10) ---';
    FOR r IN SELECT * FROM cron.job_run_details WHERE status != 'succeeded' ORDER BY start_time DESC LIMIT 10 LOOP
        RAISE NOTICE 'FAIL: RunID=%, JobID=%, Status=%, Msg="%", Time=%', 
            r.runid, r.jobid, r.status, r.return_message, r.start_time;
    END LOOP;
    
    RAISE NOTICE '--- RECENT SUCCESS (Last 5) ---';
    FOR r IN SELECT * FROM cron.job_run_details WHERE status = 'succeeded' ORDER BY start_time DESC LIMIT 5 LOOP
        RAISE NOTICE 'SUCCESS: RunID=%, JobID=%, Time=%', 
             r.runid, r.jobid, r.start_time;
    END LOOP;

    RAISE NOTICE '--- CRON INSPECTION END ---';
    
    -- Raise exception to rollback but ensure notices are printed to CLI
    RAISE EXCEPTION 'This is a debug migration. Check the logs above.';
END $$;
